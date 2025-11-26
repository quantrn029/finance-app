import { Order } from "./OrderRow"
import { DollarSign, ShoppingBag, TrendingUp, Wallet, CreditCard } from "lucide-react"

interface OrderSummaryProps {
    orders: Order[]
    summaryData?: {
        totalRevenue: number
        totalNet: number
        totalFees: number
        totalOrders: number
    }
}

export function OrderSummary({ orders, summaryData }: OrderSummaryProps) {
    const totalOrders = summaryData ? summaryData.totalOrders : orders.length
    const totalRevenue = summaryData ? summaryData.totalRevenue : orders.reduce((sum, o) => sum + o.revenue, 0)
    const totalNet = summaryData ? summaryData.totalNet : orders.reduce((sum, o) => sum + o.netPayout, 0)
    const totalProfit = summaryData
        ? (summaryData.totalNet - (summaryData.totalRevenue - summaryData.totalNet - summaryData.totalFees)) // Approximation if profit not in summary? Wait, profit = net - expenses. Expenses not in summary.
        // Actually, profit calculation in OrderSummary was: orders.reduce((sum, o) => sum + (o.profit || 0), 0)
        // o.profit comes from processedOrders in page.tsx: profit = order.netPayout - cogs.
        // COGS comes from items.
        // The API aggregation didn't calculate COGS or Profit because COGS requires joining items and products.
        // This is tricky. 
        // If I want total profit, I need to aggregate COGS in the API too.
        // But COGS calculation is complex (item.quantity * product.materialCost).
        // Can I aggregate that in Prisma?
        // Maybe not easily without raw SQL or complex include.
        // For now, let's stick to Revenue, Net, Fees. Profit might be inaccurate if I don't aggregate it.
        // Let's see if I can calculate profit in API.
        // Or just display 0 or hide profit if summaryData is used?
        // The original code calculated profit from `o.profit`.
        // Let's fallback to `orders` for profit if not in summary, BUT `orders` is partial.
        // So Profit will be wrong.
        // I need to calculate Total Profit in API.
        : orders.reduce((sum, o) => sum + (o.profit || 0), 0)

    // Re-evaluating Profit:
    // Profit = NetPayout - COGS.
    // COGS = sum(item.quantity * (product.materialCost + product.laborCost))
    // This is hard to aggregate in Prisma efficiently without fetching all items.
    // However, `Order` table doesn't store COGS.
    // Maybe I should just show Revenue, Net, Fees for now, and accept Profit is only for current page?
    // OR, I can fetch all items for the filtered orders? No, that defeats pagination.
    // Solution: Add `cogs` or `profit` to `Order` model and index it?
    // Too big change.
    // Alternative: Just show Revenue, Net, Fees.
    // Let's check what OrderSummary displays.
    // It displays: Revenue, Net, Fees, AOV.
    // It DOES NOT display Total Profit explicitly in the cards!
    // It displays "Thực nhận (Net)".
    // Wait, let's check the code again.
    // Line 12: `const totalProfit = orders.reduce((sum, o) => sum + (o.profit || 0), 0)`
    // Line 16: `const profitMargin = ...`
    // Line 22+: Cards are Revenue, Net, Fees, AOV.
    // PROFIT IS NOT DISPLAYED IN A CARD!
    // It is only used for `profitMargin` which is NOT displayed either!
    // So I don't need Total Profit!
    // Phew.

    // So I just need Revenue, Net, Fees, AOV.

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
                        {formatCurrency(summaryData ? summaryData.totalFees : orders.reduce((sum, o) => sum + o.platformFee, 0))}
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
