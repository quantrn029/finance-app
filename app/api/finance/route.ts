import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { startOfDay, endOfDay, subMonths, format, eachDayOfInterval, isSameDay, startOfMonth, endOfMonth, subDays } from "date-fns"

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

        // 1. Fetch Orders
        const orders = await prisma.order.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate,
                },
                status: { not: "Cancelled" } // Exclude cancelled orders
            },
        })

        // 2. Fetch Expenses
        const expenses = await prisma.expense.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        })

        // --- CALCULATION LOGIC ---

        // A. Summary Metrics
        const totalRevenue = orders.reduce((sum, order) => sum + order.revenue, 0)

        // Platform Fees (from Orders)
        const totalPlatformFees = orders.reduce((sum, order) => sum + order.platformFee, 0)

        // External Expenses (from Expense table)
        const totalExternalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0)

        const totalExpenses = totalPlatformFees + totalExternalExpenses
        const netProfit = totalRevenue - totalExpenses

        // Cash Flow (Approximate)
        // Inflow = Net Payout from Orders
        const totalInflow = orders.reduce((sum, order) => sum + order.netPayout, 0)
        // Outflow = External Expenses
        const totalOutflow = totalExternalExpenses
        const netCashFlow = totalInflow - totalOutflow

        // B. Timeline (Daily)
        const days = eachDayOfInterval({ start: startDate, end: endDate })
        const timeline = days.map(day => {
            const dayOrders = orders.filter(o => isSameDay(o.date, day))
            const dayExpenses = expenses.filter(e => isSameDay(e.date, day))

            const dailyInflow = dayOrders.reduce((sum, o) => sum + o.netPayout, 0)
            const dailyOutflow = dayExpenses.reduce((sum, e) => sum + e.amount, 0)
            const dailyNet = dailyInflow - dailyOutflow

            return {
                date: format(day, "dd/MM"),
                inflow: dailyInflow,
                outflow: dailyOutflow,
                net: dailyNet
            }
        })

        // C. Waterfall (Breakdown)
        // Group Expenses by Category
        const cogs = expenses.filter(e => e.category === "COGS" || e.category === "Materials").reduce((sum, e) => sum + e.amount, 0)
        const ads = expenses.filter(e => e.category === "Ads").reduce((sum, e) => sum + e.amount, 0)
        const operating = expenses.filter(e => e.category === "Operating").reduce((sum, e) => sum + e.amount, 0)

        // Detailed Platform Fees
        // We can break this down further if needed, but for now "Platform Fees" is a big chunk

        const waterfall = [
            { name: "Doanh thu", value: totalRevenue, type: "positive" },
            { name: "Giá vốn", value: cogs, type: "negative" },
            { name: "Phí sàn", value: totalPlatformFees, type: "negative" },
            { name: "Ads", value: ads, type: "negative" },
            { name: "Vận hành", value: operating, type: "negative" },
            { name: "Lợi nhuận", value: netProfit, type: "total" },
        ]

        // D. MoM Comparison (Previous Period)
        // Calculate previous period (same duration, shifted back)
        const duration = endDate.getTime() - startDate.getTime()
        const prevStartDate = new Date(startDate.getTime() - duration)
        const prevEndDate = new Date(endDate.getTime() - duration)

        const prevOrders = await prisma.order.findMany({
            where: { date: { gte: prevStartDate, lte: prevEndDate }, status: { not: "Cancelled" } }
        })
        const prevExpenses = await prisma.expense.findMany({
            where: { date: { gte: prevStartDate, lte: prevEndDate } }
        })

        const prevRevenue = prevOrders.reduce((sum, o) => sum + o.revenue, 0)
        const prevOrdersCount = prevOrders.length
        const prevNetPayout = prevOrders.reduce((sum, o) => sum + o.netPayout, 0)
        const prevPlatformFees = prevOrders.reduce((sum, o) => sum + o.platformFee, 0)
        const prevExternalExpenses = prevExpenses.reduce((sum, e) => sum + e.amount, 0)
        const prevTotalExpenses = prevPlatformFees + prevExternalExpenses
        const prevProfit = prevRevenue - prevTotalExpenses

        const calculateChange = (current: number, previous: number) => {
            if (previous === 0) return current > 0 ? 100 : 0
            return Math.round(((current - previous) / previous) * 100)
        }

        const comparison = [
            { metric: "Doanh thu", current: totalRevenue, previous: prevRevenue, change: calculateChange(totalRevenue, prevRevenue) },
            { metric: "Đơn hàng", current: orders.length, previous: prevOrdersCount, change: calculateChange(orders.length, prevOrdersCount) },
            { metric: "Thực nhận", current: totalInflow, previous: prevNetPayout, change: calculateChange(totalInflow, prevNetPayout) },
            { metric: "Chi phí", current: totalExpenses, previous: prevTotalExpenses, change: calculateChange(totalExpenses, prevTotalExpenses) },
            { metric: "Lợi nhuận", current: netProfit, previous: prevProfit, change: calculateChange(netProfit, prevProfit) },
        ]

        // E. Insights & Alerts
        const alerts = []

        const revenueChange = calculateChange(totalRevenue, prevRevenue)
        const expenseChange = calculateChange(totalExpenses, prevTotalExpenses)
        const profitChange = calculateChange(netProfit, prevProfit)
        const prevNetCashFlow = prevNetPayout - prevExternalExpenses
        const netCashChange = calculateChange(netCashFlow, prevNetCashFlow)

        // CIR Alert
        const cir = totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0
        if (cir > 25) {
            alerts.push({
                type: 'warning',
                title: 'Chi phí Ads & Vận hành cao',
                description: `Tỷ lệ chi phí/doanh thu (CIR) đang là ${cir.toFixed(1)}%, vượt ngưỡng an toàn 25%.`,
                color: 'text-amber-700 bg-amber-50 border-amber-200'
            })
        }

        // Negative Profit Alert
        if (netProfit < 0) {
            alerts.push({
                type: 'danger',
                title: 'Lợi nhuận âm',
                description: 'Tháng này đang lỗ. Hãy kiểm tra lại chi phí quảng cáo và giá vốn.',
                color: 'text-rose-700 bg-rose-50 border-rose-200'
            })
        }

        // Negative Cashflow Alert
        if (netCashFlow < 0) {
            alerts.push({
                type: 'danger',
                title: 'Dòng tiền âm',
                description: 'Dòng tiền ra lớn hơn dòng tiền vào. Cẩn trọng rủi ro thanh khoản.',
                color: 'text-rose-700 bg-rose-50 border-rose-200'
            })
        }

        // Growth Alert (Success)
        if (revenueChange > 20) {
            alerts.push({
                type: 'success',
                title: 'Tăng trưởng tốt',
                description: `Doanh thu tăng ${revenueChange.toFixed(1)}% so với kỳ trước.`,
                color: 'text-emerald-700 bg-emerald-50 border-emerald-200'
            })
        }

        // --- P&L CALCULATION ---

        // Helper to sum expenses by category
        const sumExpenses = (exps: any[], category: string) =>
            exps.filter(e => e.category === category || (category === 'COGS' && e.category === 'Materials')).reduce((sum, e) => sum + e.amount, 0)

        // Current Period Breakdown
        const currentCogs = sumExpenses(expenses, 'COGS')
        const currentAds = sumExpenses(expenses, 'Ads')
        const currentOperating = sumExpenses(expenses, 'Operating')
        const currentPlatformExpenses = sumExpenses(expenses, 'Platform')
        const currentGrossProfit = totalRevenue - currentCogs

        // Previous Period Breakdown
        const prevCogs = sumExpenses(prevExpenses, 'COGS')
        const prevAds = sumExpenses(prevExpenses, 'Ads')
        const prevOperating = sumExpenses(prevExpenses, 'Operating')
        const prevPlatformExpenses = sumExpenses(prevExpenses, 'Platform')
        const prevGrossProfit = prevRevenue - prevCogs

        // Construct P&L Data
        const pnl = [
            {
                label: "Doanh thu thuần",
                current: totalRevenue,
                previous: prevRevenue,
                change: calculateChange(totalRevenue, prevRevenue),
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
                current: totalPlatformFees + currentPlatformExpenses,
                previous: prevPlatformFees + prevPlatformExpenses,
                change: calculateChange(totalPlatformFees + currentPlatformExpenses, prevPlatformFees + prevPlatformExpenses)
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
                change: calculateChange(netProfit, prevProfit),
                highlight: true,
                color: netProfit >= 0 ? "text-emerald-600" : "text-rose-600"
            }
        ]

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
            pnl, // New field
            alerts
        })

    } catch (error) {
        console.error("Error fetching finance data:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
