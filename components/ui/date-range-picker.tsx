"use client"

import * as React from "react"
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"
import { vi } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerWithRangeProps {
    className?: string
    dateFrom: Date
    dateTo: Date
    onSelect: (range: { from: Date; to: Date }) => void
}

export function DatePickerWithRange({
    className,
    dateFrom,
    dateTo,
    onSelect,
}: DatePickerWithRangeProps) {
    const [date, setDate] = React.useState<DateRange | undefined>({
        from: dateFrom,
        to: dateTo,
    })

    // Sync internal state with props
    React.useEffect(() => {
        setDate({
            from: dateFrom,
            to: dateTo,
        })
    }, [dateFrom, dateTo])

    const handleSelect = (range: DateRange | undefined) => {
        setDate(range)
        if (range?.from && range?.to) {
            onSelect({ from: range.from, to: range.to })
        }
    }

    const presets = [
        {
            label: 'Hôm nay',
            getValue: () => {
                const today = new Date()
                return { from: startOfDay(today), to: endOfDay(today) }
            }
        },
        {
            label: 'Hôm qua',
            getValue: () => {
                const yesterday = subDays(new Date(), 1)
                return { from: startOfDay(yesterday), to: endOfDay(yesterday) }
            }
        },
        {
            label: '7 ngày qua',
            getValue: () => {
                const today = new Date()
                return { from: subDays(today, 6), to: endOfDay(today) }
            }
        },
        {
            label: '28 ngày qua',
            getValue: () => {
                const today = new Date()
                return { from: subDays(today, 27), to: endOfDay(today) }
            }
        },
        {
            label: 'Tuần hiện tại',
            getValue: () => {
                const today = new Date()
                return { from: startOfWeek(today, { weekStartsOn: 1 }), to: endOfWeek(today, { weekStartsOn: 1 }) }
            }
        },
        {
            label: 'Tháng hiện tại',
            getValue: () => {
                const today = new Date()
                return { from: startOfMonth(today), to: endOfMonth(today) }
            }
        }
    ]

    const handlePresetSelect = (range: { from: Date, to: Date }) => {
        const newRange = { from: range.from, to: range.to }
        setDate(newRange)
        onSelect(newRange)
    }

    return (
        <div className={cn("grid gap-2", className)}>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-[260px] justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from ? (
                            date.to ? (
                                <>
                                    {format(date.from, "dd/MM/yyyy")} -{" "}
                                    {format(date.to, "dd/MM/yyyy")}
                                </>
                            ) : (
                                format(date.from, "dd/MM/yyyy")
                            )
                        ) : (
                            <span>Chọn khoảng thời gian</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white" align="start">
                    <div className="flex h-full">
                        <div className="flex flex-col gap-1 p-2 border-r w-[150px] bg-muted/10">
                            {presets.map((preset) => (
                                <Button
                                    key={preset.label}
                                    variant="ghost"
                                    size="sm"
                                    className="justify-start font-normal text-left"
                                    onClick={() => handlePresetSelect(preset.getValue())}
                                >
                                    {preset.label}
                                </Button>
                            ))}
                        </div>
                        <div className="p-2">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={date?.from}
                                selected={date}
                                onSelect={handleSelect}
                                numberOfMonths={2}
                                locale={vi}
                            />
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}
