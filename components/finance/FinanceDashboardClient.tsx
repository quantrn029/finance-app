"use client"

import { useState, useEffect } from "react"
import { FinancialSummary } from "@/components/finance/FinancialSummary"
import { PnLTable } from "@/components/finance/PnLTable"
import { FinanceChart } from "@/components/finance/FinanceChart"
import { MoMComparison } from "@/components/finance/MoMComparison"
import { InsightsAlerts } from "@/components/finance/InsightsAlerts"
import { TimePeriodFilter, getPeriodRange } from "@/components/TimePeriodFilter"
import { DateRange } from "react-day-picker"
import { startOfMonth, endOfMonth } from "date-fns"
import { useRouter } from "next/navigation"
import { OnboardingTour } from "@/components/ui/tour"
import { NumberFormatterProvider } from "@/components/ui/number-formatter"
import useSWR from 'swr'
import { Loader2 } from "lucide-react"

interface FinanceDashboardClientProps {
    initialData: any
    initialPeriod?: string
    initialDateRange?: { from: Date, to: Date }
}

const fetcher = (url: string) => fetch(url).then(r => {
    if (!r.ok) throw new Error('Failed to fetch data')
    return r.json()
})

export function FinanceDashboardClient({ initialData, initialPeriod = 'this_month', initialDateRange }: FinanceDashboardClientProps) {
    const router = useRouter()
    const [period, setPeriod] = useState(initialPeriod)
    const [dateRange, setDateRange] = useState<DateRange | undefined>(
        initialDateRange || {
            from: startOfMonth(new Date()),
            to: endOfMonth(new Date()),
        }
    )
    const [comparisonMode, setComparisonMode] = useState<'mom' | 'yoy'>('mom')
    const [hasUserInteracted, setHasUserInteracted] = useState(false)

    // Load default period from localStorage on mount
    useEffect(() => {
        const savedPeriod = localStorage.getItem("defaultTimePeriod")
        if (savedPeriod && ['today', 'week', 'month', 'year', 'all'].includes(savedPeriod)) {
            if (savedPeriod === 'today') {
                setPeriod('today')
                setDateRange({ from: new Date(), to: new Date() })
                setHasUserInteracted(true)
            } else if (savedPeriod === 'year') {
                setPeriod('this_year')
                setDateRange({ from: startOfMonth(new Date(new Date().getFullYear(), 0, 1)), to: endOfMonth(new Date()) })
                setHasUserInteracted(true)
            } else if (savedPeriod === 'all') {
                setPeriod('all')
                setDateRange({ from: new Date('2020-01-01'), to: new Date() })
                setHasUserInteracted(true)
            } else if (savedPeriod === 'month') {
                setPeriod('this_month')
                setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) })
                // Default, no interaction needed if props match
            }
        }
    }, [])

    // Construct Query
    const queryParams = new URLSearchParams({
        period,
        comparison: comparisonMode
    })

    // Calculate range from period if not custom, or use dateRange
    // Note: The API expects 'from' and 'to'. 
    // We should ensure dateRange is synced with period before fetching, or calculate it here.
    // The TimePeriodFilter component updates dateRange when period changes.
    // So we can rely on dateRange.
    if (dateRange?.from && dateRange?.to) {
        queryParams.append('from', dateRange.from.toISOString())
        queryParams.append('to', dateRange.to.toISOString())
    }

    const { data, error, isLoading } = useSWR(
        `/api/finance?${queryParams.toString()}`,
        fetcher,
        {
            fallbackData: hasUserInteracted ? undefined : initialData,
            revalidateOnFocus: false,
            dedupingInterval: 60000,
            keepPreviousData: true
        }
    )

    const handleDrillDown = (metric: string) => {
        if (metric === 'revenue' || metric === 'profit') {
            router.push('/orders')
        } else if (metric === 'cir') {
            router.push('/expenses')
        }
    }

    // Wrappers to track interaction
    const handlePeriodChange = (p: any) => {
        setPeriod(p)
        setHasUserInteracted(true)
    }
    const handleDateRangeChange = (r: DateRange | undefined) => {
        setDateRange(r)
        setHasUserInteracted(true)
    }
    const handleComparisonChange = (mode: 'mom' | 'yoy') => {
        setComparisonMode(mode)
        setHasUserInteracted(true)
    }

    if (error) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="text-red-500">Failed to load data</div>
            </div>
        )
    }

    if (!data) return null

    return (
        <NumberFormatterProvider>
            <div className="p-8 space-y-8">
                <OnboardingTour />

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Tổng quan tài chính</h2>
                        <p className="text-muted-foreground text-gray-500 dark:text-gray-400">
                            Theo dõi hiệu quả kinh doanh và dòng tiền theo thời gian thực.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                            <button
                                onClick={() => handleComparisonChange('mom')}
                                className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${comparisonMode === 'mom' ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
                            >
                                So với tháng trước
                            </button>
                            <button
                                onClick={() => handleComparisonChange('yoy')}
                                className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${comparisonMode === 'yoy' ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
                            >
                                So với cùng kỳ
                            </button>
                        </div>
                        <TimePeriodFilter
                            period={period as any}
                            setPeriod={handlePeriodChange}
                            dateRange={dateRange}
                            setDateRange={handleDateRangeChange}
                        />
                    </div>
                </div>

                {/* Loading Indicator */}
                {isLoading && hasUserInteracted && (
                    <div className="fixed top-4 right-4 z-50">
                        <div className="bg-white dark:bg-gray-800 p-2 rounded-full shadow-lg border animate-pulse">
                            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        </div>
                    </div>
                )}

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
                    </div>
                </div>
            </div>
        </NumberFormatterProvider>
    )
}
