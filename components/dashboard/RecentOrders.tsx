import { format } from "date-fns";

interface Order {
    id: string;
    platformOrderId: string;
    platform: string;
    date: Date;
    revenue: number;
    netPayout: number;
    status: string;
}

interface RecentOrdersProps {
    orders: Order[];
}

export function RecentOrders({ orders }: RecentOrdersProps) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                    <tr>
                        <th className="px-6 py-3">Mã đơn</th>
                        <th className="px-6 py-3">Sàn</th>
                        <th className="px-6 py-3">Ngày</th>
                        <th className="px-6 py-3 text-right">Doanh thu</th>
                        <th className="px-6 py-3 text-right">Thực nhận</th>
                        <th className="px-6 py-3">Trạng thái</th>
                    </tr>
                </thead>
                <tbody>
                    {orders.map((order) => (
                        <tr key={order.id} className="bg-white border-b hover:bg-gray-50">
                            <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                                {order.platformOrderId}
                            </td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${order.platform === 'Shopee' ? 'bg-orange-100 text-orange-800' : 'bg-black text-white'
                                    }`}>
                                    {order.platform}
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                {format(new Date(order.date), 'dd/MM/yyyy')}
                            </td>
                            <td className="px-6 py-4 text-right">
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.revenue)}
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-green-600">
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.netPayout)}
                            </td>
                            <td className="px-6 py-4">
                                <span className="px-2 py-1 rounded bg-green-100 text-green-800 text-xs">
                                    {order.status}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
