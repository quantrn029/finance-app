"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'
import { useState, useEffect } from "react"
import { TrendingDown } from "lucide-react"

interface WaterfallChartProps {
    revenue: number
    materials: number // Monthly material purchases
    platformFees: number
    adsSpend: number
    operating: number
    netProfit: number
}

export function WaterfallChart({ revenue, materials, platformFees, adsSpend, operating, netProfit }: WaterfallChartProps) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const grossProfit = revenue - materials
    const profitAfterFees = grossProfit - platformFees
    const profitAfterAds = profitAfterFees - adsSpend

    const data = [
        { name: 'Doanh thu\n(GMV)', value: revenue, cumulative: revenue, isProfit: true },
        { name: 'Nguyên vật liệu', value: -materials, cumulative: grossProfit, isProfit: false },
        { name: 'Lợi nhuận gộp', value: grossProfit, cumulative: grossProfit, isProfit: true },
        { name: 'Phí sàn', value: -platformFees, cumulative: profitAfterFees, isProfit: false },
        { name: 'Chi phí Ads', value: -adsSpend, cumulative: profitAfterAds, isProfit: false },
        { name: 'Chi phí vận hành', value: -operating, cumulative: netProfit, isProfit: false },
        { name: 'Lợi nhuận ròng', value: netProfit, cumulative: netProfit, isProfit: true }
    ]

    const formatCurrency = (val: number) =>
        `${(val / 1000000).toFixed(1)}M`

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload
            return (
                <div className="bg-white dark:bg-gray-800 p-3 border dark:border-gray-700 rounded shadow-lg">
                    <p className="font-medium dark:text-white">{data.name}</p>
                    <p className={`text-sm ${data.isProfit ? 'text-emerald-600' : 'text-red-600'}`}>
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Math.abs(data.value))}
                    </p>
                    <p className="text-xs text-muted-foreground dark:text-gray-400 mt-1">
                        Tích lũy: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(data.cumulative)}
                    </p>
                </div>
            )
        }
        return null
    }

    if (!mounted) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Phân tích chi tiết P&L (Waterfall)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] bg-muted/10 dark:bg-gray-800 animate-pulse rounded-lg" />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white">
                    <TrendingDown className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    Phân tích chi tiết P&L (Waterfall)
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                    Doanh thu → Chi phí → Lợi nhuận ròng
                </p>
            </CardHeader>
            <CardContent>
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="name"
                                angle={-15}
                                textAnchor="end"
                                height={80}
                                tick={{ fontSize: 11 }}
                            />
                            <YAxis
                                tickFormatter={formatCurrency}
                                tick={{ fontSize: 12 }}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <ReferenceLine y={0} stroke="#000" />
                            <Bar dataKey="cumulative" radius={[8, 8, 0, 0]}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.isProfit ? '#10b981' : '#ef4444'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t dark:border-gray-700">
                    <div>
                        <p className="text-xs text-muted-foreground dark:text-gray-400">Margin gộp</p>
                        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            {((grossProfit / revenue) * 100).toFixed(1)}%
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground dark:text-gray-400">CIR (Chi phí/DT)</p>
                        <p className={`text-sm font-bold ${(platformFees + adsSpend) / revenue > 0.35 ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
                            {(((platformFees + adsSpend) / revenue) * 100).toFixed(1)}%
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground dark:text-gray-400">Tỷ lệ NVL</p>
                        <p className="text-sm font-bold dark:text-white">
                            {((materials / revenue) * 100).toFixed(1)}%
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground dark:text-gray-400">Net Margin</p>
                        <p className={`text-sm font-bold ${netProfit > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {((netProfit / revenue) * 100).toFixed(1)}%
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
