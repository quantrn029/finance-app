"use client"

import React from "react"
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

export function PnLWaterfall({ data }: { data: any[] }) {
    if (!data) return null

    // Process data for waterfall
    // We need to calculate 'start' for each bar to make it float
    let currentTotal = 0
    const processedData = data.map((item, index) => {
        if (index === 0) {
            // Revenue
            currentTotal = item.value
            return { ...item, start: 0 }
        } else if (index === data.length - 1) {
            // Net Profit (Final)
            return { ...item, start: 0 }
        } else {
            // Expenses (Negative)
            // For a negative step in waterfall, the bar sits ON TOP of the remaining value
            // So Start = CurrentTotal - ItemValue
            const start = currentTotal - item.value
            currentTotal = start
            return { ...item, start: start }
        }
    })

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">P&L chi tiết</h2>
                {/* Metrics can be calculated or passed if needed, hiding for now or using static/computed */}
            </div>
            <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={processedData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value / 1000}k`} />
                        <Tooltip
                            cursor={{ fill: 'transparent' }}
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                        <div className="bg-white p-2 border rounded shadow-sm text-sm">
                                            <p className="font-bold">{data.name}</p>
                                            <p>Value: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(data.value)}</p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        {/* Transparent base bar to lift the actual bar */}
                        <Bar dataKey="start" stackId="a" fill="transparent" />
                        {/* Actual value bar */}
                        <Bar dataKey="value" stackId="a" radius={[4, 4, 4, 4]} barSize={40}>
                            {
                                processedData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={
                                            entry.type === "positive" ? "#2dd4bf" : // Teal for Revenue
                                                entry.type === "negative" ? "#fb7185" : // Red for expenses
                                                    "#3b82f6" // Blue for Net Profit (Total)
                                        }
                                    />
                                ))
                            }
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
