"use client"

import { Fragment } from "react"
import OrderRow, { Order } from "@/components/orders/OrderRow"

interface OrderTableProps {
    orders: Order[]
    sortField: 'date' | 'revenue' | 'platformFee' | 'shippingFee' | 'netPayout' | 'profit'
    sortDirection: 'asc' | 'desc'
    onSort: (field: any) => void
    currentPage: number
    totalPages: number
    onPageChange: (page: number) => void
    totalOrders: number
    indexOfFirstOrder: number
    indexOfLastOrder: number
}

export function OrderTable({
    orders,
    sortField,
    sortDirection,
    onSort,
    currentPage,
    totalPages,
    onPageChange,
    totalOrders,
    indexOfFirstOrder,
    indexOfLastOrder,
    loading,
    visibleColumns
}: OrderTableProps & { loading?: boolean; visibleColumns?: Record<string, boolean> }) {

    const SortIcon = ({ field }: { field: typeof sortField }) => {
        if (sortField !== field) {
            return <span className="text-gray-300 ml-1">⇅</span>
        }
        return sortDirection === 'asc' ?
            <span className="text-blue-600 ml-1">↑</span> :
            <span className="text-blue-600 ml-1">↓</span>
    }

    const getPageNumbers = () => {
        const pages = []
        const showEllipsis = totalPages > 7

        if (!showEllipsis) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i)
            }
        } else {
            pages.push(1)
            if (currentPage > 3) pages.push('...')
            const start = Math.max(2, currentPage - 1)
            const end = Math.min(totalPages - 1, currentPage + 1)
            for (let i = start; i <= end; i++) {
                if (!pages.includes(i)) pages.push(i)
            }
            if (currentPage < totalPages - 2) pages.push('...')
            if (!pages.includes(totalPages)) pages.push(totalPages)
        }
        return pages
    }

    if (loading) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-12 flex justify-center items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    const isVisible = (col: string) => visibleColumns ? visibleColumns[col] : true

    const startColSpan = ['id', 'platform', 'date', 'product'].filter(c => isVisible(c)).length

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700">
                        <tr>
                            {isVisible('id') && (
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Mã đơn
                                </th>
                            )}
                            {isVisible('platform') && (
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Sàn
                                </th>
                            )}
                            {isVisible('date') && (
                                <th
                                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none"
                                    onClick={() => onSort && onSort('date')}
                                >
                                    <div className="flex items-center">
                                        Ngày
                                        <SortIcon field="date" />
                                    </div>
                                </th>
                            )}
                            {isVisible('product') && (
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-64">
                                    Sản phẩm
                                </th>
                            )}
                            {isVisible('quantity') && (
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    SL
                                </th>
                            )}
                            {isVisible('revenue') && (
                                <th
                                    className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none"
                                    onClick={() => onSort && onSort('revenue')}
                                >
                                    <div className="flex items-center justify-end">
                                        Doanh thu
                                        <SortIcon field="revenue" />
                                    </div>
                                </th>
                            )}
                            <th
                                className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none"
                                onClick={() => onSort && onSort('platformFee')}
                            >
                                <div className="flex items-center justify-end">
                                    Tổng phí
                                    <SortIcon field="platformFee" />
                                </div>
                            </th>
                            {isVisible('net') && (
                                <th
                                    className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none"
                                    onClick={() => onSort && onSort('netPayout')}
                                >
                                    <div className="flex items-center justify-end">
                                        Thực nhận
                                        <SortIcon field="netPayout" />
                                    </div>
                                </th>
                            )}

                            {isVisible('profitMargin') && (
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    % Lãi
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {orders.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                                    Không tìm thấy đơn hàng
                                </td>
                            </tr>
                        ) : (
                            orders.map((order) => (
                                <OrderRow key={order.id} order={order} visibleColumns={visibleColumns} />
                            ))
                        )}
                    </tbody>
                    <tfoot className="bg-gray-50 dark:bg-gray-900 font-medium">
                        <tr>
                            <td colSpan={startColSpan} className="px-4 py-3 text-left text-gray-900 dark:text-gray-100">
                                Tổng trang này
                            </td>
                            {isVisible('quantity') && (
                                <td className="px-4 py-3 text-center text-gray-900 dark:text-gray-100">
                                    {orders.reduce((sum, o) => sum + (o.totalQuantity || 0), 0)}
                                </td>
                            )}
                            {isVisible('revenue') && (
                                <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-100">
                                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                                        orders.reduce((sum, o) => sum + o.revenue, 0)
                                    )}
                                </td>
                            )}
                            <td className="px-4 py-3 text-right text-red-600">
                                -{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                                    orders.reduce((sum, o) => sum + o.platformFee, 0)
                                )}
                            </td>
                            {isVisible('net') && (
                                <td className="px-4 py-3 text-right text-emerald-600">
                                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                                        orders.reduce((sum, o) => sum + o.netPayout, 0)
                                    )}
                                </td>
                            )}
                            {isVisible('profitMargin') && <td className="px-4 py-3"></td>}
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && onPageChange && (
                <div className="px-4 py-3 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                        Hiển thị <span className="font-medium">{indexOfFirstOrder + 1}</span> đến{' '}
                        <span className="font-medium">
                            {Math.min(indexOfLastOrder, totalOrders)}
                        </span>{' '}
                        trong tổng số <span className="font-medium">{totalOrders}</span> đơn
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Trang:</span>
                            <input
                                type="number"
                                min="1"
                                max={totalPages}
                                value={currentPage}
                                onChange={(e) => {
                                    const page = parseInt(e.target.value)
                                    if (page >= 1 && page <= totalPages) {
                                        onPageChange(page)
                                    }
                                }}
                                className="w-16 px-2 py-1 text-sm border dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 text-center bg-white dark:bg-gray-800 dark:text-white"
                            />
                            <span className="text-sm text-gray-600 dark:text-gray-400">/ {totalPages}</span>
                        </div>

                        <div className="flex gap-1">
                            <button
                                onClick={() => onPageChange(1)}
                                disabled={currentPage === 1}
                                className="px-2 py-1 text-sm border dark:border-gray-600 rounded hover:bg-white dark:hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-300"
                            >
                                ««
                            </button>
                            <button
                                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 border dark:border-gray-600 rounded hover:bg-white dark:hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-300"
                            >
                                Trước
                            </button>

                            {getPageNumbers().map((page, idx) => (
                                page === '...' ? (
                                    <span key={`ellipsis - ${idx} `} className="px-2 py-1">...</span>
                                ) : (
                                    <button
                                        key={page}
                                        onClick={() => onPageChange(page as number)}
                                        className={`px-3 py-1 rounded transition ${currentPage === page
                                            ? 'bg-blue-600 text-white'
                                            : 'border dark:border-gray-600 hover:bg-white dark:hover:bg-gray-800 dark:text-gray-300'
                                            } `}
                                    >
                                        {page}
                                    </button>
                                )
                            ))}

                            <button
                                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 border dark:border-gray-600 rounded hover:bg-white dark:hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-300"
                            >
                                Sau
                            </button>
                            <button
                                onClick={() => onPageChange(totalPages)}
                                disabled={currentPage === totalPages}
                                className="px-2 py-1 text-sm border dark:border-gray-600 rounded hover:bg-white dark:hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-300"
                            >
                                »»
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
