"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, Target } from "lucide-react"

interface TargetsCardProps {
    revenueTarget: number
    revenueCurrent: number
    profitTarget: number
    profitCurrent: number
    ordersTarget: number
    ordersCurrent: number
    daysPassed: number
    totalDays: number
}

export function TargetsCard({
    revenueTarget,
    revenueCurrent,
    profitTarget,
    profitCurrent,
    ordersTarget,
    ordersCurrent,
    daysPassed,
    totalDays
}: TargetsCardProps) {
    const revenueProgress = Math.min((revenueCurrent / revenueTarget) * 100, 100)
    const profitProgress = Math.min((profitCurrent / profitTarget) * 100, 100)
    const ordersProgress = Math.min((ordersCurrent / ordersTarget) * 100, 100)
    const timeProgress = (daysPassed / totalDays) * 100

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val)

    return (
        <Card className="border-2">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white">
                    <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    Mục tiêu Tháng (Targets)
                </CardTitle>
                <p className="text-xs text-muted-foreground dark:text-gray-400">
                    Tiến độ thực hiện so với kế hoạch • Ngày {daysPassed}/{totalDays}
                </p>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Revenue */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium dark:text-white">Doanh thu</span>
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{revenueProgress.toFixed(1)}%</span>
                    </div>
                    <Progress value={revenueProgress} className="h-3" />
                    <div className="flex justify-between mt-1">
                        <span className="text-xs text-muted-foreground dark:text-gray-400">{formatCurrency(revenueCurrent)}</span>
                        <span className="text-xs text-muted-foreground dark:text-gray-400">Mục tiêu: {formatCurrency(revenueTarget)}</span>
                    </div>
                    {revenueProgress < timeProgress && (
                        <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">⚠️ Cần thêm {formatCurrency((revenueTarget * timeProgress / 100) - revenueCurrent)} để đúng tiến độ</p>
                    )}
                </div>

                {/* Profit */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium dark:text-white">Lợi nhuận ròng</span>
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{profitProgress.toFixed(1)}%</span>
                    </div>
                    <Progress value={profitProgress} className="h-3 bg-emerald-100 dark:bg-emerald-900/30" />
                    <div className="flex justify-between mt-1">
                        <span className="text-xs text-muted-foreground dark:text-gray-400">{formatCurrency(profitCurrent)}</span>
                        <span className="text-xs text-muted-foreground dark:text-gray-400">Mục tiêu: {formatCurrency(profitTarget)}</span>
                    </div>
                </div>

                {/* Orders */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium dark:text-white">Số đơn hàng</span>
                        <span className="text-sm font-bold text-purple-600 dark:text-purple-400">{ordersProgress.toFixed(1)}%</span>
                    </div>
                    <Progress value={ordersProgress} className="h-3 bg-purple-100 dark:bg-purple-900/30" />
                    <div className="flex justify-between mt-1">
                        <span className="text-xs text-muted-foreground dark:text-gray-400">{ordersCurrent} đơn</span>
                        <span className="text-xs text-muted-foreground dark:text-gray-400">Mục tiêu: {ordersTarget} đơn</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
