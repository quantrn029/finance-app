"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface PnLTableProps {
    revenue: number
    cogs: number
    ads: number
    ops: number
    platformFees: number
    shippingFees: number
    netProfit: number
}

export function PnLTable({ revenue, cogs, ads, ops, platformFees, shippingFees, netProfit }: PnLTableProps) {
    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val)

    const formatPercent = (val: number, total: number) =>
        total > 0 ? `${((val / total) * 100).toFixed(1)}%` : '0%'

    const rows = [
        { label: "Doanh thu (Revenue)", value: revenue, isTotal: true, color: "text-black" },
        { label: "Giá vốn hàng bán (COGS)", value: -cogs, isTotal: false, color: "text-red-600" },
        { label: "Chi phí Quảng cáo (Ads)", value: -ads, isTotal: false, color: "text-red-600" },
        { label: "Chi phí Vận hành (Ops)", value: -ops, isTotal: false, color: "text-red-600" },
        { label: "Phí Sàn (Platform Fees)", value: -platformFees, isTotal: false, color: "text-orange-600" },
        { label: "Phí Vận chuyển (Shipping)", value: -shippingFees, isTotal: false, color: "text-orange-600" },
        { label: "Lợi nhuận ròng (Net Profit)", value: netProfit, isTotal: true, color: netProfit >= 0 ? "text-emerald-600" : "text-red-600" },
    ]

    return (
        <Card>
            <CardHeader>
                <CardTitle>Báo cáo Kết quả Kinh doanh (P&L)</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Hạng mục</TableHead>
                            <TableHead className="text-right">Số tiền</TableHead>
                            <TableHead className="text-right">% Doanh thu</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.map((row, index) => (
                            <TableRow key={index} className={row.isTotal ? "font-bold bg-gray-50" : ""}>
                                <TableCell>{row.label}</TableCell>
                                <TableCell className={`text-right ${row.color}`}>
                                    {formatCurrency(row.value)}
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground">
                                    {row.isTotal && row.label.includes("Doanh thu")
                                        ? "100%"
                                        : formatPercent(Math.abs(row.value), revenue)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
