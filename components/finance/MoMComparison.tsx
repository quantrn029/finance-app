"use client"

import React from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from "lucide-react"

export function MoMComparison({ data }: { data: any[] }) {
    if (!data) return null

    const formatValue = (val: number, metric: string) => {
        if (metric === "Đơn hàng") return val
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val)
    }

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold dark:text-white">So sánh theo kỳ</h2>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[200px]">Chỉ số</TableHead>
                        <TableHead>Kỳ này</TableHead>
                        <TableHead>Kỳ trước</TableHead>
                        <TableHead className="text-right">% Thay đổi</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((item) => (
                        <TableRow key={item.metric}>
                            <TableCell className="font-medium">{item.metric}</TableCell>
                            <TableCell>{formatValue(item.current, item.metric)}</TableCell>
                            <TableCell>{formatValue(item.previous, item.metric)}</TableCell>
                            <TableCell className="text-right">
                                <div className={`flex items-center justify-end gap-1 font-medium ${item.change > 0 ? "text-emerald-600 dark:text-emerald-400" :
                                    item.change < 0 ? "text-rose-600 dark:text-rose-400" : "text-gray-500 dark:text-gray-400"
                                    }`}>
                                    {item.change > 0 && <ArrowUpIcon className="h-4 w-4" />}
                                    {item.change < 0 && <ArrowDownIcon className="h-4 w-4" />}
                                    {item.change === 0 && <MinusIcon className="h-4 w-4" />}
                                    {Math.abs(item.change)}%
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
