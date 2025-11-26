import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { calculateCashFlow } from "@/lib/analytics"
import { parseISO } from "date-fns"

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const fromParam = searchParams.get("from")
        const toParam = searchParams.get("to")

        if (!fromParam || !toParam) {
            return NextResponse.json({ error: "Missing date range parameters" }, { status: 400 })
        }

        const fromDate = parseISO(fromParam)
        const toDate = parseISO(toParam)

        // Get orders in date range
        const orders = await prisma.order.findMany({
            where: {
                date: {
                    gte: fromDate,
                    lte: toDate
                }
            },
            orderBy: { date: 'asc' }
        })

        // Get expenses in date range
        const expenses = await prisma.expense.findMany({
            where: {
                date: {
                    gte: fromDate,
                    lte: toDate
                }
            },
            orderBy: { date: 'asc' }
        })

        // Calculate cash flow
        const cashFlow = calculateCashFlow(orders, expenses, fromDate, toDate)

        return NextResponse.json({
            cashFlow,
            summary: {
                totalInflow: cashFlow.reduce((sum, d) => sum + d.inflow, 0),
                totalOutflow: cashFlow.reduce((sum, d) => sum + d.outflow, 0),
                netFlow: cashFlow.reduce((sum, d) => sum + d.netFlow, 0)
            }
        })
    } catch (error: any) {
        console.error("Cash flow API error:", error)
        return NextResponse.json({
            error: error.message || "Failed to fetch cash flow data"
        }, { status: 500 })
    }
}
