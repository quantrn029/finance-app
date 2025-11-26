import { Order, Expense } from "@prisma/client"
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay, getDaysInMonth, getDate } from "date-fns"

// ... existing code ...

export interface ForecastingData {
    currentRevenue: number
    projectedRevenue: number
    currentProfit: number
    projectedProfit: number
    daysPassed: number
    totalDays: number
    dailyAverageRevenue: number
    dailyAverageProfit: number
    progress: number // 0-100
}

export interface CashFlowData {
    date: string
    inflow: number
    outflow: number
    netFlow: number
}

export function calculateForecasting(orders: Order[], expenses: Expense[], date: Date = new Date()): ForecastingData {
    const totalDays = getDaysInMonth(date)
    const daysPassed = Math.min(getDate(date), totalDays)

    // Calculate current totals
    const currentRevenue = orders.reduce((sum, o) => sum + o.revenue, 0)

    // Calculate current profit (Net Payout - Expenses)
    // Note: This is a simplified profit calculation for forecasting
    const totalNetPayout = orders.reduce((sum, o) => sum + o.netPayout, 0)
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
    const currentProfit = totalNetPayout - totalExpenses

    // Calculate averages
    // Avoid division by zero if it's day 0 (shouldn't happen with getDate but safe to check)
    const effectiveDays = Math.max(daysPassed, 1)
    const dailyAverageRevenue = currentRevenue / effectiveDays
    const dailyAverageProfit = currentProfit / effectiveDays

    // Project totals
    const projectedRevenue = dailyAverageRevenue * totalDays
    const projectedProfit = dailyAverageProfit * totalDays

    return {
        currentRevenue,
        projectedRevenue,
        currentProfit,
        projectedProfit,
        daysPassed,
        totalDays,
        dailyAverageRevenue,
        dailyAverageProfit,
        progress: (daysPassed / totalDays) * 100
    }
}

export function calculateCashFlow(orders: Order[], expenses: Expense[], startDate: Date, endDate: Date): CashFlowData[] {
    const days = eachDayOfInterval({ start: startDate, end: endDate })

    return days.map(day => {
        // Inflow: Revenue (or Net Payout if preferred, using Revenue for now as "Sales")
        // User might prefer Net Payout as actual cash in, but Revenue is standard for "Sales"
        // Let's use Revenue for "Sales Inflow" visualization
        const dayOrders = orders.filter(o => isSameDay(o.date, day))
        const inflow = dayOrders.reduce((sum, o) => sum + o.revenue, 0)

        // Outflow: Expenses + Platform Fees + Shipping Fees (implicitly deducted from Revenue to get Net)
        // Actually, Cash Flow usually means:
        // In = Net Payout received
        // Out = Expenses paid
        // BUT for an e-commerce PnL view:
        // In = Revenue
        // Out = COGS + Ads + Ops + Platform Fees

        // Let's stick to the PnL definition for consistency with the dashboard
        const dayExpenses = expenses.filter(e => isSameDay(e.date, day))
        const expenseOutflow = dayExpenses.reduce((sum, e) => sum + e.amount, 0)

        // Platform fees are "outflow" in a PnL sense, even if deducted at source
        const platformFeeOutflow = dayOrders.reduce((sum, o) => sum + o.platformFee + o.shippingFee, 0)

        const outflow = expenseOutflow + platformFeeOutflow

        return {
            date: format(day, "dd/MM"),
            inflow,
            outflow,
            netFlow: inflow - outflow
        }
    })
}

// NEW: Calculate channel-specific metrics
export function calculateChannelMetrics(orders: Order[], expenses: Expense[]) {
    const platforms = ['Shopee', 'TikTok', 'Facebook', 'Instagram']

    return platforms.map(platform => {
        const platformOrders = orders.filter(o => o.platform === platform)
        const revenue = platformOrders.reduce((sum, o) => sum + o.revenue, 0)
        const fees = platformOrders.reduce((sum, o) => sum + o.platformFee, 0)
        const orderCount = platformOrders.length

        // Get Ads expenses for this platform (use type or category field)
        const adsExpenses = expenses.filter(e =>
            (e.type === 'Ads' || e.category === 'Ads') &&
            e.note?.toLowerCase().includes(platform.toLowerCase())
        )
        const ads = adsExpenses.reduce((sum, e) => sum + e.amount, 0)

        // Profit = Revenue - Fees - Ads (simplified, no materials per channel)
        const profit = revenue - fees - ads

        return {
            platform,
            revenue,
            ads,
            fees,
            profit,
            orders: orderCount
        }
    }).filter(c => c.orders > 0) // Only show platforms with orders
}

// NEW: Calculate alerts data
export function calculateAlertMetrics(orders: Order[], expenses: Expense[], lastWeekOrders: Order[]) {
    const totalRevenue = orders.reduce((sum, o) => sum + o.revenue, 0)
    const totalFees = orders.reduce((sum, o) => sum + o.platformFee, 0)
    const totalAds = expenses.filter(e => e.type === 'Ads' || e.category === 'Ads').reduce((sum, e) => sum + e.amount, 0)
    const materials = expenses.filter(e => e.type === 'Materials' || e.category === 'Materials').reduce((sum, e) => sum + e.amount, 0)

    const cir = totalRevenue > 0 ? ((totalFees + totalAds) / totalRevenue) * 100 : 0
    const materialsRatio = totalRevenue > 0 ? (materials / totalRevenue) * 100 : 0
    const orderDropPercent = lastWeekOrders.length > 0
        ? ((lastWeekOrders.length - orders.length) / lastWeekOrders.length) * 100
        : 0

    return { cir, materialsRatio, orderDropPercent }
}
