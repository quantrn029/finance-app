
"use client"

import React from "react"
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, Cell } from "recharts"

export function CashFlowTimeline({ data }: { data: any[] }) {
    if (!data) return null

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Dòng tiền</h2>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-emerald-400" /> Inflow
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-rose-400" /> Outflow
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-gray-800" /> Net
                    </div>
                </div>
            </div>
            <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
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
                            tickFormatter={(value) => `${value / 1000} k`}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #e5e7eb", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                            cursor={{ fill: 'transparent' }}
                            formatter={(value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)}
                        />
                        <Bar dataKey="inflow" fill="#34d399" radius={[4, 4, 0, 0]} barSize={20} stackId="a" name="Inflow" />
                        <Bar dataKey="outflow" fill="#fb7185" radius={[4, 4, 0, 0]} barSize={20} stackId="b" name="Outflow" />
                        {/* Note: User image shows Inflow and Outflow side-by-side or stacked? 
                            Image shows Inflow (Teal) and Outflow (Red) bars, and a Net line.
                            Actually, looking closely at the image "Dòng tiền", it has bars for Inflow/Outflow? 
                            No, the image shows bars that are mostly Teal, some Red. 
                            And a line chart overlay.
                            Let's assume Inflow = Positive Bar, Outflow = Negative Bar? 
                            Or Inflow and Outflow as separate bars.
                            The image legend says "Inflow", "Outflow", "Net".
                            The bars seem to be Net Cash? Some are teal (positive), some red (negative).
                            And the Line is... Cumulative? Or maybe the Line is Net and Bars are something else?
                            Wait, the image shows:
                            Bars: Green and Red.
                            Line: Black with dots.
                            Legend: Inflow (Teal Dot), Outflow (Black Dot), Net (Black Dot?).
                            Actually, let's look at the "Dòng tiền" chart in the image again.
                            It has Teal bars and Red bars.
                            The line connects dots.
                            It looks like the Bars are the Net Cash Flow (Green for +, Red for -).
                            And the Line might be the cumulative balance? Or Inflow/Outflow trends?
                            Let's stick to a standard interpretation that is useful:
                            Bars = Net Cash (Green +, Red -).
                            Line = Cumulative Cash Balance? Or maybe Inflow?
                            
                            Re-reading requirements:
                            "Biểu đồ dạng cột (bar chart): Inflow (Thu vào), Outflow (Chi ra), Net Cash (dòng tiền ròng)"
                            This implies 3 metrics.
                            Let's do:
                            Bars for Inflow (Green) and Outflow (Red) side-by-side?
                            Or Stacked?
                            Let's try a composed chart:
                            Bars for Inflow and Outflow.
                            Line for Net Cash.
                            
                            Actually, looking at the image provided by user (uploaded_image_1764060722917.png):
                            The "Dòng tiền" chart has:
                            - Bars that are Teal (positive) and Red (negative). This strongly suggests Bars = Net Cash.
                            - A Line that hovers around.
                            - Legend says: Inflow (Teal), Outflow (Black), Net (Black). This is confusing in the image.
                            
                            Let's follow the text requirement: "Biểu đồ dạng cột (bar chart): Inflow, Outflow, Net Cash".
                            I will implement:
                            - Bar: Inflow (Green)
                            - Bar: Outflow (Red)
                            - Line: Net Cash (Black)
                            This is clear and informative.
                        */}
                        <Bar dataKey="net" fill="#2dd4bf" radius={[4, 4, 0, 0]} barSize={30}>
                            {
                                data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.net > 0 ? '#2dd4bf' : '#f43f5e'} />
                                ))
                            }
                        </Bar>
                        <Line type="monotone" dataKey="net" stroke="#1f2937" strokeWidth={2} dot={{ r: 4, fill: "#1f2937" }} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
