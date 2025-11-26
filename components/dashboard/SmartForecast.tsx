"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react"

interface SmartForecastProps {
    currentRevenue: number
    projectedRevenue: number
    currentProfit: number
    projectedProfit: number
    revenueTarget: number
    profitTarget: number
    daysPassed: number
    totalDays: number
}

export function SmartForecast({
    currentRevenue,
    projectedRevenue,
    currentProfit,
    projectedProfit,
    revenueTarget,
    profitTarget,
    daysPassed,
    totalDays
}: SmartForecastProps) {
    const revenueAchievable = projectedRevenue >= revenueTarget
    const profitAchievable = projectedProfit >= profitTarget

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val)

    const percentVsTarget = ((projectedRevenue / revenueTarget) * 100).toFixed(1)

    return (
        <Card className="border-2 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white">
                    <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    Dự báo thông minh (Smart Forecast)
                </CardTitle>
                <p className="text-xs text-muted-foreground dark:text-gray-400">
                    Dựa trên tốc độ bán hàng hiện tại (Run-rate)
                </p>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border dark:border-gray-700">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs text-muted-foreground dark:text-gray-400 mb-1">Dự kiến cuối tháng</p>
                            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                {formatCurrency(projectedRevenue)}
                            </p>
                            <p className="text-xs text-muted-foreground dark:text-gray-400 mt-1">
                                {percentVsTarget}% so với target ({formatCurrency(revenueTarget)})
                            </p>
                        </div>
                        {revenueAchievable ? (
                            <CheckCircle2 className="h-8 w-8 text-emerald-500 dark:text-emerald-400" />
                        ) : (
                            <AlertCircle className="h-8 w-8 text-orange-500 dark:text-orange-400" />
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white dark:bg-gray-900 rounded p-3 border dark:border-gray-700">
                        <p className="text-xs text-muted-foreground dark:text-gray-400">Khả năng đạt Doanh thu</p>
                        <p className={`text-sm font-bold mt-1 ${revenueAchievable ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'}`}>
                            {revenueAchievable ? '✅ Cao' : '⚠️ Thấp'}
                        </p>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded p-3 border dark:border-gray-700">
                        <p className="text-xs text-muted-foreground dark:text-gray-400">Khả năng đạt Lợi nhuận</p>
                        <p className={`text-sm font-bold mt-1 ${profitAchievable ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'}`}>
                            {profitAchievable ? '✅ Cao' : '⚠️ Thấp'}
                        </p>
                    </div>
                </div>

                {!revenueAchievable && (
                    <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded p-3">
                        <p className="text-xs text-orange-800 dark:text-orange-200">
                            💡 Cần tăng {((revenueTarget / projectedRevenue - 1) * 100).toFixed(0)}% doanh thu để đạt target
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
