"use client"

import { useState, useEffect } from "react"
import { FinancialSummary } from "@/components/finance/FinancialSummary"
import { PnLTable } from "@/components/finance/PnLTable"
import { FinanceChart } from "@/components/finance/FinanceChart"
import { MoMComparison } from "@/components/finance/MoMComparison"
import { InsightsAlerts } from "@/components/finance/InsightsAlerts"
import { TimePeriodFilter } from "@/components/TimePeriodFilter"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { DateRange } from "react-day-picker"
import { startOfMonth, endOfMonth, subMonths } from "date-fns"
import { useRouter } from "next/navigation"
import { OnboardingTour } from "@/components/ui/tour"
import { NumberFormatterProvider } from "@/components/ui/number-formatter"

export default function FinanceDashboard() {
    const router = useRouter()
    const [period, setPeriod] = useState("this_month")
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    })

    // Comparison Mode State
    const [comparisonMode, setComparisonMode] = useState<'mom' | 'yoy'>('mom')

    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const savedPeriod = localStorage.getItem("defaultTimePeriod")
        if (savedPeriod && ['today', 'week', 'month', 'year', 'all'].includes(savedPeriod)) {
            if (savedPeriod === 'today') {
                setPeriod('today')
                setDateRange({ from: new Date(), to: new Date() })
            } else if (savedPeriod === 'year') {
                setPeriod('this_year')
                setDateRange({ from: startOfMonth(new Date(new Date().getFullYear(), 0, 1)), to: endOfMonth(new Date()) })
            } else if (savedPeriod === 'all') {
                setPeriod('all')
                setDateRange({ from: new Date('2020-01-01'), to: new Date() })
            } else {
                // Default to month (this_month)
                setPeriod('this_month')
                setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) })
            }
        }
    }, [])

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            try {
                const queryParams = new URLSearchParams({
                    period,
                    comparison: comparisonMode
                })

                if (dateRange?.from && dateRange?.to) {
                    queryParams.append('from', dateRange.from.toISOString())
                    queryParams.append('to', dateRange.to.toISOString())
                }

                const res = await fetch(`/api/finance?${queryParams}`)
                const json = await res.json()
                setData(json)
            } catch (error) {
                console.error("Failed to fetch finance data:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [period, dateRange, comparisonMode])

    const handleDrillDown = (metric: string) => {
        if (metric === 'revenue' || metric === 'profit') {
            router.push('/orders')
        } else if (metric === 'cir') {
            router.push('/expenses')
        }
    }

    return (
        <NumberFormatterProvider>
            <div className="p-8 space-y-8">
                <OnboardingTour />

                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Tổng quan tài chính</h2>
                        <p className="text-muted-foreground text-gray-500 dark:text-gray-400">
                            Theo dõi hiệu quả kinh doanh và dòng tiền theo thời gian thực.
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                            <button
                                onClick={() => setComparisonMode('mom')}
                                className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${comparisonMode === 'mom' ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
                            >
                                So với tháng trước
                            </button>
                            <button
                                onClick={() => setComparisonMode('yoy')}
                                className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${comparisonMode === 'yoy' ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
                            >
                                So với cùng kỳ
                            </button>
                        </div>
                        <TimePeriodFilter
                            period={period}
                            setPeriod={setPeriod}
                            dateRange={dateRange}
                            setDateRange={setDateRange}
                        />
                    </div>
                </div>

                {loading || !data ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : (
                    <>
                        <FinancialSummary
                            data={data.summary}
                            comparisonMode={comparisonMode}
                            onDrillDown={handleDrillDown}
                        />

                        {data.pnl && (
                            <div className="mb-6">
                                <PnLTable data={data.pnl} />
                            </div>
                        )}

                        <div className="grid gap-6 md:grid-cols-7">
                            <div className="md:col-span-4 space-y-6">
                                <FinanceChart data={data.timeline} />
                                <MoMComparison data={data.comparison} />
                            </div>
                            <div className="md:col-span-3 space-y-6">
                                <InsightsAlerts data={data.alerts} />
                                {/* Placeholder for future widgets like Top Products or Expense Breakdown */}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </NumberFormatterProvider>
    )
}
