import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay, getDaysInMonth } from "date-fns"

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const period = searchParams.get('period')
        const type = searchParams.get('type') || 'monthly'

        if (!period) {
            return NextResponse.json({ error: "Missing period" }, { status: 400 })
        }

        // 1. Get Goal
        const goal = await prisma.goal.findFirst({
            where: { period, type },
            include: { details: true }
        })

        if (!goal) {
            return NextResponse.json({ found: false })
        }

        // 2. Determine Date Range
        let startDate: Date, endDate: Date
        if (type === 'monthly') {
            const [y, m] = period.split('-').map(Number)
            startDate = new Date(y, m - 1, 1)
            endDate = endOfMonth(startDate)
        } else if (type === 'quarterly') {
            const [y, q] = period.split('-Q')
            const quarter = parseInt(q)
            startDate = new Date(parseInt(y), (quarter - 1) * 3, 1)
            endDate = new Date(parseInt(y), quarter * 3, 0)
        } else {
            startDate = new Date(parseInt(period), 0, 1)
            endDate = new Date(parseInt(period), 11, 31)
        }

        // 3. Aggregate Actuals (Orders)
        const ordersAgg = await prisma.order.aggregate({
            where: {
                date: { gte: startDate, lte: endDate },
                status: { not: 'Cancelled' }
            },
            _sum: { revenue: true, netPayout: true },
            _count: { id: true }
        })

        // 4. Aggregate Expenses (for Profit calc)
        // Profit = NetPayout - Expenses
        const expensesAgg = await prisma.expense.aggregate({
            where: {
                date: { gte: startDate, lte: endDate }
            },
            _sum: { amount: true }
        })

        const actualRevenue = ordersAgg._sum.revenue || 0
        const actualOrders = ordersAgg._count.id || 0
        const totalExpenses = expensesAgg._sum.amount || 0
        const actualNetPayout = ordersAgg._sum.netPayout || 0
        const actualProfit = actualNetPayout - totalExpenses

        // 5. Channel Breakdown
        const platforms = ['Shopee', 'TikTok', 'Facebook', 'Instagram']
        const channelPerformance = await Promise.all(platforms.map(async (platform) => {
            const detail = goal.details.find(d => d.platform === platform)

            const pOrders = await prisma.order.aggregate({
                where: {
                    date: { gte: startDate, lte: endDate },
                    platform,
                    status: { not: 'Cancelled' }
                },
                _sum: { revenue: true, netPayout: true },
                _count: { id: true }
            })

            // We can't easily attribute general expenses to platforms without complex logic.
            // For simplicity, we'll approximate profit or just use NetPayout for platform profit if no better metric.
            // Or we can assume platform-specific expenses are already deducted in NetPayout (fees), 
            // and only general expenses remain. 
            // Let's stick to: Platform Profit = NetPayout (since we don't have platform-tagged manual expenses easily)
            // Or we could fetch expenses with category=Ads/Platform and subcategory=Platform?
            // For now, simplified:
            const pRevenue = pOrders._sum.revenue || 0
            const pProfit = pOrders._sum.netPayout || 0 // Approximation
            const pCount = pOrders._count.id || 0

            return {
                platform,
                target: {
                    revenue: detail?.revenueTarget || 0,
                    profit: detail?.profitTarget || 0,
                    orders: detail?.ordersTarget || 0
                },
                actual: {
                    revenue: pRevenue,
                    profit: pProfit,
                    orders: pCount
                },
                progress: detail?.revenueTarget ? (pRevenue / detail.revenueTarget) * 100 : 0
            }
        }))

        // 6. Cumulative Data (Daily) - Only for Monthly view to keep it light
        let cumulativeData = []
        if (type === 'monthly') {
            const daysInMonthVal = getDaysInMonth(startDate)
            const dailyRevenueTarget = goal.revenueTarget / daysInMonthVal

            // Fetch daily sums
            const dailyOrders = await prisma.order.groupBy({
                by: ['date'],
                where: {
                    date: { gte: startDate, lte: endDate },
                    status: { not: 'Cancelled' }
                },
                _sum: { revenue: true }
            })

            let runningActual = 0
            let runningPlan = 0
            const now = new Date()

            for (let i = 1; i <= daysInMonthVal; i++) {
                const dayDate = new Date(startDate.getFullYear(), startDate.getMonth(), i)
                if (dayDate > now) break

                const dayStr = format(dayDate, 'yyyy-MM-dd') // Prisma returns Date objects usually
                // Find match
                const match = dailyOrders.find(o => format(o.date, 'yyyy-MM-dd') === dayStr)
                const dayRevenue = match?._sum.revenue || 0

                runningActual += dayRevenue
                runningPlan += dailyRevenueTarget

                cumulativeData.push({
                    day: i,
                    plan: runningPlan,
                    actual: runningActual
                })
            }
        }

        // 7. Weekly Breakdown (Monthly Only)
        let weeklyData: { label: string; target: { revenue: number; profit: number; orders: number }; actual: { revenue: number; profit: number; orders: number } }[] = []
        if (type === 'monthly') {
            const daysInMonthVal = getDaysInMonth(startDate)
            const dailyRevenueTarget = goal.revenueTarget / daysInMonthVal
            const dailyProfitTarget = goal.profitTarget / daysInMonthVal
            const dailyOrdersTarget = goal.ordersTarget / daysInMonthVal

            const weeks = [
                { label: 'Tuần 1 (1-7)', start: 1, end: 7 },
                { label: 'Tuần 2 (8-14)', start: 8, end: 14 },
                { label: 'Tuần 3 (15-21)', start: 15, end: 21 },
                { label: 'Tuần 4 (22-Cuối tháng)', start: 22, end: daysInMonthVal },
            ]

            weeklyData = await Promise.all(weeks.map(async (week) => {
                const wStart = new Date(startDate.getFullYear(), startDate.getMonth(), week.start)
                const wEnd = new Date(startDate.getFullYear(), startDate.getMonth(), week.end, 23, 59, 59)
                const daysInWeek = week.end - week.start + 1

                const wOrders = await prisma.order.aggregate({
                    where: {
                        date: { gte: wStart, lte: wEnd },
                        status: { not: 'Cancelled' }
                    },
                    _sum: { revenue: true, netPayout: true },
                    _count: { id: true }
                })

                const wExpenses = await prisma.expense.aggregate({
                    where: { date: { gte: wStart, lte: wEnd } },
                    _sum: { amount: true }
                })

                const actualRevenue = wOrders._sum.revenue || 0
                const actualNetPayout = wOrders._sum.netPayout || 0
                const totalExpenses = wExpenses._sum.amount || 0
                const actualProfit = actualNetPayout - totalExpenses
                const actualOrdersCount = wOrders._count.id || 0

                return {
                    label: week.label,
                    target: {
                        revenue: dailyRevenueTarget * daysInWeek,
                        profit: dailyProfitTarget * daysInWeek,
                        orders: dailyOrdersTarget * daysInWeek
                    },
                    actual: {
                        revenue: actualRevenue,
                        profit: actualProfit,
                        orders: actualOrdersCount
                    }
                }
            }))
        }

        return NextResponse.json({
            found: true,
            goal,
            actual: {
                revenue: actualRevenue,
                profit: actualProfit,
                orders: actualOrders
            },
            channelPerformance,
            cumulativeData,
            weeklyData
        }, {
            headers: {
                'Cache-Control': 's-maxage=60, stale-while-revalidate=300'
            }
        })

    } catch (error: any) {
        console.error("Error fetching goal progress:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
