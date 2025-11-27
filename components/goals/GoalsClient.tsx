"use client"

import { useState, useEffect } from "react"
import { Plus, Target, TrendingUp, DollarSign, ShoppingBag, AlertCircle, Calendar } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ComposedChart, Area } from 'recharts'
import { format } from "date-fns"
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface GoalsClientProps {
    initialGoals: any[]
}

export function GoalsClient({ initialGoals }: GoalsClientProps) {
    const [activeTab, setActiveTab] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly')
    const [showForm, setShowForm] = useState(false)

    // Determine current period string
    const currentPeriod = activeTab === 'monthly'
        ? format(new Date(), 'yyyy-MM')
        : activeTab === 'quarterly'
            ? `${new Date().getFullYear()}-Q${Math.floor(new Date().getMonth() / 3) + 1}`
            : `${new Date().getFullYear()}`

    // Fetch Goals List (Lightweight)
    const { data: goalsData, mutate: mutateGoals } = useSWR(`/api/goals`, fetcher, {
        fallbackData: { goals: initialGoals }
    })
    const goals = goalsData?.goals || []
    const currentGoal = goals.find((g: any) => g.period === currentPeriod && g.type === activeTab)

    // Fetch Progress (Heavy lifting done on server)
    const { data: progressData } = useSWR(
        currentGoal ? `/api/goals/progress?period=${currentPeriod}&type=${activeTab}` : null,
        fetcher
    )

    // Form State
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

    // Pre-fill form when opening
    useEffect(() => {
        if (showForm && currentGoal) {
            setFormData({
                period: currentGoal.period,
                revenueTarget: new Intl.NumberFormat('vi-VN').format(currentGoal.revenueTarget),
                profitTarget: new Intl.NumberFormat('vi-VN').format(currentGoal.profitTarget),
                ordersTarget: new Intl.NumberFormat('vi-VN').format(currentGoal.ordersTarget),
                details: currentGoal.details ? currentGoal.details.map((d: any) => ({
                    platform: d.platform,
                    revenueTarget: new Intl.NumberFormat('vi-VN').format(d.revenueTarget),
                    profitTarget: new Intl.NumberFormat('vi-VN').format(d.profitTarget),
                    ordersTarget: new Intl.NumberFormat('vi-VN').format(d.ordersTarget)
                })) : formData.details
            })
        } else if (showForm && !currentGoal) {
            setFormData(prev => ({ ...prev, period: currentPeriod }))
        }
    }, [showForm, currentGoal, currentPeriod])

    // Handlers
    const formatNumber = (val: string) => val.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ".")
    const parseNumber = (val: string) => parseInt(val.replace(/\./g, '') || '0')

    const handleDetailChange = (index: number, field: string, value: string) => {
        const newDetails = [...formData.details]
        newDetails[index] = { ...newDetails[index], [field]: formatNumber(value) }

        // Auto-sum
        const totalRevenue = newDetails.reduce((sum, d) => sum + parseNumber(d.revenueTarget), 0)
        const totalProfit = newDetails.reduce((sum, d) => sum + parseNumber(d.profitTarget), 0)
        const totalOrders = newDetails.reduce((sum, d) => sum + parseNumber(d.ordersTarget), 0)

        setFormData(prev => ({
            ...prev,
            details: newDetails,
            revenueTarget: new Intl.NumberFormat('vi-VN').format(totalRevenue),
            profitTarget: new Intl.NumberFormat('vi-VN').format(totalProfit),
            ordersTarget: new Intl.NumberFormat('vi-VN').format(totalOrders)
        }))
    }

    // Suggestion State
    const [suggestions, setSuggestions] = useState<{ period: string, suggestions: { revenue: number, profit: number, orders: number } } | null>(null)
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)

    // Fetch Suggestions when form opens or period changes
    useEffect(() => {
        if (showForm && formData.period) {
            const fetchSuggestions = async () => {
                setIsLoadingSuggestions(true)
                try {
                    const res = await fetch(`/api/goals/suggestions?period=${formData.period}&type=${activeTab}`)
                    if (res.ok) {
                        const data = await res.json()
                        setSuggestions(data)
                    }
                } catch (error) {
                    console.error("Failed to fetch suggestions", error)
                } finally {
                    setIsLoadingSuggestions(false)
                }
            }
            fetchSuggestions()
        }
    }, [showForm, formData.period, activeTab])

    const applySuggestion = (percent: number) => {
        if (!suggestions) return
        const multiplier = 1 + (percent / 100)

        setFormData(prev => ({
            ...prev,
            revenueTarget: new Intl.NumberFormat('vi-VN').format(Math.round(suggestions.suggestions.revenue * multiplier)),
            profitTarget: new Intl.NumberFormat('vi-VN').format(Math.round(suggestions.suggestions.profit * multiplier)),
            ordersTarget: new Intl.NumberFormat('vi-VN').format(Math.round(suggestions.suggestions.orders * multiplier))
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const payload = {
            period: formData.period,
            type: activeTab,
            revenueTarget: parseNumber(formData.revenueTarget),
            profitTarget: parseNumber(formData.profitTarget),
            ordersTarget: parseNumber(formData.ordersTarget),
            details: formData.details.map(d => ({
                platform: d.platform,
                revenueTarget: parseNumber(d.revenueTarget),
                profitTarget: parseNumber(d.profitTarget),
                ordersTarget: parseNumber(d.ordersTarget)
            }))
        }

        await fetch('/api/goals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        mutateGoals()
        setShowForm(false)
    }

    // Render Logic
    const actual = progressData?.actual || { revenue: 0, profit: 0, orders: 0 }
    const channelPerformance = progressData?.channelPerformance || []
    const cumulativeData = progressData?.cumulativeData || []

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Mục tiêu</h2>
                    <p className="text-gray-500">Theo dõi tiến độ tăng trưởng.</p>
                </div>
                <div className="flex gap-4">
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        {['monthly', 'quarterly', 'yearly'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition capitalize ${activeTab === tab ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
                            >
                                {tab === 'monthly' ? 'Tháng' : tab === 'quarterly' ? 'Quý' : 'Năm'}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        <Target className="mr-2 h-4 w-4" /> {currentGoal ? "Cập nhật" : "Đặt mục tiêu"}
                    </button>
                </div>
            </div>

            {/* Main Progress Cards */}
            {currentGoal ? (
                <div className="grid gap-4 md:grid-cols-3">
                    <ProgressCard
                        title="Doanh thu"
                        current={actual.revenue}
                        target={currentGoal.revenueTarget}
                        icon={<DollarSign className="h-4 w-4" />}
                        color="blue"
                    />
                    <ProgressCard
                        title="Lợi nhuận"
                        current={actual.profit}
                        target={currentGoal.profitTarget}
                        icon={<TrendingUp className="h-4 w-4" />}
                        color="emerald"
                    />
                    <ProgressCard
                        title="Đơn hàng"
                        current={actual.orders}
                        target={currentGoal.ordersTarget}
                        icon={<ShoppingBag className="h-4 w-4" />}
                        color="purple"
                    />
                </div>
            ) : (
                <div className="p-8 text-center border-2 border-dashed rounded-xl bg-gray-50">
                    <p className="text-gray-500">Chưa có mục tiêu cho kỳ này.</p>
                    <button onClick={() => setShowForm(true)} className="mt-2 text-blue-600 font-medium">Đặt mục tiêu ngay</button>
                </div>
            )}

            {/* Charts */}
            {currentGoal && (
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Channel Performance */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border">
                        <h3 className="text-lg font-semibold mb-4">Hiệu quả theo kênh</h3>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={channelPerformance} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="platform" type="category" width={80} />
                                    <Tooltip formatter={(val: number) => new Intl.NumberFormat('vi-VN').format(val)} />
                                    <Legend />
                                    <Bar dataKey="actual.revenue" name="Thực tế" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                                    <Bar dataKey="target.revenue" name="Mục tiêu" fill="#e5e7eb" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Cumulative Progress (Monthly Only) */}
                    {activeTab === 'monthly' && (
                        <div className="bg-white p-6 rounded-xl shadow-sm border">
                            <h3 className="text-lg font-semibold mb-4">Tiến độ tích lũy (Tháng)</h3>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={cumulativeData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="day" />
                                        <YAxis tickFormatter={(val) => `${val / 1000000}M`} />
                                        <Tooltip formatter={(val: number) => new Intl.NumberFormat('vi-VN').format(val)} />
                                        <Legend />
                                        <Area type="monotone" dataKey="actual" name="Thực tế" fill="#3b82f6" stroke="#2563eb" fillOpacity={0.2} />
                                        <Line type="monotone" dataKey="plan" name="Kế hoạch" stroke="#9ca3af" strokeDasharray="5 5" dot={false} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Weekly Breakdown (Monthly Only) */}
            {activeTab === 'monthly' && progressData?.weeklyData && (
                <div className="bg-white p-6 rounded-xl shadow-sm border">
                    <h3 className="text-lg font-semibold mb-4">Tiến độ theo tuần</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {progressData.weeklyData.map((week: any, idx: number) => {
                            const revPercent = week.target.revenue > 0 ? (week.actual.revenue / week.target.revenue) * 100 : 0
                            const isCurrentWeek = new Date().getDate() >= (idx * 7 + 1) && new Date().getDate() <= (idx === 3 ? 31 : (idx + 1) * 7)

                            return (
                                <div key={idx} className={`p-4 rounded-lg border ${isCurrentWeek ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200' : 'border-gray-200 bg-gray-50'}`}>
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="font-semibold text-gray-700">{week.label}</span>
                                        {isCurrentWeek && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Hiện tại</span>}
                                    </div>

                                    <div className="space-y-3">
                                        {/* Revenue */}
                                        <div>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-gray-500">Doanh thu</span>
                                                <span className={revPercent >= 100 ? "text-emerald-600 font-bold" : "text-gray-700"}>
                                                    {new Intl.NumberFormat('vi-VN', { notation: "compact" }).format(week.actual.revenue)}
                                                    <span className="text-gray-400 font-normal"> / {new Intl.NumberFormat('vi-VN', { notation: "compact" }).format(week.target.revenue)}</span>
                                                </span>
                                            </div>
                                            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${revPercent >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                                    style={{ width: `${Math.min(revPercent, 100)}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Profit */}
                                        <div className="flex justify-between text-xs">
                                            <span className="text-gray-500">Lợi nhuận</span>
                                            <span className={week.actual.profit >= week.target.profit ? "text-emerald-600 font-bold" : "text-gray-700"}>
                                                {new Intl.NumberFormat('vi-VN', { notation: "compact" }).format(week.actual.profit)}
                                            </span>
                                        </div>

                                        {/* Orders */}
                                        <div className="flex justify-between text-xs">
                                            <span className="text-gray-500">Đơn hàng</span>
                                            <span className={week.actual.orders >= week.target.orders ? "text-emerald-600 font-bold" : "text-gray-700"}>
                                                {week.actual.orders} <span className="text-gray-400 font-normal">/ {Math.round(week.target.orders)}</span>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-bold mb-4">Đặt mục tiêu</h3>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Kỳ</label>
                                    <input
                                        type={activeTab === 'monthly' ? "month" : "text"}
                                        value={formData.period}
                                        onChange={e => setFormData({ ...formData, period: e.target.value })}
                                        className="w-full p-2 border rounded"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Suggestions Block */}
                            {suggestions && (
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-sm font-semibold text-blue-800 flex items-center">
                                            <TrendingUp className="w-4 h-4 mr-1" />
                                            Gợi ý từ dữ liệu {suggestions.period}
                                        </h4>
                                        {isLoadingSuggestions && <span className="text-xs text-blue-500">Đang tải...</span>}
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                                        <div>
                                            <span className="text-gray-500 block text-xs">Doanh thu thực tế</span>
                                            <span className="font-medium">{new Intl.NumberFormat('vi-VN', { notation: "compact" }).format(suggestions.suggestions.revenue)}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block text-xs">Lợi nhuận thực tế</span>
                                            <span className="font-medium">{new Intl.NumberFormat('vi-VN', { notation: "compact" }).format(suggestions.suggestions.profit)}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block text-xs">Đơn hàng thực tế</span>
                                            <span className="font-medium">{suggestions.suggestions.orders}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 flex-wrap">
                                        <button type="button" onClick={() => applySuggestion(0)} className="px-3 py-1 bg-white border border-blue-200 text-blue-700 rounded text-xs hover:bg-blue-50 transition">
                                            Giữ nguyên
                                        </button>
                                        <button type="button" onClick={() => applySuggestion(10)} className="px-3 py-1 bg-white border border-blue-200 text-blue-700 rounded text-xs hover:bg-blue-50 transition">
                                            Tăng trưởng 10%
                                        </button>
                                        <button type="button" onClick={() => applySuggestion(20)} className="px-3 py-1 bg-white border border-blue-200 text-blue-700 rounded text-xs hover:bg-blue-50 transition">
                                            Tăng trưởng 20%
                                        </button>
                                        {suggestions.suggestions.revenue > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const margin = suggestions.suggestions.profit / suggestions.suggestions.revenue
                                                    const currentRevenue = parseNumber(formData.revenueTarget)
                                                    if (currentRevenue > 0) {
                                                        const newProfit = Math.round(currentRevenue * margin)
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            profitTarget: new Intl.NumberFormat('vi-VN').format(newProfit)
                                                        }))
                                                    } else {
                                                        alert("Vui lòng nhập Doanh thu mục tiêu trước!")
                                                    }
                                                }}
                                                className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded text-xs hover:bg-emerald-100 transition"
                                            >
                                                Áp dụng Margin thực tế ({(suggestions.suggestions.profit / suggestions.suggestions.revenue * 100).toFixed(1)}%)
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Doanh thu</label>
                                    <input
                                        value={formData.revenueTarget}
                                        onChange={e => setFormData({ ...formData, revenueTarget: formatNumber(e.target.value) })}
                                        className="w-full p-2 border rounded"
                                        placeholder="Nhập mục tiêu..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Lợi nhuận</label>
                                    <input
                                        value={formData.profitTarget}
                                        onChange={e => setFormData({ ...formData, profitTarget: formatNumber(e.target.value) })}
                                        className="w-full p-2 border rounded"
                                        placeholder="Nhập mục tiêu..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Đơn hàng</label>
                                    <input
                                        value={formData.ordersTarget}
                                        onChange={e => setFormData({ ...formData, ordersTarget: formatNumber(e.target.value) })}
                                        className="w-full p-2 border rounded"
                                        placeholder="Nhập mục tiêu..."
                                    />
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <h4 className="font-medium mb-2">Chi tiết theo kênh</h4>
                                {formData.details.map((d, idx) => (
                                    <div key={d.platform} className="grid grid-cols-4 gap-4 mb-2 items-center">
                                        <div className="font-medium">{d.platform}</div>
                                        <input
                                            placeholder="Doanh thu"
                                            value={d.revenueTarget}
                                            onChange={e => handleDetailChange(idx, 'revenueTarget', e.target.value)}
                                            className="p-2 border rounded"
                                        />
                                        <input
                                            placeholder="Lợi nhuận"
                                            value={d.profitTarget}
                                            onChange={e => handleDetailChange(idx, 'profitTarget', e.target.value)}
                                            className="p-2 border rounded"
                                        />
                                        <input
                                            placeholder="Đơn hàng"
                                            value={d.ordersTarget}
                                            onChange={e => handleDetailChange(idx, 'ordersTarget', e.target.value)}
                                            className="p-2 border rounded"
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded">Hủy</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Lưu</button>
                            </div>
                        </form>
                    </div>
                </div >
            )
            }
        </div >
    )
}

function ProgressCard({ title, current, target, icon, color }: any) {
    const percent = target > 0 ? (current / target) * 100 : 0
    const isBehind = percent < 100 // Simple logic, can be time-based

    return (
        <div className="bg-white p-5 rounded-xl border shadow-sm">
            <div className="flex justify-between items-start mb-2">
                <div className="text-sm font-medium text-gray-500">{title}</div>
                <div className={`p-1.5 rounded-full bg-${color}-100 text-${color}-600`}>{icon}</div>
            </div>
            <div className="text-2xl font-bold">
                {new Intl.NumberFormat('vi-VN').format(current)}
                <span className="text-sm font-normal text-gray-400 ml-1">/ {new Intl.NumberFormat('vi-VN', { notation: "compact" }).format(target)}</span>
            </div>
            <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                    <span className={percent >= 100 ? "text-emerald-600 font-medium" : "text-gray-600"}>{percent.toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${percent >= 100 ? 'bg-emerald-500' : `bg-${color}-500`}`}
                        style={{ width: `${Math.min(percent, 100)}%` }}
                    />
                </div>
            </div>
        </div>
    )
}
