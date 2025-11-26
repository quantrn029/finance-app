"use client"

import { TrendingUp, TrendingDown, Minus, DollarSign } from "lucide-react"

interface PnLItem {
    label: string
    value: number
    type: "revenue" | "expense" | "profit"
    indent?: boolean
    highlight?: boolean
    note?: string
}

interface PnLTableProps {
    data: {
        revenue: number
        cogs: number
        platformFees: number
        ads: number
        operations: number
        fixed: number
    }
}

export function PnLTable({ data }: PnLTableProps) {
    const netProfit = data.revenue - (data.cogs + data.platformFees + data.ads + data.operations + data.fixed)
    const profitMargin = data.revenue > 0 ? (netProfit / data.revenue) * 100 : 0

    const rows: PnLItem[] = [
        { label: "Doanh thu gộp (GMV)", value: data.revenue, type: "revenue", highlight: true, note: "Tổng giá trị đơn hàng" },
        { label: "(-) Giá vốn hàng bán (COGS)", value: data.cogs, type: "expense", indent: true, note: "Giá nhập + Bao bì" },
        { label: "(-) Phí Sàn & Payment", value: data.platformFees, type: "expense", indent: true, note: "Shopee (~12%), TikTok (~X%)" },
        { label: "(-) Chi phí Quảng cáo (Ads)", value: data.ads, type: "expense", indent: true, note: "Ngân sách Marketing" },
        { label: "(-) Vận hành & Hoàn hàng", value: data.operations, type: "expense", indent: true, note: "Ship ngoài + Hàng hoàn" },
        { label: "(-) Chi phí Cố định (Fixed)", value: data.fixed, type: "expense", indent: true, note: "Lương nhân viên + Kho" },
        { label: "LỢI NHUẬN RÒNG (NET)", value: netProfit, type: "profit", highlight: true, note: "Tiền thực sự bỏ túi" },
    ]

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                    <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">HẠNG MỤC</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-600">GIÁ TRỊ (VNĐ)</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-600">% DOANH THU</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600 pl-8">GHI CHÚ (FINANCIAL NOTE)</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {rows.map((row, idx) => {
                        const percent = data.revenue > 0 ? (row.value / data.revenue) * 100 : 0
                        const isProfit = row.type === "profit"
                        const isRevenue = row.type === "revenue"

                        return (
                            <tr key={idx} className={`hover:bg-gray-50 ${row.highlight ? 'bg-gray-50/50' : ''}`}>
                                <td className={`px-4 py-3 ${row.indent ? 'pl-8 text-gray-600' : 'font-semibold text-gray-800'}`}>
                                    {row.label}
                                </td>
                                <td className={`px-4 py-3 text-right font-medium ${isProfit ? 'text-emerald-600 text-lg' :
                                        isRevenue ? 'text-gray-900' : 'text-red-600'
                                    }`}>
                                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(row.value)}
                                </td>
                                <td className={`px-4 py-3 text-right ${isProfit ? 'font-bold text-emerald-600' : 'text-gray-500'}`}>
                                    {percent.toFixed(1)}%
                                </td>
                                <td className="px-4 py-3 pl-8 text-gray-400 italic text-xs">
                                    {row.note}
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}
