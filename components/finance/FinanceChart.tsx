"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, Line, ComposedChart, CartesianGrid } from "recharts"

interface FinanceChartProps {
    data: {
        date: string
        inflow: number
        outflow: number
        net: number
    }[]
}

export function FinanceChart({ data }: FinanceChartProps) {
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border dark:border-gray-700 shadow-sm">
            <div className="mb-6">
                <h3 className="text-lg font-semibold dark:text-white">Biểu đồ tài chính</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Theo dõi Doanh thu, Chi phí và Lợi nhuận theo thời gian</p>
            </div>
            <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis
                            dataKey="date"
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                        />
                        <Tooltip
                            formatter={(value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        />
                        <Legend />
                        <Bar dataKey="inflow" name="Thực nhận" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        <Bar dataKey="outflow" name="Chi phí" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        <Line type="monotone" dataKey="net" name="Lợi nhuận ròng" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
