"use client"

import { AlertCircle, Info, TrendingDown } from "lucide-react"

interface AlertsProps {
    alerts: {
        type: 'warning' | 'info' | 'danger'
        title: string
        message: string
    }[]
}

export function AlertsSection({ alerts }: AlertsProps) {
    if (alerts.length === 0) return null

    return (
        <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2 dark:text-white">
                <AlertCircle className="h-4 w-4" />
                Cảnh báo tài chính
            </h3>
            {alerts.map((alert, i) => (
                <div
                    key={i}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${alert.type === 'danger' ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' :
                        alert.type === 'warning' ? 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800' :
                            'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                        }`}
                >
                    {alert.type === 'danger' && <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />}
                    {alert.type === 'warning' && <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />}
                    {alert.type === 'info' && <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />}
                    <div className="flex-1">
                        <p className="text-sm font-medium dark:text-white">{alert.title}</p>
                        <p className="text-xs text-muted-foreground dark:text-gray-400 mt-0.5">{alert.message}</p>
                    </div>
                </div>
            ))}
        </div>
    )
}

// Helper function to generate alerts
export function generateAlerts(data: {
    cir: number,
    orderDropPercent: number,
    materialsRatio: number
}) {
    const alerts: { type: 'warning' | 'info' | 'danger', title: string, message: string }[] = []

    // CIR Alert
    if (data.cir > 35) {
        alerts.push({
            type: 'warning',
            title: `⚠️ CIR cao: ${data.cir.toFixed(1)}%`,
            message: `Chi phí quảng cáo + phí sàn đạt ${data.cir.toFixed(1)}% doanh thu (Target < 25%). Cần tối ưu Ads hoặc tăng doanh thu thực.`
        })
    }

    // Order Drop Alert
    if (data.orderDropPercent > 20) {
        alerts.push({
            type: 'danger',
            title: `🚨 Đơn hàng giảm mạnh: ${data.orderDropPercent.toFixed(1)}%`,
            message: `Số đơn giảm ${data.orderDropPercent.toFixed(1)}% so với tuần trước. Kiểm tra chiến dịch marketing và kho hàng.`
        })
    }

    // Materials cost alert
    if (data.materialsRatio > 60) {
        alerts.push({
            type: 'warning',
            title: `⚠️ Chi phí nguyên vật liệu cao: ${data.materialsRatio.toFixed(1)}%`,
            message: `NVL chiếm ${data.materialsRatio.toFixed(1)}% doanh thu. Cân nhắc tối ưu chi phí hoặc tăng giá bán.`
        })
    }

    return alerts
}
