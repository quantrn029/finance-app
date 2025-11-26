import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export const dynamic = 'force-dynamic'

// GET: Fetch all expenses
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')

        const where: any = {}
        if (startDate && endDate) {
            where.date = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            }
        }

        const expenses = await prisma.expense.findMany({
            where,
            orderBy: { date: 'desc' }
        })
        return NextResponse.json({ expenses })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// POST: Add new expense
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { date, category, subcategory, amount, note, type, isRecurring, costType } = body

        if (!date || !category || amount === undefined) {
            return NextResponse.json(
                { error: "Missing required fields: date, category, amount" },
                { status: 400 }
            )
        }

        const expense = await prisma.expense.create({
            data: {
                date: new Date(date),
                category,
                subcategory: subcategory || null,
                amount: parseFloat(amount),
                note: note || "",
                type: type || category, // Backward compatibility
                isRecurring: isRecurring || false,
                costType: costType || "Variable",
            }
        })

        return NextResponse.json({ expense }, { status: 201 })
    } catch (error: any) {
        console.error("Create expense error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// PUT: Update expense
export async function PUT(req: NextRequest) {
    try {
        const body = await req.json()
        const { id, date, category, subcategory, amount, note, type, isRecurring, costType } = body

        if (!id || !date || !category || amount === undefined) {
            return NextResponse.json(
                { error: "Missing required fields: id, date, category, amount" },
                { status: 400 }
            )
        }

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
        console.error("Update expense error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// DELETE: Remove expense
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: "Missing expense ID" }, { status: 400 })
        }

        await prisma.expense.delete({ where: { id } })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
