import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { startOfDay, endOfDay, format, eachDayOfInterval, isSameDay } from "date-fns"

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const from = searchParams.get("from")
        const to = searchParams.get("to")

        if (!from || !to) {
            return NextResponse.json({ error: "Missing date range" }, { status: 400 })
        }

        const startDate = startOfDay(new Date(from))
        const endDate = endOfDay(new Date(to))

        // Calculate previous period
        const duration = endDate.getTime() - startDate.getTime()
        const prevStartDate = new Date(startDate.getTime() - duration)
        const prevEndDate = new Date(endDate.getTime() - duration)

        // --- 1. PARALLEL DATA FETCHING ---
        const [
            // A. Current Period Aggregations
            currentOrdersAgg,
            currentExpensesAgg,
            currentExpensesByCat,

            // B. Previous Period Aggregations
            prevOrdersAgg,
            prevExpensesAgg,
            prevExpensesByCat,

            // C. Timeline Data (Lightweight Fetch)
            timelineOrders,
            timelineExpenses
        ] = await Promise.all([
            // A. Current
            prisma.order.aggregate({
                where: { date: { gte: startDate, lte: endDate }, status: { not: "Cancelled" } },
                _sum: { revenue: true, netPayout: true, platformFee: true },
                _count: { id: true }
            }),
            prisma.expense.aggregate({
                where: { date: { gte: startDate, lte: endDate } },
                _sum: { amount: true }
            }),
            prisma.expense.groupBy({
                by: ['category'],
                where: { date: { gte: startDate, lte: endDate } },
                _sum: { amount: true }
            }),

            // B. Previous
            prisma.order.aggregate({
                where: { date: { gte: prevStartDate, lte: prevEndDate }, status: { not: "Cancelled" } },
                _sum: { revenue: true, netPayout: true, platformFee: true },
                _count: { id: true }
            }),
            prisma.expense.aggregate({
                where: { date: { gte: prevStartDate, lte: prevEndDate } },
                _sum: { amount: true }
            }),
            prisma.expense.groupBy({
                by: ['category'],
                where: { date: { gte: prevStartDate, lte: prevEndDate } },
                _sum: { amount: true }
            }),

            // C. Timeline (Select only needed fields)
            prisma.order.findMany({
                where: { date: { gte: startDate, lte: endDate }, status: { not: "Cancelled" } },
                select: { date: true, netPayout: true }
            }),
            prisma.expense.findMany({
                where: { date: { gte: startDate, lte: endDate } },
                select: { date: true, amount: true }
            })
        ])

        // --- 2. CALCULATIONS ---

        // Helper for change calculation
        const calculateChange = (current: number, previous: number) => {
            if (previous === 0) return current > 0 ? 100 : 0
            return Math.round(((current - previous) / previous) * 100)
        }

        // A. Summary Metrics
        const totalRevenue = currentOrdersAgg._sum.revenue || 0
        const totalPlatformFees = currentOrdersAgg._sum.platformFee || 0
        const totalExternalExpenses = currentExpensesAgg._sum.amount || 0
        const totalExpenses = totalPlatformFees + totalExternalExpenses
        const netProfit = totalRevenue - totalExpenses

        const totalInflow = currentOrdersAgg._sum.netPayout || 0
        const netCashFlow = totalInflow - totalExternalExpenses

        // Previous Metrics
        const prevRevenue = prevOrdersAgg._sum.revenue || 0
        const prevPlatformFees = prevOrdersAgg._sum.platformFee || 0
        const prevExternalExpenses = prevExpensesAgg._sum.amount || 0
        const prevTotalExpenses = prevPlatformFees + prevExternalExpenses
        const prevProfit = prevRevenue - prevTotalExpenses
        const prevInflow = prevOrdersAgg._sum.netPayout || 0
        const prevNetCashFlow = prevInflow - prevExternalExpenses

        // Changes
        const revenueChange = calculateChange(totalRevenue, prevRevenue)
        const expenseChange = calculateChange(totalExpenses, prevTotalExpenses)
        const profitChange = calculateChange(netProfit, prevProfit)
        const netCashChange = calculateChange(netCashFlow, prevNetCashFlow)

        // B. Timeline Construction
        const days = eachDayOfInterval({ start: startDate, end: endDate })
        const timeline = days.map(day => {
            // Filter in memory (fast because datasets are lightweight and filtered by date range already)
            const dayInflow = timelineOrders
                .filter(o => isSameDay(o.date, day))
                .reduce((sum, o) => sum + (o.netPayout || 0), 0)

            const dayOutflow = timelineExpenses
                .filter(e => isSameDay(e.date, day))
                .reduce((sum, e) => sum + (e.amount || 0), 0)

            return {
                date: format(day, "dd/MM"),
                inflow: dayInflow,
                outflow: dayOutflow,
                net: dayInflow - dayOutflow
            }
        })

        // C. Waterfall & P&L Breakdown
        const getCatSum = (groups: any[], cat: string) =>
            groups.find(g => g.category === cat)?._sum.amount || 0

        // Handle "Materials" which might be "COGS" or "Materials"
        const getMaterialsSum = (groups: any[]) => {
            return groups.reduce((sum, g) => {
                if (g.category === 'COGS' || g.category === 'Materials') return sum + (g._sum.amount || 0)
                return sum
            }, 0)
        }

        const currentCogs = getMaterialsSum(currentExpensesByCat)
        const currentAds = getCatSum(currentExpensesByCat, 'Ads')
        const currentOperating = getCatSum(currentExpensesByCat, 'Operating')
        const currentPlatformExp = getCatSum(currentExpensesByCat, 'Platform') // Expenses categorized as Platform (not fees)

        const prevCogs = getMaterialsSum(prevExpensesByCat)
        const prevAds = getCatSum(prevExpensesByCat, 'Ads')
        const prevOperating = getCatSum(prevExpensesByCat, 'Operating')
        const prevPlatformExp = getCatSum(prevExpensesByCat, 'Platform')

        const waterfall = [
            { name: "Doanh thu", value: totalRevenue, type: "positive" },
            { name: "Giá vốn", value: currentCogs, type: "negative" },
            { name: "Phí sàn", value: totalPlatformFees, type: "negative" },
            { name: "Ads", value: currentAds, type: "negative" },
            { name: "Vận hành", value: currentOperating, type: "negative" },
            { name: "Lợi nhuận", value: netProfit, type: "total" },
        ]

        // D. MoM Comparison Table
        const comparison = [
            { metric: "Doanh thu", current: totalRevenue, previous: prevRevenue, change: revenueChange },
            { metric: "Đơn hàng", current: currentOrdersAgg._count.id || 0, previous: prevOrdersAgg._count.id || 0, change: calculateChange(currentOrdersAgg._count.id || 0, prevOrdersAgg._count.id || 0) },
            { metric: "Thực nhận", current: totalInflow, previous: prevInflow, change: calculateChange(totalInflow, prevInflow) },
            { metric: "Chi phí", current: totalExpenses, previous: prevTotalExpenses, change: expenseChange },
            { metric: "Lợi nhuận", current: netProfit, previous: prevProfit, change: profitChange },
        ]

        // E. P&L Table
        const currentGrossProfit = totalRevenue - currentCogs
        const prevGrossProfit = prevRevenue - prevCogs

        const pnl = [
            {
                label: "Doanh thu thuần",
                current: totalRevenue,
                previous: prevRevenue,
                change: revenueChange,
                highlight: true
            },
            {
                label: "Giá vốn hàng bán (COGS)",
                current: currentCogs,
                previous: prevCogs,
                change: calculateChange(currentCogs, prevCogs)
            },
            {
                label: "Lợi nhuận gộp",
                current: currentGrossProfit,
                previous: prevGrossProfit,
                change: calculateChange(currentGrossProfit, prevGrossProfit),
                highlight: true,
                color: "text-blue-600"
            },
            {
                label: "Chi phí sàn & Phí GD",
                current: totalPlatformFees + currentPlatformExp,
                previous: prevPlatformFees + prevPlatformExp,
                change: calculateChange(totalPlatformFees + currentPlatformExp, prevPlatformFees + prevPlatformExp)
            },
            {
                label: "Marketing / Ads",
                current: currentAds,
                previous: prevAds,
                change: calculateChange(currentAds, prevAds)
            },
            {
                label: "Chi phí vận hành",
                current: currentOperating,
                previous: prevOperating,
                change: calculateChange(currentOperating, prevOperating)
            },
            {
                label: "Lợi nhuận ròng",
                current: netProfit,
                previous: prevProfit,
                change: profitChange,
                highlight: true,
                color: netProfit >= 0 ? "text-emerald-600" : "text-rose-600"
            }
        ]

        // F. Alerts
        const alerts = []
        const cir = totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0

        if (cir > 25) {
            alerts.push({
                type: 'warning',
                title: 'Chi phí Ads & Vận hành cao',
                description: `Tỷ lệ chi phí/doanh thu (CIR) đang là ${cir.toFixed(1)}%, vượt ngưỡng an toàn 25%.`,
                color: 'text-amber-700 bg-amber-50 border-amber-200'
            })
        }
        if (netProfit < 0) {
            alerts.push({
                type: 'danger',
                title: 'Lợi nhuận âm',
                description: 'Tháng này đang lỗ. Hãy kiểm tra lại chi phí quảng cáo và giá vốn.',
                color: 'text-rose-700 bg-rose-50 border-rose-200'
            })
        }
        if (netCashFlow < 0) {
            alerts.push({
                type: 'danger',
                title: 'Dòng tiền âm',
                description: 'Dòng tiền ra lớn hơn dòng tiền vào. Cẩn trọng rủi ro thanh khoản.',
                color: 'text-rose-700 bg-rose-50 border-rose-200'
            })
        }
        if (revenueChange > 20) {
            alerts.push({
                type: 'success',
                title: 'Tăng trưởng tốt',
                description: `Doanh thu tăng ${revenueChange.toFixed(1)}% so với kỳ trước.`,
                color: 'text-emerald-700 bg-emerald-50 border-emerald-200'
            })
        }

        return NextResponse.json({
            summary: {
                revenue: { value: totalRevenue, change: revenueChange },
                expenses: { value: totalExpenses, change: expenseChange },
                profit: { value: netProfit, change: profitChange },
                netCash: { value: netCashFlow, change: netCashChange }
            },
            timeline,
            waterfall,
            comparison,
            pnl,
            alerts
        }, {
            headers: {
                'Cache-Control': 's-maxage=60, stale-while-revalidate=300'
            }
        })

    } catch (error) {
        console.error("Error fetching finance data:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
