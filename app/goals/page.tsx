"use client"

import { useState, useEffect } from "react"
import { Plus, Target, TrendingUp, DollarSign, ShoppingBag, Trash2, Copy, Sparkles, Calendar, AlertTriangle, AlertCircle } from "lucide-react"
import { WeeklyProgress } from "@/components/dashboard/WeeklyProgress"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ComposedChart, Area } from 'recharts';

import { eachWeekOfInterval, startOfMonth, endOfMonth, getDaysInMonth, format, addMonths, subMonths, isValid, differenceInDays } from "date-fns"
import { WeekData, DailyData, computeWeeklyData, computeDailyData } from "@/utils/goalCascade"

interface GoalDetail {
    id: string
    platform: string
    revenueTarget: number
    profitTarget: number
    ordersTarget: number
}

interface Goal {
    id: string
    period: string
    type: string
    revenueTarget: number
    profitTarget: number
    ordersTarget: number
    manuallyEdited?: boolean
    parentGoalId?: string
    createdAt: Date
    details?: GoalDetail[]
}

export default function GoalsPage() {
    const [goals, setGoals] = useState<Goal[]>([])
    const [showForm, setShowForm] = useState(false)
    const [activeTab, setActiveTab] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly')
    const [weeklyData, setWeeklyData] = useState<WeekData[]>([])
    const [dailyData, setDailyData] = useState<DailyData | null>(null)
    const [showAffectedWarning, setShowAffectedWarning] = useState(false)
    const [affectedGoals, setAffectedGoals] = useState<Goal[]>([])

    // New state for charts and alerts
    const [channelPerformance, setChannelPerformance] = useState<any[]>([])
    const [cumulativeData, setCumulativeData] = useState<any[]>([])
    const [deviationAlert, setDeviationAlert] = useState<string | null>(null)

    const currentPeriod = activeTab === 'monthly'
        ? format(new Date(), 'yyyy-MM')
        : activeTab === 'quarterly'
            ? `${new Date().getFullYear()}-Q${Math.floor(new Date().getMonth() / 3) + 1}`
            : `${new Date().getFullYear()}`

    // Form state
    const [formData, setFormData] = useState({
        period: currentPeriod,
        revenueTarget: "",
        profitTarget: "",
        ordersTarget: "",
        details: [
            { platform: 'Shopee', revenueTarget: "", profitTarget: "", ordersTarget: "" },
            { platform: 'TikTok', revenueTarget: "", profitTarget: "", ordersTarget: "" },
            { platform: 'Facebook', revenueTarget: "", profitTarget: "", ordersTarget: "" },
            { platform: 'Instagram', revenueTarget: "", profitTarget: "", ordersTarget: "" },
        ]
    })

    // Fetch goals from API
    useEffect(() => {
        const fetchGoals = async () => {
            try {
                const res = await fetch('/api/goals')
                const data = await res.json()
                const fetchedGoals = data.goals as Goal[]
                setGoals(fetchedGoals)
            } catch (err) {
                console.error(err)
            }
        }
        fetchGoals()
        // Reset form period when tab changes
        setFormData(prev => ({
            ...prev,
            period: activeTab === 'monthly'
                ? format(new Date(), 'yyyy-MM')
                : activeTab === 'quarterly'
                    ? `${new Date().getFullYear()}-Q${Math.floor(new Date().getMonth() / 3) + 1}`
                    : `${new Date().getFullYear()}`
        }))
    }, [activeTab])

    // Compute cascade breakdowns and new charts
    useEffect(() => {
        const fetchAndCompute = async () => {
            if (activeTab === 'monthly') {
                // Use the selected period from formData instead of current month
                const monthKey = formData.period
                const monthGoal = goals.find(g => g.period === monthKey && g.type === 'monthly')

                if (monthGoal) {
                    // Fetch actual orders for this month
                    try {
                        const resOrders = await fetch('/api/orders')
                        const dataOrders = await resOrders.json()
                        const orders = dataOrders.orders || []

                        const resExpenses = await fetch('/api/expenses')
                        const dataExpenses = await resExpenses.json()
                        const expenses = dataExpenses.expenses || []

                        // Filter orders for this month
                        const [y, m] = monthKey.split('-').map(Number)
                        const start = new Date(y, m - 1, 1)
                        const end = endOfMonth(start)

                        const monthOrders = orders.filter((o: any) => {
                            const d = new Date(o.date)
                            return d >= start && d <= end
                        })

                        setDailyData(computeDailyData(monthGoal))
                        setWeeklyData(computeWeeklyData(monthGoal, monthOrders, expenses))

                        // Compute Channel Performance
                        const platforms = ['Shopee', 'TikTok', 'Facebook', 'Instagram']
                        const performance = platforms.map(platform => {
                            const detail = monthGoal.details?.find(d => d.platform === platform)
                            const actualOrders = monthOrders.filter((o: any) => o.platform === platform)
                            const actualRevenue = actualOrders.reduce((sum: number, o: any) => sum + o.revenue, 0)
                            const actualProfit = actualOrders.reduce((sum: number, o: any) => sum + (o.netPayout - (o.totalExpenses || 0)), 0) // Simplified profit
                            const actualCount = actualOrders.length

                            return {
                                platform,
                                target: {
                                    revenue: detail?.revenueTarget || 0,
                                    profit: detail?.profitTarget || 0,
                                    orders: detail?.ordersTarget || 0
                                },
                                actual: {
                                    revenue: actualRevenue,
                                    profit: actualProfit,
                                    orders: actualCount
                                },
                                progress: detail?.revenueTarget ? (actualRevenue / detail.revenueTarget) * 100 : 0
                            }
                        })
                        setChannelPerformance(performance)

                        // Compute Cumulative Data (Plan vs Actual)
                        const daysInMonthVal = getDaysInMonth(start)
                        const dailyRevenueTarget = monthGoal.revenueTarget / daysInMonthVal

                        const cumulative = []
                        let runningActual = 0
                        let runningPlan = 0

                        for (let i = 1; i <= daysInMonthVal; i++) {
                            const dayDate = new Date(y, m - 1, i)
                            if (dayDate > new Date()) break; // Don't project future actuals

                            const dayOrders = monthOrders.filter((o: any) => new Date(o.date).getDate() === i)
                            const dayRevenue = dayOrders.reduce((sum: number, o: any) => sum + o.revenue, 0)

                            runningActual += dayRevenue
                            runningPlan += dailyRevenueTarget

                            cumulative.push({
                                day: i,
                                plan: runningPlan,
                                actual: runningActual
                            })
                        }
                        setCumulativeData(cumulative)

                        // Deviation Alert
                        const today = new Date().getDate()
                        const expectedProgress = (today / daysInMonthVal) * monthGoal.revenueTarget
                        const currentRevenue = monthOrders.reduce((sum: number, o: any) => sum + o.revenue, 0)
                        const deviation = expectedProgress > 0 ? ((currentRevenue - expectedProgress) / expectedProgress) * 100 : 0

                        if (deviation < -10) { // More than 10% behind
                            const remainingDays = daysInMonthVal - today
                            const remainingTarget = monthGoal.revenueTarget - currentRevenue
                            const neededPerDay = remainingDays > 0 ? remainingTarget / remainingDays : 0
                            const neededOrdersPerDay = remainingDays > 0 ? (monthGoal.ordersTarget - monthOrders.length) / remainingDays : 0

                            setDeviationAlert(`Bạn đang chậm ${Math.abs(deviation).toFixed(1)}% so với kế hoạch. Cần đạt trung bình ${new Intl.NumberFormat('vi-VN').format(Math.round(neededOrdersPerDay))} đơn/ngày (${new Intl.NumberFormat('vi-VN', { notation: "compact" }).format(neededPerDay)}/ngày) để về đích.`)
                        } else {
                            setDeviationAlert(null)
                        }

                    } catch (e) {
                        console.error("Failed to fetch orders for weekly data", e)
                        setDailyData(computeDailyData(monthGoal))
                        setWeeklyData(computeWeeklyData(monthGoal, []))
                    }
                } else {
                    setDailyData(null)
                    setWeeklyData([])
                    setChannelPerformance([])
                    setCumulativeData([])
                    setDeviationAlert(null)
                }
            } else {
                setDailyData(null)
                setWeeklyData([])
                setChannelPerformance([])
                setCumulativeData([])
                setDeviationAlert(null)
            }
        }
        fetchAndCompute()
    }, [goals, activeTab, formData.period])

    // Format number input with commas
    const formatNumberInput = (value: string) => {
        const number = value.replace(/\D/g, "")
        return number.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
    }

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: formatNumberInput(value)
        }))
    }

    const handleDetailChange = (index: number, field: string, value: string) => {
        const newDetails = [...formData.details]
        newDetails[index] = { ...newDetails[index], [field]: formatNumberInput(value) }

        // Auto-sum to main targets
        const totalRevenue = newDetails.reduce((sum, d) => sum + (parseFloat(d.revenueTarget.replace(/,/g, "")) || 0), 0)
        const totalProfit = newDetails.reduce((sum, d) => sum + (parseFloat(d.profitTarget.replace(/,/g, "")) || 0), 0)
        const totalOrders = newDetails.reduce((sum, d) => sum + (parseInt(d.ordersTarget.replace(/,/g, "")) || 0), 0)

        setFormData(prev => ({
            ...prev,
            details: newDetails,
            revenueTarget: formatNumberInput(totalRevenue.toString()),
            profitTarget: formatNumberInput(totalProfit.toString()),
            ordersTarget: formatNumberInput(totalOrders.toString())
        }))
    }

    // Vietnam Seasonality Weights (Relative strength of each month)
    const SEASONALITY_WEIGHTS: Record<number, number> = {
        1: 1.3,  // Jan: High (Pre-Tet)
        2: 0.6,  // Feb: Low (Tet Holiday)
        3: 1.0,  // Mar: Recovery
        4: 1.0,  // Apr: Normal
        5: 1.0,  // May: Normal
        6: 1.0,  // Jun: Normal
        7: 1.0,  // Jul: Normal
        8: 1.0,  // Aug: Normal
        9: 1.1,  // Sep: Back to school
        10: 1.2, // Oct: 10.10
        11: 1.4, // Nov: 11.11, Black Friday
        12: 1.5  // Dec: 12.12, Year End
    }

    // Smart Suggestion Logic
    const handleSmartSuggest = async (strategy: 'maintain' | 'growth_10' | 'growth_20' | 'growth_50' | 'profit_margin') => {
        try {
            // 1. Try to fetch actual sales data
            const res = await fetch('/api/orders')
            const data = await res.json()
            const orders = data.orders || []

            // Calculate previous period based on activeTab
            let prevRevenue = 0
            let prevProfit = 0
            let prevOrdersCount = 0

            // Platform breakdown
            const platformStats: Record<string, { revenue: number, profit: number, orders: number }> = {
                'Shopee': { revenue: 0, profit: 0, orders: 0 },
                'TikTok': { revenue: 0, profit: 0, orders: 0 },
                'Facebook': { revenue: 0, profit: 0, orders: 0 },
                'Instagram': { revenue: 0, profit: 0, orders: 0 },
            }

            const now = new Date()
            let fromDate: Date, toDate: Date

            if (activeTab === 'monthly') {
                // Last month
                fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
                toDate = new Date(now.getFullYear(), now.getMonth(), 0)
            } else if (activeTab === 'quarterly') {
                // Last quarter
                const currentQuarter = Math.floor(now.getMonth() / 3)
                fromDate = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1)
                toDate = new Date(now.getFullYear(), currentQuarter * 3, 0)
            } else {
                // Last year
                fromDate = new Date(now.getFullYear() - 1, 0, 1)
                toDate = new Date(now.getFullYear() - 1, 11, 31)
            }

            const prevOrders = orders.filter((o: any) => {
                const d = new Date(o.date)
                return d >= fromDate && d <= toDate
            })

            if (prevOrders.length > 0) {
                prevRevenue = prevOrders.reduce((sum: number, o: any) => sum + o.revenue, 0)
                prevProfit = prevOrders.reduce((sum: number, o: any) => sum + (o.netPayout - (o.totalExpenses || 0)), 0)
                if (prevProfit === 0) prevProfit = prevRevenue * 0.3
                prevOrdersCount = prevOrders.length

                // Aggregate by platform
                prevOrders.forEach((o: any) => {
                    if (platformStats[o.platform]) {
                        platformStats[o.platform].revenue += o.revenue
                        platformStats[o.platform].profit += (o.netPayout - (o.totalExpenses || 0))
                        platformStats[o.platform].orders += 1
                    }
                })
            }

            // Compare with last goal to avoid huge drops (optimistic suggestion)
            const lastGoal = goals[0]
            if (lastGoal && strategy !== 'profit_margin') {
                if (lastGoal.revenueTarget > prevRevenue) {
                    prevRevenue = lastGoal.revenueTarget
                    prevProfit = lastGoal.profitTarget
                    prevOrdersCount = lastGoal.ordersTarget
                }
            }

            // Fallback defaults if both are 0 (new user)
            if (prevRevenue === 0) {
                prevRevenue = 100000000
                prevProfit = 30000000
                prevOrdersCount = 200
                // Default split
                platformStats['Shopee'] = { revenue: 50000000, profit: 15000000, orders: 100 }
                platformStats['TikTok'] = { revenue: 30000000, profit: 9000000, orders: 60 }
                platformStats['Facebook'] = { revenue: 20000000, profit: 6000000, orders: 40 }
            }

            if (strategy === 'profit_margin') {
                // Suggest Profit based on Revenue Target and Historical Margin
                const currentRevenueTarget = parseFloat(formData.revenueTarget.replace(/,/g, "")) || prevRevenue
                const margin = prevRevenue > 0 ? prevProfit / prevRevenue : 0.3

                setFormData(prev => ({
                    ...prev,
                    profitTarget: formatNumberInput(Math.round(currentRevenueTarget * margin).toString())
                }))
                alert(`Đã áp dụng margin thực tế tháng trước: ${(margin * 100).toFixed(1)}%`)
                return
            }

            // Determine multiplier
            let multiplier = 1.1 // Default 10%
            if (strategy === 'maintain') multiplier = 1.0
            if (strategy === 'growth_20') multiplier = 1.2
            if (strategy === 'growth_50') multiplier = 1.5

            const newDetails = formData.details.map(d => {
                const stats = platformStats[d.platform] || { revenue: 0, profit: 0, orders: 0 }
                return {
                    ...d,
                    revenueTarget: formatNumberInput(Math.round(stats.revenue * multiplier).toString()),
                    profitTarget: formatNumberInput(Math.round(stats.profit * multiplier).toString()),
                    ordersTarget: formatNumberInput(Math.round(stats.orders * multiplier).toString())
                }
            })

            setFormData(prev => ({
                ...prev,
                revenueTarget: formatNumberInput(Math.round(prevRevenue * multiplier).toString()),
                profitTarget: formatNumberInput(Math.round(prevProfit * multiplier).toString()),
                ordersTarget: formatNumberInput(Math.round(prevOrdersCount * multiplier).toString()),
                details: newDetails
            }))

        } catch (error) {
            console.error("Smart suggest failed:", error)
            // Fallback if API fails
            setFormData(prev => ({
                ...prev,
                revenueTarget: "110,000,000",
                profitTarget: "33,000,000",
                ordersTarget: "220"
            }))
        }
    }

    // Set/Update goal
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        try {
            const payload = {
                ...formData,
                type: activeTab,
                revenueTarget: parseFloat(formData.revenueTarget.replace(/,/g, "")),
                profitTarget: parseFloat(formData.profitTarget.replace(/,/g, "")),
                ordersTarget: parseInt(formData.ordersTarget.replace(/,/g, "")),
                details: formData.details.map(d => ({
                    platform: d.platform,
                    revenueTarget: parseFloat(d.revenueTarget.replace(/,/g, "")) || 0,
                    profitTarget: parseFloat(d.profitTarget.replace(/,/g, "")) || 0,
                    ordersTarget: parseInt(d.ordersTarget.replace(/,/g, "")) || 0
                }))
            }

            const res = await fetch('/api/goals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            if (res.ok) {
                // Re-fetch goals to update the list and potentially daily/weekly data
                const resGoals = await fetch('/api/goals')
                const dataGoals = await resGoals.json()
                const fetchedGoals = dataGoals.goals as Goal[]
                setGoals(fetchedGoals)

                // Manually trigger the daily/weekly data update logic (simplified re-fetch handled by useEffect dependency)

                setShowForm(false)
                setFormData({
                    period: currentPeriod,
                    revenueTarget: "",
                    profitTarget: "",
                    ordersTarget: "",
                    details: [
                        { platform: 'Shopee', revenueTarget: "", profitTarget: "", ordersTarget: "" },
                        { platform: 'TikTok', revenueTarget: "", profitTarget: "", ordersTarget: "" },
                        { platform: 'Facebook', revenueTarget: "", profitTarget: "", ordersTarget: "" },
                        { platform: 'Instagram', revenueTarget: "", profitTarget: "", ordersTarget: "" },
                    ]
                })
            }
        } catch (error) {
            console.error("Failed to save goal:", error)
        }
    }

    // Delete goal
    const handleDelete = async (id: string) => {
        if (!confirm("Bạn chắc chắn muốn xóa mục tiêu này?")) return

        try {
            const res = await fetch(`/api/goals?id=${id}`, {
                method: 'DELETE',
            })

            if (res.ok) {
                // Re-fetch goals to update the list
                const resGoals = await fetch('/api/goals')
                const dataGoals = await resGoals.json()
                const fetchedGoals = dataGoals.goals as Goal[]
                setGoals(fetchedGoals)
            }
        } catch (error) {
            console.error("Failed to delete goal:", error)
        }
    }

    // Duplicate goal
    const handleDuplicate = (goal: Goal) => {
        setShowForm(true)
        // Calculate next period based on type
        let nextPeriod = goal.period
        if (activeTab === 'monthly') {
            const [y, m] = goal.period.split('-').map(Number)
            const date = new Date(y, m - 1)
            nextPeriod = format(addMonths(date, 1), 'yyyy-MM')
        } else if (activeTab === 'quarterly') {
            const [y, q] = goal.period.split('-Q')
            let year = parseInt(y)
            let quarter = parseInt(q) + 1
            if (quarter > 4) {
                quarter = 1
                year++
            }
            nextPeriod = `${year}-Q${quarter}`
        } else {
            nextPeriod = (parseInt(goal.period) + 1).toString()
        }

        setFormData({
            period: nextPeriod,
            revenueTarget: formatNumberInput(goal.revenueTarget.toString()),
            profitTarget: formatNumberInput(goal.profitTarget.toString()),
            ordersTarget: formatNumberInput(goal.ordersTarget.toString()),
            details: goal.details ? goal.details.map(d => ({
                platform: d.platform,
                revenueTarget: formatNumberInput(d.revenueTarget.toString()),
                profitTarget: formatNumberInput(d.profitTarget.toString()),
                ordersTarget: formatNumberInput(d.ordersTarget.toString())
            })) : [
                { platform: 'Shopee', revenueTarget: "", profitTarget: "", ordersTarget: "" },
                { platform: 'TikTok', revenueTarget: "", profitTarget: "", ordersTarget: "" },
                { platform: 'Facebook', revenueTarget: "", profitTarget: "", ordersTarget: "" },
                { platform: 'Instagram', revenueTarget: "", profitTarget: "", ordersTarget: "" },
            ]
        })
    }

    // Check if current period has goal
    const currentGoal = goals.find(g => g.period === formData.period)

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Mục tiêu</h2>
                    <p className="text-muted-foreground text-gray-500">
                        Đặt mục tiêu doanh thu, lợi nhuận để theo dõi tăng trưởng.
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('monthly')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'monthly' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        Tháng
                    </button>
                    <button
                        onClick={() => setActiveTab('quarterly')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'quarterly' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        Quý
                    </button>
                    <button
                        onClick={() => setActiveTab('yearly')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'yearly' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        Năm
                    </button>
                </div>
                <button
                    onClick={() => {
                        setShowForm(!showForm)
                        if (!showForm && currentGoal) {
                            setFormData({
                                period: currentGoal.period,
                                revenueTarget: formatNumberInput(currentGoal.revenueTarget.toString()),
                                profitTarget: formatNumberInput(currentGoal.profitTarget.toString()),
                                ordersTarget: formatNumberInput(currentGoal.ordersTarget.toString()),
                                details: currentGoal.details ? currentGoal.details.map(d => ({
                                    platform: d.platform,
                                    revenueTarget: formatNumberInput(d.revenueTarget.toString()),
                                    profitTarget: formatNumberInput(d.profitTarget.toString()),
                                    ordersTarget: formatNumberInput(d.ordersTarget.toString())
                                })) : [
                                    { platform: 'Shopee', revenueTarget: "", profitTarget: "", ordersTarget: "" },
                                    { platform: 'TikTok', revenueTarget: "", profitTarget: "", ordersTarget: "" },
                                    { platform: 'Facebook', revenueTarget: "", profitTarget: "", ordersTarget: "" },
                                    { platform: 'Instagram', revenueTarget: "", profitTarget: "", ordersTarget: "" },
                                ]
                            })
                        }
                    }}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm"
                >
                    <Target className="mr-2 h-4 w-4" /> {currentGoal ? "Cập nhật mục tiêu" : "Đặt mục tiêu mới"}
                </button>
            </div>

            {/* Warning for affected manual goals */}
            {showAffectedWarning && affectedGoals.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3 mb-6 animate-in fade-in slide-in-from-top-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div className="flex-1">
                        <h4 className="text-sm font-medium text-yellow-800">Lưu ý: Một số mục tiêu con không được tự động cập nhật</h4>
                        <p className="text-sm text-yellow-700 mt-1">
                            Các mục tiêu sau đây đã được chỉnh sửa thủ công trước đó nên không bị ghi đè bởi quy tắc phân bổ tự động:
                        </p>
                        <ul className="list-disc list-inside mt-2 text-sm text-yellow-700">
                            {affectedGoals.map(g => (
                                <li key={g.id}>
                                    {g.type === 'monthly' ? `Tháng ${g.period.split('-')[1]}` : g.period}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <button
                        onClick={() => setShowAffectedWarning(false)}
                        className="text-yellow-500 hover:text-yellow-700 p-1"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Deviation Alert */}
            {deviationAlert && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 mb-6 animate-in fade-in slide-in-from-top-2">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div className="flex-1">
                        <h4 className="text-sm font-medium text-red-800">Cảnh báo tiến độ</h4>
                        <p className="text-sm text-red-700 mt-1">
                            {deviationAlert}
                        </p>
                    </div>
                </div>
            )}

            {/* Weekly Progress for selected month */}
            {activeTab === 'monthly' && weeklyData.length > 0 && (
                <WeeklyProgress weeklyData={weeklyData} />
            )}

            {/* Set Goal Form */}
            {showForm && (
                <div className="bg-white p-6 rounded-xl shadow-sm border animate-in fade-in slide-in-from-top-4">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">
                            {currentGoal ? `Cập nhật mục tiêu ${activeTab === 'monthly' ? 'tháng' : activeTab === 'quarterly' ? 'quý' : 'năm'}` : "Đặt mục tiêu mới"}
                        </h3>

                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">Đề xuất:</span>
                            <div className="flex bg-purple-50 rounded-lg p-1 border border-purple-100">
                                <button
                                    type="button"
                                    onClick={() => handleSmartSuggest('maintain')}
                                    className="px-3 py-1 text-xs font-medium text-purple-700 hover:bg-white hover:shadow-sm rounded transition"
                                    title="Giữ nguyên so với kỳ trước"
                                >
                                    Duy trì
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSmartSuggest('growth_10')}
                                    className="px-3 py-1 text-xs font-medium text-purple-700 hover:bg-white hover:shadow-sm rounded transition"
                                    title="Tăng trưởng 10%"
                                >
                                    +10%
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSmartSuggest('growth_20')}
                                    className="px-3 py-1 text-xs font-medium text-purple-700 hover:bg-white hover:shadow-sm rounded transition"
                                    title="Tăng trưởng 20%"
                                >
                                    +20%
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSmartSuggest('growth_50')}
                                    className="px-3 py-1 text-xs font-medium text-purple-700 hover:bg-white hover:shadow-sm rounded transition"
                                    title="Tăng trưởng 50%"
                                >
                                    +50%
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSmartSuggest('profit_margin')}
                                    className="px-3 py-1 text-xs font-medium text-green-700 hover:bg-white hover:shadow-sm rounded transition"
                                    title="Tính lợi nhuận theo margin thực tế tháng trước"
                                >
                                    Theo Margin TT
                                </button>
                            </div>
                        </div>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {activeTab === 'monthly' ? 'Tháng' : activeTab === 'quarterly' ? 'Quý' : 'Năm'}
                                </label>
                                {activeTab === 'monthly' ? (
                                    <input
                                        type="month"
                                        value={formData.period}
                                        onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        required
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        value={formData.period}
                                        onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                                        placeholder={activeTab === 'quarterly' ? "2025-Q1" : "2025"}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        required
                                    />
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    💰 Tổng Doanh thu
                                </label>
                                <input
                                    type="text"
                                    value={formData.revenueTarget}
                                    onChange={(e) => handleInputChange('revenueTarget', e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                                    placeholder="0"
                                    required
                                    readOnly // Auto-calculated from details
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    🎯 Tổng Lợi nhuận
                                </label>
                                <input
                                    type="text"
                                    value={formData.profitTarget}
                                    onChange={(e) => handleInputChange('profitTarget', e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                                    placeholder="0"
                                    required
                                    readOnly // Auto-calculated from details
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    🛒 Tổng Đơn hàng
                                </label>
                                <input
                                    type="text"
                                    value={formData.ordersTarget}
                                    onChange={(e) => handleInputChange('ordersTarget', e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                                    placeholder="0"
                                    required
                                    readOnly // Auto-calculated from details
                                />
                            </div>
                        </div>

                        {/* Channel Breakdown Inputs */}
                        <div className="border-t pt-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-3">Phân bổ theo kênh (Nhập chi tiết để tự động tính tổng)</h4>
                            <div className="grid gap-4">
                                {formData.details.map((detail, index) => (
                                    <div key={detail.platform} className="grid grid-cols-4 gap-4 items-center bg-gray-50 p-3 rounded-lg">
                                        <div className="font-medium text-sm">{detail.platform}</div>
                                        <div>
                                            <input
                                                type="text"
                                                value={detail.revenueTarget}
                                                onChange={(e) => handleDetailChange(index, 'revenueTarget', e.target.value)}
                                                className="w-full px-3 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500"
                                                placeholder="Doanh thu"
                                            />
                                        </div>
                                        <div>
                                            <input
                                                type="text"
                                                value={detail.profitTarget}
                                                onChange={(e) => handleDetailChange(index, 'profitTarget', e.target.value)}
                                                className="w-full px-3 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500"
                                                placeholder="Lợi nhuận"
                                            />
                                        </div>
                                        <div>
                                            <input
                                                type="text"
                                                value={detail.ordersTarget}
                                                onChange={(e) => handleDetailChange(index, 'ordersTarget', e.target.value)}
                                                className="w-full px-3 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500"
                                                placeholder="Đơn hàng"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                            >
                                {currentGoal ? "Cập nhật" : "Lưu mục tiêu"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Goals Selection & Details */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-gray-500" />
                        Chi tiết Mục tiêu ({activeTab === 'monthly' ? 'Tháng' : activeTab === 'quarterly' ? 'Quý' : 'Năm'})
                    </h3>

                    {/* Period Selector */}
                    <div className="relative">
                        <select
                            value={formData.period}
                            onChange={(e) => {
                                const newPeriod = e.target.value
                                setFormData(prev => ({ ...prev, period: newPeriod }))
                                // Find goal for this period to update form data if needed
                                const selectedGoal = goals.find(g => g.period === newPeriod && g.type === activeTab)
                                if (selectedGoal) {
                                    setFormData({
                                        period: selectedGoal.period,
                                        revenueTarget: formatNumberInput(selectedGoal.revenueTarget.toString()),
                                        profitTarget: formatNumberInput(selectedGoal.profitTarget.toString()),
                                        ordersTarget: formatNumberInput(selectedGoal.ordersTarget.toString()),
                                        details: selectedGoal.details ? selectedGoal.details.map(d => ({
                                            platform: d.platform,
                                            revenueTarget: formatNumberInput(d.revenueTarget.toString()),
                                            profitTarget: formatNumberInput(d.profitTarget.toString()),
                                            ordersTarget: formatNumberInput(d.ordersTarget.toString())
                                        })) : [
                                            { platform: 'Shopee', revenueTarget: "", profitTarget: "", ordersTarget: "" },
                                            { platform: 'TikTok', revenueTarget: "", profitTarget: "", ordersTarget: "" },
                                            { platform: 'Facebook', revenueTarget: "", profitTarget: "", ordersTarget: "" },
                                            { platform: 'Instagram', revenueTarget: "", profitTarget: "", ordersTarget: "" },
                                        ]
                                    })
                                }
                            }}
                            className="appearance-none bg-white border border-gray-300 text-gray-700 py-2 px-4 pr-8 rounded-lg leading-tight focus:outline-none focus:bg-white focus:border-blue-500"
                        >
                            {/* Generate options based on available goals or current period */}
                            {goals
                                .filter(g => g.type === activeTab)
                                .sort((a, b) => b.period.localeCompare(a.period))
                                .map(g => (
                                    <option key={g.id} value={g.period}>
                                        {activeTab === 'monthly'
                                            ? (() => {
                                                const d = new Date(g.period + '-01')
                                                return isValid(d) ? `Tháng ${format(d, 'MM/yyyy')}` : g.period
                                            })()
                                            : activeTab === 'quarterly'
                                                ? `Quý ${g.period.split('-Q')[1]} / ${g.period.split('-Q')[0]}`
                                                : `Năm ${g.period}`
                                        }
                                    </option>
                                ))
                            }
                            {/* Always include current period if not in list */}
                            {!goals.some(g => g.period === currentPeriod && g.type === activeTab) && (
                                <option value={currentPeriod}>
                                    {activeTab === 'monthly'
                                        ? `Tháng ${format(new Date(), 'MM/yyyy')} (Hiện tại)`
                                        : activeTab === 'quarterly'
                                            ? `Quý ${Math.floor(new Date().getMonth() / 3) + 1} / ${new Date().getFullYear()} (Hiện tại)`
                                            : `Năm ${new Date().getFullYear()} (Hiện tại)`
                                    }
                                </option>
                            )}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                        </div>
                    </div>
                </div>

                {/* Selected Goal Details */}
                {currentGoal ? (
                    <div className="bg-white p-6 rounded-xl shadow-sm border relative group border-blue-500 border-2">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h4 className="font-semibold text-lg">
                                    {activeTab === 'monthly'
                                        ? (() => {
                                            const d = new Date(currentGoal.period + '-01')
                                            return isValid(d) ? `Tháng ${format(d, 'MM/yyyy')}` : currentGoal.period
                                        })()
                                        : activeTab === 'quarterly'
                                            ? `Quý ${currentGoal.period.split('-Q')[1]} / ${currentGoal.period.split('-Q')[0]}`
                                            : `Năm ${currentGoal.period}`
                                    }
                                </h4>
                                {currentGoal.period === currentPeriod && (
                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                        Hiện tại
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => handleDuplicate(currentGoal)}
                                    className="p-1 text-gray-400 hover:text-blue-600 transition"
                                    title="Nhân bản sang kỳ tiếp theo"
                                >
                                    <Copy className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(currentGoal.id)}
                                    className="p-1 text-gray-400 hover:text-red-600 transition"
                                    title="Xóa"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-full shadow-sm">
                                        <DollarSign className="h-5 w-5 text-gray-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Doanh thu</p>
                                        <p className="font-bold text-lg">
                                            {new Intl.NumberFormat('vi-VN', {
                                                style: 'currency',
                                                currency: 'VND',
                                                notation: 'compact'
                                            }).format(currentGoal.revenueTarget)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-full shadow-sm">
                                        <TrendingUp className="h-5 w-5 text-green-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-green-700">Lợi nhuận</p>
                                        <p className="font-bold text-lg text-green-700">
                                            {new Intl.NumberFormat('vi-VN', {
                                                style: 'currency',
                                                currency: 'VND',
                                                notation: 'compact'
                                            }).format(currentGoal.profitTarget)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-full shadow-sm">
                                        <ShoppingBag className="h-5 w-5 text-blue-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-blue-700">Đơn hàng</p>
                                        <p className="font-bold text-lg text-blue-700">
                                            {new Intl.NumberFormat('vi-VN').format(currentGoal.ordersTarget)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Daily Breakdown (Only for Monthly Goals) */}
                        {activeTab === 'monthly' && (
                            <div className="mt-6 pt-6 border-t border-gray-100">
                                <h5 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-gray-400" />
                                    Kế hoạch phân bổ theo ngày
                                </h5>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {(() => {
                                        const [year, month] = currentGoal.period.split('-').map(Number);
                                        const daysInMonthVal = getDaysInMonth(new Date(year, month - 1));

                                        const dailyRevenue = currentGoal.revenueTarget / daysInMonthVal;
                                        const dailyProfit = currentGoal.profitTarget / daysInMonthVal;
                                        const dailyOrders = currentGoal.ordersTarget / daysInMonthVal;
                                        const aov = currentGoal.ordersTarget > 0 ? currentGoal.revenueTarget / currentGoal.ordersTarget : 0;

                                        return (
                                            <>
                                                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                    <p className="text-xs text-gray-500 mb-1">Đơn hàng / ngày</p>
                                                    <p className="font-semibold text-gray-900">
                                                        {new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(dailyOrders)}
                                                    </p>
                                                </div>
                                                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                    <p className="text-xs text-gray-500 mb-1">AOV dự kiến</p>
                                                    <p className="font-semibold text-gray-900">
                                                        {new Intl.NumberFormat('vi-VN', {
                                                            style: 'currency',
                                                            currency: 'VND',
                                                            maximumFractionDigits: 0
                                                        }).format(aov)}
                                                    </p>
                                                </div>
                                                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                    <p className="text-xs text-gray-500 mb-1">Doanh thu / ngày</p>
                                                    <p className="font-semibold text-gray-900">
                                                        {new Intl.NumberFormat('vi-VN', {
                                                            style: 'currency',
                                                            currency: 'VND',
                                                            maximumFractionDigits: 0
                                                        }).format(dailyRevenue)}
                                                    </p>
                                                </div>
                                                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                    <p className="text-xs text-gray-500 mb-1">Lợi nhuận / ngày</p>
                                                    <p className="font-semibold text-gray-900">
                                                        {new Intl.NumberFormat('vi-VN', {
                                                            style: 'currency',
                                                            currency: 'VND',
                                                            maximumFractionDigits: 0
                                                        }).format(dailyProfit)}
                                                    </p>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        )}

                        {/* Channel Performance Breakdown */}
                        {activeTab === 'monthly' && channelPerformance.length > 0 && (
                            <div className="mt-6 pt-6 border-t border-gray-100">
                                <h5 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                    <ShoppingBag className="h-4 w-4 text-gray-400" />
                                    Hiệu quả theo kênh
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {channelPerformance.map((cp) => (
                                        <div key={cp.platform} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-medium text-gray-900">{cp.platform}</span>
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${cp.progress >= 100 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                    {cp.progress.toFixed(1)}%
                                                </span>
                                            </div>

                                            {/* Revenue Progress */}
                                            <div className="mb-3">
                                                <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                    <span>Doanh thu</span>
                                                    <span>{new Intl.NumberFormat('vi-VN', { notation: "compact" }).format(cp.actual.revenue)} / {new Intl.NumberFormat('vi-VN', { notation: "compact" }).format(cp.target.revenue)}</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                                    <div
                                                        className={`h-1.5 rounded-full ${cp.progress >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                                                        style={{ width: `${Math.min(cp.progress, 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>

                                            {/* Profit & Orders Mini Stats */}
                                            <div className="grid grid-cols-2 gap-2 mt-2">
                                                <div className="bg-white p-2 rounded border border-gray-100">
                                                    <p className="text-[10px] text-gray-500">Lợi nhuận</p>
                                                    <p className="text-xs font-semibold">{new Intl.NumberFormat('vi-VN', { notation: "compact" }).format(cp.actual.profit)}</p>
                                                </div>
                                                <div className="bg-white p-2 rounded border border-gray-100">
                                                    <p className="text-[10px] text-gray-500">Đơn hàng</p>
                                                    <p className="text-xs font-semibold">{cp.actual.orders} / {cp.target.orders}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Cumulative Progress Chart */}
                        {activeTab === 'monthly' && cumulativeData.length > 0 && (
                            <div className="mt-6 pt-6 border-t border-gray-100">
                                <h5 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-gray-400" />
                                    Tiến độ tích lũy (Plan vs Actual)
                                </h5>
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={cumulativeData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                            <XAxis
                                                dataKey="day"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 12, fill: '#6b7280' }}
                                                label={{ value: 'Ngày trong tháng', position: 'insideBottom', offset: -5, fontSize: 12, fill: '#9ca3af' }}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 12, fill: '#6b7280' }}
                                                tickFormatter={(value) => new Intl.NumberFormat('vi-VN', { notation: "compact" }).format(value)}
                                            />
                                            <Tooltip
                                                formatter={(value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)}
                                                labelFormatter={(label) => `Ngày ${label}`}
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Legend />
                                            <Area type="monotone" dataKey="plan" name="Kế hoạch (Tích lũy)" stroke="#94a3b8" fill="#f1f5f9" strokeDasharray="5 5" />
                                            <Line type="monotone" dataKey="actual" name="Thực tế (Tích lũy)" stroke="#2563eb" strokeWidth={3} dot={false} />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-white p-12 rounded-xl shadow-sm border text-center">
                        <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">Chưa có mục tiêu cho kỳ này.</p>
                        <button
                            onClick={() => {
                                setShowForm(true)
                                setFormData(prev => ({ ...prev, period: formData.period }))
                            }}
                            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                        >
                            Đặt mục tiêu ngay
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
