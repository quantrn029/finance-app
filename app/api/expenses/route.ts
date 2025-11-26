import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { startOfDay, endOfDay, format } from "date-fns"

export const dynamic = 'force-dynamic'



export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const startDateStr = searchParams.get('startDate')
        const endDateStr = searchParams.get('endDate')

        if (!startDateStr || !endDateStr) {
            return NextResponse.json({ error: "Missing date range" }, { status: 400 })
        }

        const startDate = startOfDay(new Date(startDateStr))
        const endDate = endOfDay(new Date(endDateStr))

        // 1. Fetch Manual Expenses
        const manualExpenses = await prisma.expense.findMany({
            where: {
                date: { gte: startDate, lte: endDate }
            },
            orderBy: { date: 'desc' }
        })

        // 2. Fetch Orders for Platform Fees (Optimized Select)
        // We use the 'platformFee' column directly to ensure consistency with Dashboard and Finance pages.
        const orders = await prisma.order.findMany({
            where: {
                date: { gte: startDate, lte: endDate },
                status: { not: 'Cancelled' }
            },
            select: {
                date: true,
                platform: true,
                platformFee: true
            }
        })

        // 3. Aggregate Platform Fees (Server-side)
        const platformFeesMap = new Map<string, number>()

        orders.forEach(order => {
            const monthKey = format(order.date, 'yyyy-MM')
            const platform = order.platform
            const groupKey = `${monthKey}|${platform}`

            const currentTotal = platformFeesMap.get(groupKey) || 0
            platformFeesMap.set(groupKey, currentTotal + (order.platformFee || 0))
        })

        const systemExpenses = Array.from(platformFeesMap.entries()).map(([key, total]) => {
            const [month, platform] = key.split('|')
            return {
                id: `sys-${key}`,
                date: new Date(`${month}-01`),
                type: "Platform",
                category: "Platform",
                subcategory: platform,
                amount: total,
                note: `Tự động tổng hợp từ đơn hàng ${month}`,
                isSystem: true,
                costType: "Variable",
                isRecurring: true
            }
        })

        // 4. Combine
        const allExpenses = [...manualExpenses, ...systemExpenses].sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        )

        return NextResponse.json({ expenses: allExpenses }, {
            headers: {
                'Cache-Control': 's-maxage=60, stale-while-revalidate=300'
            }
        })

    } catch (error: any) {
        console.error("Error fetching expenses:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// POST, PUT, DELETE remain mostly unchanged but should invalidate cache if we were using tags (SWR handles this on client)
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { date, category, subcategory, amount, note, type, isRecurring, costType } = body

        if (!date || !category || amount === undefined) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        const expense = await prisma.expense.create({
            data: {
                date: new Date(date),
                category,
                subcategory: subcategory || null,
                amount: parseFloat(amount),
                note: note || "",
                type: type || category,
                isRecurring: isRecurring || false,
                costType: costType || "Variable",
            }
        })

        return NextResponse.json({ expense }, { status: 201 })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function PUT(req: NextRequest) {
    try {
        const body = await req.json()
        const { id, date, category, subcategory, amount, note, type, isRecurring, costType } = body

        if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 })

        const expense = await prisma.expense.update({
            where: { id },
            data: {
                date: new Date(date),
                category,
                subcategory: subcategory || null,
                amount: parseFloat(amount),
                note: note || "",
                type: type || category,
                isRecurring: isRecurring || false,
                costType: costType || "Variable",
            }
        })

        return NextResponse.json({ expense })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 })

        await prisma.expense.delete({ where: { id } })
        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
