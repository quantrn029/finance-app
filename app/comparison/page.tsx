import prisma from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns"

export const dynamic = 'force-dynamic'

export default async function ComparisonPage() {
    // Get last 3 months of data
    const currentMonth = new Date()
    const lastMonth = subMonths(currentMonth, 1)
    const twoMonthsAgo = subMonths(currentMonth, 2)

    async function getMonthData(month: Date) {
        const orders = await prisma.order.findMany({
            where: {
                date: {
                    gte: startOfMonth(month),
                    lte: endOfMonth(month)
                }
            }
        })

        const expenses = await prisma.expense.findMany({
            where: {
                date: {
                    gte: startOfMonth(month),
                    lte: endOfMonth(month)
                }
            }
        })

        const revenue = orders.reduce((sum, o) => sum + o.revenue, 0)
        const netPayout = orders.reduce((sum, o) => sum + o.netPayout, 0)
        const platformFees = orders.reduce((sum, o) => sum + o.platformFee, 0)
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
        const profit = netPayout - totalExpenses

        return {
            month: format(month, 'MMM yyyy'),
            revenue,
            netPayout,
            platformFees,
            expenses: totalExpenses,
            profit,
            orderCount: orders.length
        }
    }

    const [current, last, twoAgo] = await Promise.all([
        getMonthData(currentMonth),
        getMonthData(lastMonth),
        getMonthData(twoMonthsAgo)
    ])

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val)

    const calcChange = (current: number, previous: number) => {
        if (previous === 0) return 0
        return ((current - previous) / previous) * 100
    }

    const TrendIcon = ({ value }: { value: number }) => {
        if (value > 0) return <TrendingUp className="h-4 w-4 text-emerald-600" />
        if (value < 0) return <TrendingDown className="h-4 w-4 text-red-600" />
        return <Minus className="h-4 w-4 text-gray-400" />
    }

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">So sánh theo tháng</h2>
                <p className="text-muted-foreground mt-2">
                    Phân tích hiệu suất kinh doanh qua 3 tháng gần nhất
                </p>
            </div>

            {/* Comparison Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Bảng so sánh chi tiết</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Chỉ số</TableHead>
                                <TableHead className="text-right">{twoAgo.month}</TableHead>
                                <TableHead className="text-right">{last.month}</TableHead>
                                <TableHead className="text-right">{current.month}</TableHead>
                                <TableHead className="text-center">Xu hướng</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell className="font-medium">Doanh thu</TableCell>
                                <TableCell className="text-right">{formatCurrency(twoAgo.revenue)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(last.revenue)}</TableCell>
                                <TableCell className="text-right font-bold">{formatCurrency(current.revenue)}</TableCell>
                                <TableCell className="text-center">
                                    <div className="flex items-center justify-center gap-1">
                                        <TrendIcon value={calcChange(current.revenue, last.revenue)} />
                                        <span className={calcChange(current.revenue, last.revenue) > 0 ? 'text-emerald-600' : 'text-red-600'}>
                                            {calcChange(current.revenue, last.revenue).toFixed(1)}%
                                        </span>
                                    </div>
                                </TableCell>
                            </TableRow>

                            <TableRow>
                                <TableCell className="font-medium">Số đơn hàng</TableCell>
                                <TableCell className="text-right">{twoAgo.orderCount}</TableCell>
                                <TableCell className="text-right">{last.orderCount}</TableCell>
                                <TableCell className="text-right font-bold">{current.orderCount}</TableCell>
                                <TableCell className="text-center">
                                    <div className="flex items-center justify-center gap-1">
                                        <TrendIcon value={calcChange(current.orderCount, last.orderCount)} />
                                        <span className={calcChange(current.orderCount, last.orderCount) > 0 ? 'text-emerald-600' : 'text-red-600'}>
                                            {calcChange(current.orderCount, last.orderCount).toFixed(1)}%
                                        </span>
                                    </div>
                                </TableCell>
                            </TableRow>

                            <TableRow>
                                <TableCell className="font-medium">Thực nhận</TableCell>
                                <TableCell className="text-right">{formatCurrency(twoAgo.netPayout)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(last.netPayout)}</TableCell>
                                <TableCell className="text-right font-bold">{formatCurrency(current.netPayout)}</TableCell>
                                <TableCell className="text-center">
                                    <div className="flex items-center justify-center gap-1">
                                        <TrendIcon value={calcChange(current.netPayout, last.netPayout)} />
                                        <span className={calcChange(current.netPayout, last.netPayout) > 0 ? 'text-emerald-600' : 'text-red-600'}>
                                            {calcChange(current.netPayout, last.netPayout).toFixed(1)}%
                                        </span>
                                    </div>
                                </TableCell>
                            </TableRow>

                            <TableRow>
                                <TableCell className="font-medium">Chi phí</TableCell>
                                <TableCell className="text-right text-red-600">{formatCurrency(twoAgo.expenses)}</TableCell>
                                <TableCell className="text-right text-red-600">{formatCurrency(last.expenses)}</TableCell>
                                <TableCell className="text-right font-bold text-red-600">{formatCurrency(current.expenses)}</TableCell>
                                <TableCell className="text-center">
                                    <div className="flex items-center justify-center gap-1">
                                        <TrendIcon value={calcChange(current.expenses, last.expenses)} />
                                        <span className={calcChange(current.expenses, last.expenses) < 0 ? 'text-emerald-600' : 'text-red-600'}>
                                            {calcChange(current.expenses, last.expenses).toFixed(1)}%
                                        </span>
                                    </div>
                                </TableCell>
                            </TableRow>

                            <TableRow className="bg-muted/50">
                                <TableCell className="font-bold">Lợi nhuận ròng</TableCell>
                                <TableCell className="text-right">{formatCurrency(twoAgo.profit)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(last.profit)}</TableCell>
                                <TableCell className="text-right font-bold text-emerald-600">{formatCurrency(current.profit)}</TableCell>
                                <TableCell className="text-center">
                                    <div className="flex items-center justify-center gap-1">
                                        <TrendIcon value={calcChange(current.profit, last.profit)} />
                                        <span className={calcChange(current.profit, last.profit) > 0 ? 'text-emerald-600' : 'text-red-600'}>
                                            {calcChange(current.profit, last.profit).toFixed(1)}%
                                        </span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-emerald-50 border-emerald-200">
                    <CardHeader>
                        <CardTitle className="text-emerald-900 text-base">📈 Tăng trưởng doanh thu</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-emerald-600">
                            {calcChange(current.revenue, last.revenue).toFixed(1)}%
                        </div>
                        <p className="text-sm text-emerald-700 mt-1">So với tháng trước</p>
                    </CardContent>
                </Card>

                <Card className="bg-blue-50 border-blue-200">
                    <CardHeader>
                        <CardTitle className="text-blue-900 text-base">🎯 Đơn hàng trung bình/ngày</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-blue-600">
                            {(current.orderCount / new Date().getDate()).toFixed(1)}
                        </div>
                        <p className="text-sm text-blue-700 mt-1">Tháng này</p>
                    </CardContent>
                </Card>

                <Card className="bg-purple-50 border-purple-200">
                    <CardHeader>
                        <CardTitle className="text-purple-900 text-base">💰 Lợi nhuận trung bình/đơn</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-purple-600">
                            {formatCurrency(current.orderCount > 0 ? current.profit / current.orderCount : 0)}
                        </div>
                        <p className="text-sm text-purple-700 mt-1">Tháng này</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
