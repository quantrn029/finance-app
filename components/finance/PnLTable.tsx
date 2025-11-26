"use client"

import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from "lucide-react"

interface PnLRow {
    label: string
    current: number
    previous: number
    change: number
    highlight?: boolean
    color?: string
}

interface PnLTableProps {
    data: PnLRow[]
}

export function PnLTable({ data }: PnLTableProps) {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value)
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Báo cáo Kết quả Kinh doanh (P&L)</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Chi tiết doanh thu, chi phí và lợi nhuận trong kỳ.</p>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 font-medium border-b dark:border-gray-700">
                        <tr>
                            <th className="px-6 py-3">Chỉ tiêu</th>
                            <th className="px-6 py-3 text-right">Kỳ này</th>
                            <th className="px-6 py-3 text-right">Kỳ trước</th>
                            <th className="px-6 py-3 text-right">Thay đổi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {data.map((row, index) => (
                            <tr key={index} className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${row.highlight ? 'bg-gray-50/50 dark:bg-gray-700/50 font-semibold' : ''}`}>
                                <td className={`px-6 py-4 ${row.highlight ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                                    {row.label}
                                </td>
                                <td className={`px-6 py-4 text-right ${row.color || 'text-gray-900 dark:text-gray-100'}`}>
                                    {formatCurrency(row.current)}
                                </td>
                                <td className="px-6 py-4 text-right text-gray-500 dark:text-gray-400">
                                    {formatCurrency(row.previous)}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className={`flex items-center justify-end gap-1 ${row.change > 0 ? 'text-emerald-600 dark:text-emerald-400' : row.change < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-gray-500 dark:text-gray-400'
                                        }`}>
                                        {row.change > 0 ? <ArrowUpIcon className="w-3 h-3" /> :
                                            row.change < 0 ? <ArrowDownIcon className="w-3 h-3" /> :
                                                <MinusIcon className="w-3 h-3" />}
                                        <span>{Math.abs(row.change)}%</span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
