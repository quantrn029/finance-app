"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { format, addMonths, startOfMonth } from "date-fns"
import { ArrowLeft, TrendingUp, Calendar, CheckCircle, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MonthlyMetric, SeasonalityInsight, KPISuggestion, aggregateMonthlyData, detectSeasonality, generateSuggestions } from "@/lib/kpi-logic"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

interface KPISuggestionClientProps {
    initialOrders: any[]
}

export function KPISuggestionClient({ initialOrders }: KPISuggestionClientProps) {
    const router = useRouter()
    const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month')
    const [targetDate, setTargetDate] = useState<Date>(addMonths(startOfMonth(new Date()), 1)) // Default next month

    // Process Data
    const { monthlyData, seasonality, suggestions } = useMemo(() => {
        const monthly = aggregateMonthlyData(initialOrders)
        const seasonal = detectSeasonality(monthly)
        const suggs = generateSuggestions(monthly, targetDate, seasonal)
        return { monthlyData: monthly, seasonality: seasonal, suggestions: suggs }
    }, [initialOrders, targetDate])

    // Chart Data: Last 12 months + Target
    const chartData = useMemo(() => {
        const history = monthlyData.slice(-12).map(m => ({
            name: format(m.date, 'MM/yy'),
            revenue: m.revenue,
            type: 'history'
        }))

        // Add target point (using Moderate as default visualization)
        const moderate = suggestions.find(s => s.type === 'moderate')
        if (moderate) {
            history.push({
                name: format(targetDate, 'MM/yy'),
                revenue: moderate.revenueTarget,
                type: 'target'
            })
        }
        return history
    }, [monthlyData, suggestions, targetDate])

    const handleApply = (suggestion: KPISuggestion) => {
        // Encode params to pass to Goal Creation page
        const params = new URLSearchParams({
            revenue: suggestion.revenueTarget.toString(),
            profit: suggestion.profitTarget.toString(),
            orders: suggestion.ordersTarget.toString(),
            period: selectedPeriod,
            date: format(targetDate, 'yyyy-MM-dd')
        })
        router.push(`/goals?create=true&${params.toString()}`)
    }

    const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val)

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Quay lại
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gợi ý KPI Thông minh</h1>
                    <p className="text-muted-foreground">Phân tích dữ liệu lịch sử để đề xuất mục tiêu phù hợp.</p>
                </div>
            </div>

            {/* Configuration */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-blue-500" />
                        Cấu hình Phân tích
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex gap-4 items-end">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Kỳ mục tiêu</label>
                        <select
                            value={selectedPeriod}
                            onChange={(e) => setSelectedPeriod(e.target.value as any)}
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
                        >
                            <option value="month">Tháng</option>
                            <option value="quarter" disabled>Quý (Coming Soon)</option>
                            <option value="year" disabled>Năm (Coming Soon)</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Thời gian</label>
                        <input
                            type="month"
                            value={format(targetDate, 'yyyy-MM')}
                            onChange={(e) => setTargetDate(new Date(e.target.value))}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Suggestions Grid */}
            <div className="grid gap-6 md:grid-cols-3">
                {suggestions.map((s) => (
                    <Card key={s.type} className={`relative overflow-hidden border-2 transition-all hover:shadow-lg ${s.type === 'moderate' ? 'border-blue-500 bg-blue-50/10' :
                        s.type === 'aggressive' ? 'border-purple-500 bg-purple-50/10' :
                            'border-green-500 bg-green-50/10'
                        }`}>
                        <div className={`absolute top-0 right-0 px-3 py-1 text-xs font-bold text-white rounded-bl-lg ${s.type === 'moderate' ? 'bg-blue-500' :
                            s.type === 'aggressive' ? 'bg-purple-500' :
                                'bg-green-500'
                            }`}>
                            {s.label}
                        </div>
                        <CardHeader>
                            <CardTitle className="text-2xl font-bold text-center mt-4">
                                {formatCurrency(s.revenueTarget)}
                            </CardTitle>
                            <CardDescription className="text-center font-medium text-gray-900 dark:text-white">
                                Doanh thu mục tiêu
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <div className="text-sm text-gray-500 mb-1">Doanh thu</div>
                                <div className="text-xl font-bold text-gray-900">
                                    {new Intl.NumberFormat('vi-VN').format(s.revenueTarget)} <span className="text-xs font-normal text-gray-500">đ</span>
                                </div>
                                <div className="text-xs text-gray-400 mt-1">
                                    AOV: {new Intl.NumberFormat('vi-VN').format(s.aovTarget)} đ
                                </div>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <div className="text-sm text-gray-500 mb-1">Lợi nhuận</div>
                                <div className="text-xl font-bold text-emerald-600">
                                    {new Intl.NumberFormat('vi-VN').format(s.profitTarget)} <span className="text-xs font-normal text-gray-500">đ</span>
                                </div>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <div className="text-sm text-gray-500 mb-1">Đơn hàng</div>
                                <div className="text-xl font-bold text-blue-600">
                                    {new Intl.NumberFormat('vi-VN').format(s.ordersTarget)}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold flex items-center">
                                    <TrendingUp className="h-4 w-4 mr-2 text-gray-500" />
                                    Cơ sở đề xuất:
                                </h4>
                                <ul className="space-y-1">
                                    {s.reasoning.map((r, i) => (
                                        <li key={i} className="text-sm text-muted-foreground flex items-start">
                                            <CheckCircle className="h-3 w-3 mr-2 mt-1 text-green-500 flex-shrink-0" />
                                            {r}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <Button
                                className={`w-full ${s.type === 'moderate' ? 'bg-blue-600 hover:bg-blue-700' :
                                    s.type === 'aggressive' ? 'bg-purple-600 hover:bg-purple-700' :
                                        'bg-green-600 hover:bg-green-700'
                                    }`}
                                onClick={() => handleApply(s)}
                            >
                                Áp dụng Mục tiêu này
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Analysis Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>Xu hướng & Dự báo</CardTitle>
                    <CardDescription>So sánh hiệu quả 12 tháng qua với mục tiêu đề xuất.</CardDescription>
                </CardHeader>
                <CardContent className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" />
                            <YAxis tickFormatter={(val) => `${val / 1000000}M`} />
                            <Tooltip formatter={(val: number) => formatCurrency(val)} />
                            <Line
                                type="monotone"
                                dataKey="revenue"
                                stroke="#2563eb"
                                strokeWidth={2}
                                dot={{ r: 4 }}
                                activeDot={{ r: 8 }}
                            />
                            {/* Visual indicator for target */}
                            <ReferenceLine x={format(targetDate, 'MM/yy')} stroke="red" strokeDasharray="3 3" label="Target" />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    )
}
