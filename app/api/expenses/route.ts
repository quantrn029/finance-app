import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { startOfDay, endOfDay, format } from "date-fns"

export const dynamic = 'force-dynamic'

// Helper to calculate fees from order
const calculateOrderFees = (order: any) => {
    let fees = 0
    if (order.platform === 'Shopee') {
        fees += (order.serviceFee || 0) + (order.paymentFee || 0) + (order.fixedFee || 0) +
            (order.affiliateFee || 0) + (order.shippingFee || 0) + (order.promotion || 0) +
            (order.taxVAT || 0) + (order.taxPIT || 0) + (order.sellerVoucher || 0) +
            (order.returnShippingFee || 0) + (order.otherFees || 0)
    } else if (order.platform === 'TikTok') {
        fees += (order.commissionFee || 0) + (order.transactionFee || 0) + (order.orderProcessingFee || 0) +
            (order.affiliateCommission || 0) + (order.adCommission || 0) + (order.partnerCommission || 0) +
            (order.affiliatePartnerShopAdsCommission || 0) + (order.flashSaleFee || 0) +
            (order.otherServiceFees || 0) + (order.shippingFee || 0) + (order.promotion || 0) +
            (order.taxVAT || 0) + (order.taxPIT || 0) + (order.otherFees || 0)
    } else {
        fees += (order.platformFee || 0)
    }
    return fees
}

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
        // We only need fee columns, date, and platform.
        const orders = await prisma.order.findMany({
            where: {
                date: { gte: startDate, lte: endDate },
                status: { not: 'Cancelled' }
            },
            select: {
                date: true,
                platform: true,
                // Shopee
                serviceFee: true, paymentFee: true, fixedFee: true, affiliateFee: true,
                shippingFee: true, promotion: true, taxVAT: true, taxPIT: true,
                sellerVoucher: true, returnShippingFee: true, otherFees: true,
                // TikTok
                commissionFee: true, transactionFee: true, orderProcessingFee: true,
                affiliateCommission: true, adCommission: true, partnerCommission: true,
                affiliatePartnerShopAdsCommission: true, flashSaleFee: true, otherServiceFees: true,
                // General
                platformFee: true
            }
        })

        // 3. Aggregate Platform Fees (Server-side)
        const platformFeesMap = new Map<string, { total: number, details: any }>()

        orders.forEach(order => {
            const monthKey = format(order.date, 'yyyy-MM')
            const platform = order.platform
            const groupKey = `${monthKey}|${platform}`

            if (!platformFeesMap.has(groupKey)) {
                platformFeesMap.set(groupKey, { total: 0, details: {} }) // Details could be expanded if needed
            }
            const group = platformFeesMap.get(groupKey)!
            group.total += calculateOrderFees(order)
        })

        const systemExpenses = Array.from(platformFeesMap.entries()).map(([key, data]) => {
            const [month, platform] = key.split('|')
            return {
                id: `sys-${key}`,
                date: new Date(`${month}-01`),
                type: "Platform",
                category: "Platform",
                subcategory: platform,
                amount: data.total,
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
