"use client"

import React from "react"
import { AlertTriangle, TrendingUp, TrendingDown, Info, DollarSign } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface InsightsAlertsProps {
    data: any[]
}

export function InsightsAlerts({ data }: InsightsAlertsProps) {
    // If no data passed from API, we can calculate some client-side alerts or just use what's passed
    // For now, let's assume the API returns a base list, and we augment it or just render it.
    // The previous implementation relied on API-generated alerts. 
    // Let's keep it flexible: render passed alerts, but also check for specific conditions if we had raw data here.
    // Since 'data' prop here IS the alerts array from API, we should probably move the logic to API 
    // OR update this component to accept raw financial data to calculate alerts on the fly.
    // Given the architecture, the API (/api/finance) is already generating alerts. 
    // Let's update the API to generate the SPECIFIC alerts requested by the user.
    // BUT, the user request implies we should do it here or in API. 
    // Let's stick to rendering what the API sends, but ensure the API sends the right stuff.
    // WAIT, I can't easily change the API logic without restarting the server/re-verifying.
    // Actually, I can just update the API route.

    // However, the prompt asked to "Implement specific rules" in the "Alert Area".
    // Let's assume the API is the source of truth for alerts.

    if (!data || data.length === 0) {
        return (
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Cảnh báo & Đề xuất</h3>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-700 text-center text-muted-foreground dark:text-gray-400 text-sm">
                    Chưa có cảnh báo nào cho giai đoạn này.
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Cảnh báo & Đề xuất</h3>
            <div className="space-y-3">
                {data.map((alert, index) => (
                    <div
                        key={index}
                        className={`p-4 rounded-lg border flex items-start gap-3 ${alert.color || 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}
                    >
                        <div className="mt-0.5">
                            {alert.type === 'danger' && <AlertTriangle className="h-5 w-5 text-rose-600" />}
                            {alert.type === 'warning' && <Info className="h-5 w-5 text-amber-600" />}
                            {alert.type === 'success' && <TrendingUp className="h-5 w-5 text-emerald-600" />}
                            {alert.type === 'info' && <DollarSign className="h-5 w-5 text-blue-600" />}
                        </div>
                        <div>
                            <h4 className={`text-sm font-semibold ${alert.type === 'danger' ? 'text-rose-700 dark:text-rose-400' :
                                alert.type === 'warning' ? 'text-amber-700 dark:text-amber-400' :
                                    alert.type === 'success' ? 'text-emerald-700 dark:text-emerald-400' :
                                        'text-blue-700 dark:text-blue-400'
                                }`}>
                                {alert.title}
                            </h4>
                            <p className={`text-sm mt-1 ${alert.type === 'danger' ? 'text-rose-600 dark:text-rose-300' :
                                alert.type === 'warning' ? 'text-amber-600 dark:text-amber-300' :
                                    alert.type === 'success' ? 'text-emerald-600 dark:text-emerald-300' :
                                        'text-blue-600 dark:text-blue-300'
                                }`}>
                                {alert.description}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
