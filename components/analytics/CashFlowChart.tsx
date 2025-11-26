"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'
import { CashFlowData } from "@/lib/analytics"

interface CashFlowChartProps {
    data: CashFlowData[]
}

export function CashFlowChart({ data }: CashFlowChartProps) {
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val)

    if (!mounted) {
        return (
            <Card className="col-span-2">
                <CardHeader>
                    <CardTitle>Dòng tiền (Cash Flow)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[350px] w-full bg-muted/10 animate-pulse rounded-lg" />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="col-span-2">
            <CardHeader>
                <CardTitle>Dòng tiền (Cash Flow)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="date"
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontSize: 12 }}
                            />
                            <YAxis
                                tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`}
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontSize: 12 }}
                            />
                            <Tooltip
                                formatter={(value: number) => formatCurrency(value)}
                                labelStyle={{ color: '#666' }}
                            />
                            <Legend />
                            <ReferenceLine y={0} stroke="#000" />
                            <Bar
                                dataKey="inflow"
                                name="Tiền vào (Doanh thu)"
                                fill="#10b981"
                                radius={[4, 4, 0, 0]}
                            />
                            <Bar
                                dataKey="outflow"
                                name="Tiền ra (Chi phí)"
                                fill="#ef4444"
                                radius={[4, 4, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
