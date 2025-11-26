"use client"

import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Order } from '@prisma/client'

interface RevenueChartProps {
    orders: Order[]
}

export function RevenueChart({ orders }: RevenueChartProps) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    // Group orders by date and calculate revenue/profit
    const chartData = orders.reduce((acc: any[], order) => {
        const date = new Date(order.date).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' })
        const existing = acc.find(item => item.date === date)

        if (existing) {
            existing.revenue += order.revenue
            existing.profit += order.netPayout
        } else {
            acc.push({
                date,
                revenue: order.revenue,
                profit: order.netPayout
            })
        }
        return acc
    }, [])

    if (!mounted) {
        return <div className="h-[300px] w-full bg-muted/10 animate-pulse rounded-lg" />
    }

    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={chartData}
                    margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value as number)} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" name="Doanh thu" stroke="#2563eb" activeDot={{ r: 8 }} />
                    <Line type="monotone" dataKey="profit" name="Lợi nhuận ròng" stroke="#16a34a" />
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}
