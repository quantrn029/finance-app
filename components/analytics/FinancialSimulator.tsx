"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calculator } from "lucide-react"

interface FinancialSimulatorProps {
    currentRevenue: number
    currentProfit: number
}

export function FinancialSimulator({ currentRevenue, currentProfit }: FinancialSimulatorProps) {
    const [targetRevenue, setTargetRevenue] = useState(currentRevenue * 1.2) // Default 20% growth
    const [targetMargin, setTargetMargin] = useState(currentRevenue > 0 ? (currentProfit / currentRevenue) * 100 : 20)

    const projectedProfit = targetRevenue * (targetMargin / 100)
    const additionalRevenueNeeded = Math.max(0, targetRevenue - currentRevenue)

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val)

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-medium">
                    Giả lập Tài chính
                </CardTitle>
                <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <div className="flex justify-between">
                        <Label>Mục tiêu Doanh thu</Label>
                        <span className="font-bold text-emerald-600">{formatCurrency(targetRevenue)}</span>
                    </div>
                    <Slider
                        value={[targetRevenue]}
                        min={0}
                        max={currentRevenue * 3 || 100000000}
                        step={1000000}
                        onValueChange={(vals) => setTargetRevenue(vals[0])}
                    />
                    <p className="text-xs text-muted-foreground">
                        Cần thêm: {formatCurrency(additionalRevenueNeeded)}
                    </p>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between">
                        <Label>Tỷ suất Lợi nhuận (%)</Label>
                        <span className="font-bold">{targetMargin.toFixed(1)}%</span>
                    </div>
                    <Slider
                        value={[targetMargin]}
                        min={0}
                        max={100}
                        step={0.5}
                        onValueChange={(vals) => setTargetMargin(vals[0])}
                    />
                </div>

                <div className="pt-4 border-t space-y-2">
                    <div className="flex justify-between items-center">
                        <Label className="text-muted-foreground">Lợi nhuận mục tiêu</Label>
                        <span className="text-xl font-bold text-emerald-600">
                            {formatCurrency(projectedProfit)}
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
