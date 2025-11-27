import { useState } from "react"
import { format } from "date-fns"
import { ChevronDown, ChevronUp } from "lucide-react"

export interface Order {
    id: string
    platformOrderId: string
    platform: string
    date: Date | string
    revenue: number
    platformFee: number
    shippingFee: number
    netPayout: number
    status: string
    productNames?: string
    totalQuantity?: number
    profit?: number
    profitMargin?: number
    cogs?: number
    // Detailed fees
    serviceFee?: number
    paymentFee?: number
    fixedFee?: number
    affiliateFee?: number
    commissionFee?: number
    transactionFee?: number
    affiliateCommission?: number
    adCommission?: number
    partnerCommission?: number
    flashSaleFee?: number
    taxVAT?: number
    taxPIT?: number
    otherFees?: number
    promotion?: number
    // Items for COGS
    items?: {
        quantity: number
        product?: {
            materialCost: number
            laborCost: number
        }
    }[]
}

interface OrderRowProps {
    order: Order
    visibleColumns?: Record<string, boolean>
}

export default function OrderRow({ order, visibleColumns }: OrderRowProps) {
    const [expanded, setExpanded] = useState(false)

    // Helper to format currency
    const fmt = (amount: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount)
    const fmtPercent = (amount: number) => new Intl.NumberFormat('vi-VN', { style: 'percent', maximumFractionDigits: 1 }).format(amount / 100)

    // Calculate COGS and Profit
    const cogs = order.items?.reduce((sum, item) => {
        const cost = (item.product?.materialCost || 0) + (item.product?.laborCost || 0)
        return sum + (item.quantity * cost)
    }, 0) || 0

    const profit = order.netPayout - cogs
    const profitMargin = order.revenue > 0 ? (profit / order.revenue) * 100 : 0

    // Collect all non-zero fees for display
    const fees = [
        { label: 'Phí dịch vụ', value: order.serviceFee },
        { label: 'Phí thanh toán', value: order.paymentFee },
        { label: 'Phí cố định', value: order.fixedFee },
        { label: 'Phí Affiliate', value: order.affiliateFee },
        { label: 'Phí hoa hồng', value: order.commissionFee },
        { label: 'Phí giao dịch', value: order.transactionFee },
        { label: 'HH Tiếp thị liên kết', value: order.affiliateCommission },
        { label: 'HH Quảng cáo', value: order.adCommission },
        { label: 'HH Đối tác', value: order.partnerCommission },
        { label: 'Phí Flash Sale', value: order.flashSaleFee },
        { label: 'Thuế VAT', value: order.taxVAT },
        { label: 'Thuế TNCN', value: order.taxPIT },
        { label: 'Phí khác', value: order.otherFees },
    ].filter(f => f.value && f.value > 0)

    const isVisible = (col: string) => visibleColumns ? visibleColumns[col] : true

    return (
        <>
            <tr className="hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer" onClick={() => setExpanded(!expanded)}>
                {isVisible('id') && (
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                        {order.platform === 'Shopee' ? (
                            <a
                                href={`https://banhang.shopee.vn/portal/finance/income/${order.platformOrderId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-blue-600 hover:underline flex items-center gap-1"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {order.platformOrderId}
                            </a>
                        ) : order.platform === 'TikTok' || order.platform === 'TikTok Shop' ? (
                            <a
                                href={`https://seller-vn.tiktok.com/order/detail?order_no=${order.platformOrderId}&shop_region=VN`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-blue-600 hover:underline flex items-center gap-1"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {order.platformOrderId}
                            </a>
                        ) : (
                            <span>{order.platformOrderId}</span>
                        )}
                    </td>
                )}
                {isVisible('platform') && (
                    <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${order.platform === 'Shopee'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-blue-100 text-blue-700'
                            }`}>
                            {order.platform}
                        </span>
                    </td>
                )}
                {isVisible('date') && (
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {format(new Date(order.date), "dd/MM/yyyy")}
                    </td>
                )}
                {isVisible('product') && (
                    <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100 max-w-xs truncate" title={order.productNames}>
                        {order.productNames}
                    </td>
                )}
                {isVisible('quantity') && (
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 text-center">
                        {order.totalQuantity}
                    </td>
                )}
                {isVisible('revenue') && (
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-medium">
                        {fmt(order.revenue)}
                    </td>
                )}
                <td className="px-4 py-3 text-sm text-right text-red-600">
                    -{fmt(order.platformFee + order.shippingFee)}
                </td>
                {isVisible('net') && (
                    <td className="px-4 py-3 text-sm text-right font-semibold text-blue-600">
                        {fmt(order.netPayout)}
                    </td>
                )}
                {/* Profit Columns -> Now Platform Fee */}

                {isVisible('profitMargin') && (
                    <td className={`px-4 py-3 text-sm text-right font-medium ${profitMargin >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {fmtPercent(profitMargin)}
                    </td>
                )}

            </tr>
            {expanded && (
                <tr className="bg-gray-50 dark:bg-gray-900">
                    <td colSpan={10} className="px-4 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div className="p-3 bg-white dark:bg-gray-800 rounded border dark:border-gray-700">
                                <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">Chi tiết phí sàn</h4>
                                {fees.length > 0 ? (
                                    <div className="space-y-1">
                                        {fees.map((f, i) => (
                                            <div key={i} className="flex justify-between">
                                                <span className="text-gray-500 dark:text-gray-400">{f.label}</span>
                                                <span className="font-medium dark:text-gray-200">{fmt(f.value || 0)}</span>
                                            </div>
                                        ))}
                                        <div className="flex justify-between">
                                            <span className="text-gray-500 dark:text-gray-400">Phí vận chuyển</span>
                                            <span className="font-medium dark:text-gray-200">{fmt(order.shippingFee)}</span>
                                        </div>
                                        <div className="border-t dark:border-gray-700 pt-1 mt-1 flex justify-between font-bold dark:text-gray-100">
                                            <span>Tổng phí</span>
                                            <span>{fmt(order.platformFee + order.shippingFee)}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-gray-400 italic">Không có chi tiết phí</p>
                                )}
                            </div>

                            <div className="p-3 bg-white dark:bg-gray-800 rounded border dark:border-gray-700">
                                <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">Hiệu quả kinh doanh</h4>
                                <div className="space-y-1">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500 dark:text-gray-400">Doanh thu</span>
                                        <span className="font-medium dark:text-gray-200">{fmt(order.revenue)}</span>
                                    </div>
                                    <div className="flex justify-between text-red-600 dark:text-red-400">
                                        <span className="text-gray-500 dark:text-gray-400">Tổng phí sàn & VC</span>
                                        <span className="font-medium">-{fmt(order.platformFee + order.shippingFee)}</span>
                                    </div>
                                    <div className="flex justify-between text-blue-600 dark:text-blue-400 font-medium">
                                        <span className="text-gray-500 dark:text-gray-400">Thực nhận</span>
                                        <span>{fmt(order.netPayout)}</span>
                                    </div>
                                    <div className="flex justify-between text-amber-600 dark:text-amber-500">
                                        <span className="text-gray-500 dark:text-gray-400">Giá vốn (COGS)</span>
                                        <span className="font-medium">-{fmt(cogs)}</span>
                                    </div>
                                    <div className="border-t dark:border-gray-700 pt-1 mt-1 flex justify-between font-bold text-emerald-600 dark:text-emerald-400">
                                        <span>Lợi nhuận ròng</span>
                                        <span>{fmt(profit)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </>
    )
}
