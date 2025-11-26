"use client"

import { useState } from "react"
import { CashFlowChart } from "@/components/analytics/CashFlowChart"
import { DatePickerWithRange } from "@/components/ui/date-picker-range"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react"
import { DateRange } from "react-day-picker"
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns"
import { useEffect } from "react"

interface CashFlowData {
    date: string
    inflow: number
    outflow: number
    netFlow: number
}

export default function CashFlowClientPage() {
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date())
    })

    const [cashFlowData, setCashFlowData] = useState<CashFlowData[]>([])
    const [loading, setLoading] = useState(false)

    // Fetch cash flow data whenever date range changes
    useEffect(() => {
        if (!dateRange?.from || !dateRange?.to) return

        setLoading(true)
        fetch(`/api/cashflow?from=${dateRange.from.toISOString()}&to=${dateRange.to.toISOString()}`)
            .then(res => res.json())
            .then(data => {
                setCashFlowData(data.cashFlow || [])
                setLoading(false)
            })
            .catch(err => {
                console.error(err)
                setLoading(false)
            })
    }, [dateRange])

    const totalInflow = cashFlowData.reduce((sum, d) => sum + d.inflow, 0)
    const totalOutflow = cashFlowData.reduce((sum, d) => sum + d.outflow, 0)
    const netFlow = totalInflow - totalOutflow

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val)

    // Quick preset buttons
    const setThisMonth = () => {
        setDateRange({
            from: startOfMonth(new Date()),
            to: endOfMonth(new Date())
        })
    }

    const setLastMonth = () => {
        const lastMonth = subMonths(new Date(), 1)
        setDateRange({
            from: startOfMonth(lastMonth),
            to: endOfMonth(lastMonth)
        })
    }

    const setLast3Months = () => {
        setDateRange({
            from: startOfMonth(subMonths(new Date(), 2)),
            to: endOfMonth(new Date())
        })
    }

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Dòng tiền (Cash Flow)</h2>
                <p className="text-muted-foreground mt-2">
                    Theo dõi dòng tiền vào/ra theo khoảng thời gian tùy chỉnh
                </p>
            </div>

            {/* Date Range Selector */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Chọn khoảng thời gian</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3 items-center">
                    <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={setThisMonth}>
                            Tháng này
                        </Button>
                        <Button variant="outline" size="sm" onClick={setLastMonth}>
                            Tháng trước
                        </Button>
                        <Button variant="outline" size="sm" onClick={setLast3Months}>
                            3 tháng gần đây
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Summary Cards */}
            {loading ? (
                <div className="text-center py-12 text-muted-foreground">
                    Đang tải dữ liệu...
                </div>
            ) : (
                <>
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Tổng tiền vào</CardTitle>
                                <TrendingUp className="h-4 w-4 text-emerald-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-emerald-600">{formatCurrency(totalInflow)}</div>
                                <p className="text-xs text-muted-foreground mt-1">Doanh thu từ đơn hàng</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Tổng tiền ra</CardTitle>
                                <TrendingDown className="h-4 w-4 text-red-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-red-600">{formatCurrency(totalOutflow)}</div>
                                <p className="text-xs text-muted-foreground mt-1">Chi phí + Phí sàn</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Dòng tiền ròng</CardTitle>
                                <DollarSign className="h-4 w-4 text-blue-600" />
                            </CardHeader>
                            <CardContent>
                                <div className={`text-2xl font-bold ${netFlow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {formatCurrency(netFlow)}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {netFlow >= 0 ? 'Dương' : 'Âm'} - {dateRange?.from && dateRange?.to ?
                                        `${format(dateRange.from, 'dd/MM')} - ${format(dateRange.to, 'dd/MM')}` :
                                        'Chưa chọn'}
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Chart */}
                    <CashFlowChart data={cashFlowData} />

                    {/* Info Box */}
                    <Card className="bg-blue-50 border-blue-200">
                        <CardHeader>
                            <CardTitle className="text-blue-900">💡 Giải thích</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm text-blue-800">
                            <p><strong>Tiền vào (Inflow):</strong> Doanh thu từ đơn hàng Shopee & TikTok</p>
                            <p><strong>Tiền ra (Outflow):</strong> Chi phí (Ads, COGS, Ops) + Phí sàn + Phí vận chuyển</p>
                            <p><strong>Dòng tiền ròng:</strong> Tiền vào - Tiền ra (số dương = lợi nhuận, số âm = thua lỗ)</p>
                            <hr className="border-blue-200" />
                            <p className="text-xs">
                                📊 Biểu đồ hiển thị theo từng ngày trong khoảng thời gian đã chọn. Cột xanh cao = ngày bán nhiều, cột đỏ cao = ngày chi phí cao.
                            </p>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    )
}
