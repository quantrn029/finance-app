import { Order } from "./OrderRow"
import { DollarSign, ShoppingBag, TrendingUp, Wallet, CreditCard } from "lucide-react"

interface OrderSummaryProps {
    orders: Order[]
}

export function OrderSummary({ orders }: OrderSummaryProps) {
    const totalOrders = orders.length
    const totalRevenue = orders.reduce((sum, o) => sum + o.revenue, 0)
    const totalNet = orders.reduce((sum, o) => sum + o.netPayout, 0)
    const totalProfit = orders.reduce((sum, o) => sum + (o.profit || 0), 0)

    // Calculate averages
    const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Primary Metrics */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-500 font-medium mb-1">Tổng doanh thu</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
                    <p className="text-xs text-gray-400 mt-1">{totalOrders} đơn hàng</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-full">
                    <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-500 font-medium mb-1">Thực nhận (Net)</p>
                    <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalNet)}</p>
                    <p className="text-xs text-gray-400 mt-1">Sau khi trừ phí sàn</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-full">
                    <Wallet className="w-6 h-6 text-emerald-600" />
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-500 font-medium mb-1">Tổng phí sàn</p>
                    <p className="text-2xl font-bold text-red-600">
                        {formatCurrency(orders.reduce((sum, o) => sum + o.platformFee, 0))}
                    </p>
                    <p className="text-xs text-red-600 mt-1 font-medium">
                        Bao gồm VC + KM + Khác
                    </p>
                </div>
                <div className="p-3 bg-red-50 rounded-full">
                    <CreditCard className="w-6 h-6 text-red-600" />
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-500 font-medium mb-1">Trung bình đơn (AOV)</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(aov)}</p>
                    <p className="text-xs text-gray-400 mt-1">Doanh thu / Đơn</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-full">
                    <ShoppingBag className="w-6 h-6 text-gray-600" />
                </div>
            </div>
        </div>
    )
}
