"use client"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format, subDays, startOfYear, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfWeek, endOfWeek, subMonths } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

export type TimePeriod = 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'all' | 'custom' | 'month' | 'week' | 'year' | 'today'

export function getPeriodRange(period: TimePeriod, date: Date = new Date()): { from: Date, to: Date } {
    const now = new Date()
    switch (period) {
        case 'this_month':
        case 'month':
            return { from: startOfMonth(date), to: endOfMonth(date) }
        case 'last_month':
            const lastMonth = subMonths(now, 1)
            return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) }
        case 'this_quarter':
            return { from: startOfQuarter(now), to: endOfQuarter(now) }
        case 'this_year':
        case 'year':
            return { from: startOfYear(date), to: now }
        case 'week':
            return { from: startOfWeek(date, { weekStartsOn: 1 }), to: endOfWeek(date, { weekStartsOn: 1 }) }
        case 'today':
            return { from: now, to: now }
        case 'all':
            return { from: new Date('2020-01-01'), to: now }
        default:
            return { from: startOfMonth(date), to: endOfMonth(date) }
    }
}

interface TimePeriodFilterProps {
    period: string
    setPeriod: (period: any) => void
    date?: Date
    setDate?: (date: Date) => void
    dateRange: DateRange | undefined
    setDateRange: (range: DateRange | undefined) => void
}

export function TimePeriodFilter({
    period,
    setPeriod,
    dateRange,
    setDateRange,
}: TimePeriodFilterProps) {

    const handlePreset = (days: number | 'ytd') => {
        setPeriod('custom')
        const end = new Date()
        let start = new Date()

        if (days === 'ytd') {
            start = startOfYear(new Date())
        } else {
            start = subDays(new Date(), days)
        }

        setDateRange({ from: start, to: end })
    }

    return (
        <div className="flex items-center gap-2">
            <select
                value={period}
                onChange={(e) => {
                    const newPeriod = e.target.value as TimePeriod
                    setPeriod(newPeriod)
                    if (newPeriod !== 'custom') {
                        const range = getPeriodRange(newPeriod)
                        setDateRange(range)
                    }
                }}
                className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
                <option value="today">Hôm nay</option>
                <option value="this_month">Tháng này</option>
                <option value="last_month">Tháng trước</option>
                <option value="this_quarter">Quý này</option>
                <option value="this_year">Năm nay</option>
                <option value="all">Tất cả</option>
                <option value="custom">Tùy chỉnh</option>
            </select>

            {period === "custom" && (
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn(
                                "justify-start text-left font-normal w-[240px]",
                                !dateRange && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange?.from ? (
                                dateRange.to ? (
                                    <>
                                        {format(dateRange.from, "dd/MM")} -{" "}
                                        {format(dateRange.to, "dd/MM/yyyy")}
                                    </>
                                ) : (
                                    format(dateRange.from, "dd/MM/yyyy")
                                )
                            ) : (
                                <span>Pick a date</span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                        <div className="p-2 border-b flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handlePreset(7)} className="text-xs">
                                7 ngày
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handlePreset(30)} className="text-xs">
                                30 ngày
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handlePreset('ytd')} className="text-xs">
                                YTD
                            </Button>
                        </div>
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={dateRange?.from}
                            selected={dateRange}
                            onSelect={setDateRange}
                            numberOfMonths={2}
                        />
                    </PopoverContent>
                </Popover>
            )}
        </div>
    )
}
