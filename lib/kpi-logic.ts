import { startOfMonth, endOfMonth, format, subMonths, subYears, isSameMonth, getMonth, getYear } from "date-fns"

export interface MonthlyMetric {
    date: Date
    revenue: number
    profit: number
    orders: number
    aov: number
    margin: number
}

export interface SeasonalityInsight {
    month: number // 0-11
    avgRevenue: number
    multiplier: number // vs yearly average
    isHighSeason: boolean
}

export interface KPISuggestion {
    type: 'conservative' | 'moderate' | 'aggressive'
    label: string
    revenueTarget: number
    profitTarget: number
    ordersTarget: number
    growthRate: number
    reasoning: string[]
}

// Helper to group orders by month
export function aggregateMonthlyData(orders: any[]): MonthlyMetric[] {
    const grouped = new Map<string, MonthlyMetric>()

    orders.forEach(order => {
        const date = new Date(order.date)
        const key = format(date, 'yyyy-MM')

        if (!grouped.has(key)) {
            grouped.set(key, {
                date: startOfMonth(date),
                revenue: 0,
                profit: 0,
                orders: 0,
                aov: 0,
                margin: 0
            })
        }

        const metric = grouped.get(key)!
        metric.revenue += order.revenue || 0
        metric.profit += order.netPayout - (order.shippingFee || 0) // Simplified profit
        metric.orders += 1
    })

    // Calculate derived metrics
    return Array.from(grouped.values())
        .map(m => ({
            ...m,
            aov: m.orders > 0 ? m.revenue / m.orders : 0,
            margin: m.revenue > 0 ? (m.profit / m.revenue) * 100 : 0
        }))
        .sort((a, b) => a.date.getTime() - b.date.getTime())
}

// Detect seasonality based on last 12-24 months
export function detectSeasonality(monthlyData: MonthlyMetric[]): SeasonalityInsight[] {
    if (monthlyData.length < 6) return [] // Not enough data

    // Group by month index (0-11)
    const monthTotals = new Array(12).fill(0).map(() => ({ sum: 0, count: 0 }))
    let totalRevenue = 0
    let totalMonths = 0

    monthlyData.forEach(m => {
        const monthIdx = getMonth(m.date)
        monthTotals[monthIdx].sum += m.revenue
        monthTotals[monthIdx].count += 1
        totalRevenue += m.revenue
        totalMonths += 1
    })

    const globalAvg = totalMonths > 0 ? totalRevenue / totalMonths : 0

    return monthTotals.map((data, idx) => {
        const avg = data.count > 0 ? data.sum / data.count : 0
        const multiplier = globalAvg > 0 ? avg / globalAvg : 1
        return {
            month: idx,
            avgRevenue: avg,
            multiplier,
            isHighSeason: multiplier > 1.15 // 15% above average
        }
    })
}

// Generate suggestions for a specific target date
export function generateSuggestions(
    monthlyData: MonthlyMetric[],
    targetDate: Date,
    seasonality: SeasonalityInsight[]
): KPISuggestion[] {
    // 1. Find baseline (e.g., average of last 3 months)
    const sorted = [...monthlyData].sort((a, b) => b.date.getTime() - a.date.getTime())
    const last3Months = sorted.slice(0, 3)

    if (last3Months.length === 0) return []

    const baselineRevenue = last3Months.reduce((sum, m) => sum + m.revenue, 0) / last3Months.length
    const baselineProfit = last3Months.reduce((sum, m) => sum + m.profit, 0) / last3Months.length
    const baselineOrders = last3Months.reduce((sum, m) => sum + m.orders, 0) / last3Months.length

    // 2. Apply Seasonality
    const targetMonthIdx = getMonth(targetDate)
    const seasonFactor = seasonality.find(s => s.month === targetMonthIdx)?.multiplier || 1

    // Adjust baseline by seasonality (if we are moving from low to high season, baseline should jump)
    // But baseline already includes recent trend. 
    // Better approach: Look at YoY growth if available, otherwise use recent trend + seasonality.

    // Simple approach: Baseline * Seasonality Adjustment
    // If last 3 months were High Season (1.2) and next is Low (0.8), we should scale down.
    // Avg Seasonality of last 3 months:
    const last3MonthsIdx = last3Months.map(m => getMonth(m.date))
    const avgRecentSeasonality = last3MonthsIdx.reduce((sum, idx) => {
        return sum + (seasonality.find(s => s.month === idx)?.multiplier || 1)
    }, 0) / last3Months.length

    const seasonalityCorrection = avgRecentSeasonality > 0 ? seasonFactor / avgRecentSeasonality : 1

    const adjustedBaseRevenue = baselineRevenue * seasonalityCorrection
    const adjustedBaseProfit = baselineProfit * seasonalityCorrection
    const adjustedBaseOrders = baselineOrders * seasonalityCorrection

    // 3. Create Scenarios
    const scenarios: KPISuggestion[] = [
        {
            type: 'conservative',
            label: 'An toàn',
            growthRate: 0.05, // 5% growth
            revenueTarget: adjustedBaseRevenue * 1.05,
            profitTarget: adjustedBaseProfit * 1.05,
            ordersTarget: adjustedBaseOrders * 1.05,
            reasoning: [
                `Dựa trên trung bình 3 tháng gần nhất (${new Intl.NumberFormat('vi-VN').format(baselineRevenue)}đ)`,
                `Điều chỉnh theo mùa vụ tháng ${targetMonthIdx + 1} (x${seasonFactor.toFixed(2)})`,
                `Mục tiêu tăng trưởng nhẹ 5%`
            ]
        },
        {
            type: 'moderate',
            label: 'Cân bằng',
            growthRate: 0.15, // 15% growth
            revenueTarget: adjustedBaseRevenue * 1.15,
            profitTarget: adjustedBaseProfit * 1.15,
            ordersTarget: adjustedBaseOrders * 1.15,
            reasoning: [
                `Tăng trưởng 15% so với mức cơ bản`,
                seasonFactor > 1.1 ? `Tận dụng cao điểm tháng ${targetMonthIdx + 1}` : `Duy trì đà tăng trưởng ổn định`
            ]
        },
        {
            type: 'aggressive',
            label: 'Đột phá',
            growthRate: 0.30, // 30% growth
            revenueTarget: adjustedBaseRevenue * 1.30,
            profitTarget: adjustedBaseProfit * 1.30,
            ordersTarget: adjustedBaseOrders * 1.30,
            reasoning: [
                `Mục tiêu thách thức tăng trưởng 30%`,
                `Phù hợp nếu có kế hoạch Marketing/Sale mạnh`
            ]
        }
    ]

    return scenarios.map(s => ({
        ...s,
        revenueTarget: Math.round(s.revenueTarget / 100000) * 100000, // Round to 100k
        profitTarget: Math.round(s.profitTarget / 100000) * 100000,
        ordersTarget: Math.round(s.ordersTarget)
    }))
}
