"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowDownIcon, ArrowUpIcon, DollarSign, ShoppingCart, CreditCard, Wallet } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface FinancialSummaryProps {
    data: {
        revenue: { value: number; change: number }
        expenses: { value: number; change: number }
        profit: { value: number; change: number }
        netCash: { value: number; change: number }
    }
    comparisonMode: 'mom' | 'yoy'
    onDrillDown: (section: string) => void
}

export function FinancialSummary({ data, comparisonMode, onDrillDown }: FinancialSummaryProps) {
    if (!data) return null

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value)
    }

    const renderCard = (title: string, value: number, change: number, icon: React.ReactNode, type: 'positive' | 'negative' | 'neutral', section: string, description: string) => {
        const isPositive = change >= 0
        const changeColor = isPositive ? 'text-emerald-600' : 'text-rose-600'
        const changeIcon = isPositive ? <ArrowUpIcon className="h-4 w-4" /> : <ArrowDownIcon className="h-4 w-4" />

        return (
            <TooltipProvider key={section}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div
                            onClick={() => onDrillDown(section)}
                            className="bg-white dark:bg-gray-800 p-6 rounded-xl border dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-sm font-medium text-muted-foreground dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-1">
                                    {title}
                                    <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 rounded-full w-4 h-4 inline-flex items-center justify-center">?</span>
                                </p>
                                <div className={`p-2 rounded-full ${type === 'positive' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : type === 'negative' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'}`}>
                                    {icon}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-2xl font-bold dark:text-white">{formatCurrency(value)}</h3>
                                <div className={`flex items-center text-sm ${changeColor}`}>
                                    {changeIcon}
                                    <span className="font-medium">{Math.abs(change)}%</span>
                                    <span className="text-muted-foreground dark:text-gray-400 ml-1">
                                        vs {comparisonMode === 'mom' ? 'tháng trước' : 'cùng kỳ'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                        <p className="font-semibold mb-1">{title}</p>
                        <p className="text-sm text-gray-500">{description}</p>
                        <p className="text-xs text-blue-500 mt-2">Bấm để xem chi tiết</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )
    }

    return (
        <div className="grid gap-4 md:grid-cols-3">
            {renderCard(
                "Doanh thu",
                data.revenue.value,
                data.revenue.change,
                <DollarSign className="h-4 w-4" />,
                'neutral',
                'revenue',
                "Tổng giá trị đơn hàng đã bán (GMV) trừ đi đơn hủy/hoàn."
            )}
            {renderCard(
                "Chi phí (CIR)",
                data.expenses.value,
                data.expenses.change,
                <CreditCard className="h-4 w-4" />,
                'negative',
                'expenses',
                "Cost to Income Ratio: Tổng chi phí vận hành / Doanh thu. Chỉ số càng thấp càng tốt."
            )}
            {renderCard(
                "Lợi nhuận ròng",
                data.profit.value,
                data.profit.change,
                <Wallet className="h-4 w-4" />,
                'positive',
                'profit',
                "Net Profit = Doanh thu - Giá vốn - Chi phí vận hành - Thuế."
            )}
        </div>
    )
}
