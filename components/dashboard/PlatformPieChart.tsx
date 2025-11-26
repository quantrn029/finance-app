"use client"

import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { Order } from '@prisma/client'

interface PlatformPieChartProps {
    orders: Order[]
}

const COLORS = ['#f97316', '#000000'] // Orange for Shopee, Black for TikTok

export function PlatformPieChart({ orders }: PlatformPieChartProps) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    // Group orders by platform
    const platformData = orders.reduce((acc: any[], order) => {
        const existing = acc.find(item => item.name === order.platform)
        if (existing) {
            existing.value += order.revenue
        } else {
            acc.push({ name: order.platform, value: order.revenue })
        }
        return acc
    }, [])

    if (!mounted) {
        return <div className="h-[300px] w-full bg-muted/10 animate-pulse rounded-lg" />
    }

    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={platformData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => entry.name}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                    >
                        {platformData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip formatter={(value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value as number)} />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </div>
    )
}
