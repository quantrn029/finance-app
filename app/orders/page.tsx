"use client"

import { useState, useEffect } from "react"
import { OrderSummary } from "@/components/orders/OrderSummary"
import { OrderFilters } from "@/components/orders/OrderFilters"
import { OrderTable } from "@/components/orders/OrderTable"
import { Order } from "@/components/orders/OrderRow"
import { Download, Eye, ChevronLeft, ChevronRight } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { subDays, startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns"

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([])
    const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)

    // Filter States
    const [dateFrom, setDateFrom] = useState<Date>(subDays(new Date(), 30))
    const [dateTo, setDateTo] = useState<Date>(new Date())
    const [searchQuery, setSearchQuery] = useState("")
    const [platformFilter, setPlatformFilter] = useState("all")
    const [abnormalFilter, setAbnormalFilter] = useState(false)

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage] = useState(50)

    // Column Visibility State
    const [visibleColumns, setVisibleColumns] = useState({
        date: true,
        id: true,
        platform: true,
        customer: true,
        product: false,
        quantity: false, // New column
        revenue: true,
        net: true,
        profit: true,
        profitMargin: true,
        actions: true
    })

    // Fetch orders
    useEffect(() => {
        const savedPeriod = localStorage.getItem("defaultTimePeriod")
        if (savedPeriod && ['today', 'week', 'month', 'year', 'all'].includes(savedPeriod)) {
            const today = new Date()
            if (savedPeriod === 'today') {
                setDateFrom(today)
                setDateTo(today)
            } else if (savedPeriod === 'year') {
                setDateFrom(new Date(today.getFullYear(), 0, 1))
                setDateTo(new Date(today.getFullYear(), 11, 31))
            } else if (savedPeriod === 'all') {
                setDateFrom(new Date('2020-01-01'))
                setDateTo(today)
            } else {
                // Default to month
                setDateFrom(startOfMonth(today))
                setDateTo(endOfMonth(today))
            }
        }
    }, [])

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const res = await fetch('/api/orders')
                const data = await res.json()

                const processedOrders = (data.orders || []).map((order: any) => {
                    // Calculate COGS and Total Quantity
                    let totalQuantity = 0
                    const cogs = order.items?.reduce((sum: number, item: any) => {
                        const cost = (item.product?.materialCost || 0) + (item.product?.laborCost || 0)
                        totalQuantity += item.quantity
                        return sum + (item.quantity * cost)
                    }, 0) || 0

                    const profit = order.netPayout - cogs
                    const profitMargin = order.revenue > 0 ? (profit / order.revenue) * 100 : 0
                    const productNames = order.items?.map((i: any) => i.productName).join(", ") || ""

                    return {
                        ...order,
                        cogs,
                        profit,
                        profitMargin,
                        productNames,
                        totalQuantity
                    }
                })

                setOrders(processedOrders)
                // Initial filter will happen in the other useEffect
            } catch (error) {
                console.error("Failed to fetch orders:", error)
            } finally {
                setLoading(false)
            }
        }
        fetchOrders()
    }, [])

    // Filtering Logic
    useEffect(() => {
        let result = [...orders]

        // Date Filter
        if (dateFrom && dateTo) {
            result = result.filter(o => {
                const d = new Date(o.date)
                return d >= startOfDay(dateFrom) && d <= endOfDay(dateTo)
            })
        }

        // Search
        if (searchQuery) {
            const q = searchQuery.toLowerCase()
            result = result.filter(o =>
                o.id.toLowerCase().includes(q) ||
                (o as any).productNames.toLowerCase().includes(q)
            )
        }

        // Platform
        if (platformFilter !== 'all') {
            result = result.filter(o => o.platform === platformFilter)
        }



        // Abnormal
        if (abnormalFilter) {
            result = result.filter(o => o.revenue <= 0 || o.netPayout <= 0)
        }

        setFilteredOrders(result)
        setCurrentPage(1) // Reset to first page on filter change
    }, [orders, dateFrom, dateTo, searchQuery, platformFilter, abnormalFilter])

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage
    const indexOfFirstItem = indexOfLastItem - itemsPerPage
    const currentOrders = filteredOrders.slice(indexOfFirstItem, indexOfLastItem)
    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)

    const handlePageChange = (pageNumber: number) => {
        setCurrentPage(pageNumber)
    }

    // Export to CSV
    const handleExportCSV = () => {
        const headers = ["Order ID", "Date", "Platform", "Product", "Revenue", "Net Payout", "Profit", "Status"]
        const csvContent = [
            headers.join(","),
            ...filteredOrders.map((order: any) => [
                order.id,
                new Date(order.date).toLocaleDateString('vi-VN'),
                order.platform,
                `"${order.productNames}"`,
                order.revenue,
                order.netPayout,
                order.profit,
                order.status
            ].join(","))
        ].join("\n")

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.setAttribute("href", url)
        link.setAttribute("download", `orders_export_${new Date().toISOString().split('T')[0]}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <div className="p-8 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Quản lý đơn hàng</h2>
                    <p className="text-muted-foreground text-gray-500 dark:text-gray-400">
                        Theo dõi và xử lý đơn hàng từ tất cả các kênh bán hàng.
                    </p>
                </div>
                <div className="flex gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="ml-auto">
                                <Eye className="mr-2 h-4 w-4" /> Hiển thị cột
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {Object.keys(visibleColumns).map((column) => (
                                <DropdownMenuCheckboxItem
                                    key={column}
                                    className="capitalize"
                                    checked={visibleColumns[column as keyof typeof visibleColumns]}
                                    onCheckedChange={(checked) =>
                                        setVisibleColumns((prev) => ({ ...prev, [column]: checked }))
                                    }
                                >
                                    {column}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition shadow-sm"
                    >
                        <Download className="mr-2 h-4 w-4" /> Xuất Excel
                    </button>
                </div>
            </div>

            <OrderSummary orders={filteredOrders} />

            <OrderFilters
                dateFrom={dateFrom}
                dateTo={dateTo}
                setDateFrom={setDateFrom}
                setDateTo={setDateTo}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                platformFilter={platformFilter}
                setPlatformFilter={setPlatformFilter}
                abnormalFilter={abnormalFilter}
                setAbnormalFilter={setAbnormalFilter}
                filteredCount={filteredOrders.length}
            />

            <OrderTable
                orders={currentOrders}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                totalOrders={filteredOrders.length}
                indexOfFirstOrder={indexOfFirstItem}
                indexOfLastOrder={indexOfLastItem}
                loading={loading}
                visibleColumns={visibleColumns}
                sortField="date" // Default, update if implementing sorting state
                sortDirection="desc"
                onSort={() => { }} // Implement if needed
            />
        </div>
    )
}
