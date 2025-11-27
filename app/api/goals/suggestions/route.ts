import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { startOfMonth, endOfMonth, subMonths, subQuarters, subYears } from "date-fns"

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const period = searchParams.get('period')
        const type = searchParams.get('type') || 'monthly'

        if (!period) {
            return NextResponse.json({ error: "Missing period" }, { status: 400 })
        }

        // 1. Determine Previous Period Date Range
        let startDate: Date, endDate: Date
        let previousPeriodLabel = ""

        if (type === 'monthly') {
            const [y, m] = period.split('-').map(Number)
            const currentMonth = new Date(y, m - 1, 1)
            const prevMonth = subMonths(currentMonth, 1)

            startDate = startOfMonth(prevMonth)
            endDate = endOfMonth(prevMonth)
            previousPeriodLabel = `Tháng ${prevMonth.getMonth() + 1}/${prevMonth.getFullYear()}`

        } else if (type === 'quarterly') {
            const [y, q] = period.split('-Q')
            const quarter = parseInt(q)
            const currentQuarterStart = new Date(parseInt(y), (quarter - 1) * 3, 1)
            const prevQuarterStart = subQuarters(currentQuarterStart, 1)

            startDate = prevQuarterStart
            endDate = new Date(prevQuarterStart.getFullYear(), prevQuarterStart.getMonth() + 3, 0)
            previousPeriodLabel = `Quý ${Math.floor(prevQuarterStart.getMonth() / 3) + 1}/${prevQuarterStart.getFullYear()}`

        } else {
            // Yearly
            const year = parseInt(period)
            const prevYearStart = subYears(new Date(year, 0, 1), 1)

            startDate = prevYearStart
            endDate = new Date(prevYearStart.getFullYear(), 11, 31)
            previousPeriodLabel = `Năm ${prevYearStart.getFullYear()}`
        }

        // 2. Aggregate Actuals for Previous Period
        const ordersAgg = await prisma.order.aggregate({
            where: {
                date: { gte: startDate, lte: endDate },
                status: { not: 'Cancelled' }
            },
            _sum: { revenue: true, netPayout: true },
            _count: { id: true }
        })

        const expensesAgg = await prisma.expense.aggregate({
            where: {
                date: { gte: startDate, lte: endDate }
            },
            _sum: { amount: true }
        })

        const actualRevenue = ordersAgg._sum.revenue || 0
        const actualNetPayout = ordersAgg._sum.netPayout || 0
        const totalExpenses = expensesAgg._sum.amount || 0
        const actualProfit = actualNetPayout - totalExpenses
        const actualOrders = ordersAgg._count.id || 0

        return NextResponse.json({
            period: previousPeriodLabel,
            suggestions: {
                revenue: actualRevenue,
                profit: actualProfit,
                orders: actualOrders
            }
        })

    } catch (error: any) {
        console.error("Error fetching goal suggestions:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
