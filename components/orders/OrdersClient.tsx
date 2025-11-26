"use client"

import { useState, useEffect } from "react"
import { OrderSummary } from "@/components/orders/OrderSummary"
import { OrderFilters } from "@/components/orders/OrderFilters"
import { OrderTable } from "@/components/orders/OrderTable"
import { Order } from "@/components/orders/OrderRow"
import { Download, Eye } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { startOfMonth, endOfMonth } from "date-fns"
import useSWR from 'swr'

interface OrdersClientProps {
    initialData: any
    initialDateFrom?: Date
    initialDateTo?: Date
}

const fetcher = (url: string) => fetch(url).then(r => {
    if (!r.ok) throw new Error('Failed to fetch orders')
    return r.json()
})

export function OrdersClient({ initialData, initialDateFrom, initialDateTo }: OrdersClientProps) {
    // Filter States
    const [dateFrom, setDateFrom] = useState<Date>(initialDateFrom || startOfMonth(new Date()))
    const [dateTo, setDateTo] = useState<Date>(initialDateTo || endOfMonth(new Date()))
    const [searchQuery, setSearchQuery] = useState("")
    const [platformFilter, setPlatformFilter] = useState("all")
    const [abnormalFilter, setAbnormalFilter] = useState(false)

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage] = useState(50)

    // Interaction State (to know when to use SWR vs initialData)
    const [hasUserInteracted, setHasUserInteracted] = useState(false)

    // Column Visibility State
    const [visibleColumns, setVisibleColumns] = useState({
        date: true,
        id: true,
        platform: true,
        customer: true,
        product: false,
        quantity: false,
        revenue: true,
        net: true,
        profit: true,
        profitMargin: true,
        actions: true
    })

    // Load default period from localStorage on mount
    useEffect(() => {
        const savedPeriod = localStorage.getItem("defaultTimePeriod")
        if (savedPeriod && ['today', 'week', 'month', 'year', 'all'].includes(savedPeriod)) {
            const today = new Date()
            if (savedPeriod === 'today') {
                setDateFrom(today)
                setDateTo(today)
                setHasUserInteracted(true)
            } else if (savedPeriod === 'year') {
                setDateFrom(new Date(today.getFullYear(), 0, 1))
                setDateTo(new Date(today.getFullYear(), 11, 31))
                setHasUserInteracted(true)
            } else if (savedPeriod === 'all') {
                setDateFrom(new Date('2020-01-01'))
                setDateTo(today)
                setHasUserInteracted(true)
            } else if (savedPeriod === 'month') {
                setDateFrom(startOfMonth(today))
                setDateTo(endOfMonth(today))
                // Default, matches server if passed correctly
            }
        }
    }, [])

    // Reset page when filters change
    useEffect(() => {
        if (hasUserInteracted) {
            setCurrentPage(1)
        }
    }, [dateFrom, dateTo, searchQuery, platformFilter, abnormalFilter])

    // Construct Query Key
    const queryParams = new URLSearchParams()
    if (dateFrom) queryParams.append('startDate', dateFrom.toISOString())
    if (dateTo) queryParams.append('endDate', dateTo.toISOString())
    queryParams.append('page', currentPage.toString())
    queryParams.append('limit', itemsPerPage.toString())
    if (searchQuery) queryParams.append('search', searchQuery)
    if (platformFilter !== 'all') queryParams.append('platform', platformFilter)
    if (abnormalFilter) queryParams.append('abnormal', 'true')

    const { data, error, isLoading } = useSWR(
        `/api/orders?${queryParams.toString()}`,
        fetcher,
        {
            fallbackData: hasUserInteracted ? undefined : initialData,
            revalidateOnFocus: false,
            dedupingInterval: 60000,
            keepPreviousData: true
        }
    )

    // Process Data (Client-side calculations for COGS/Profit if needed, 
    // but ideally API should return this. The previous code did it client-side.
    // Let's keep the client-side processing for now to match previous logic, 
    // or better, move it to API later. For now, we process `data.orders`.)

    const processOrders = (rawOrders: any[]) => {
        return rawOrders.map((order: any) => {
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
    }

    const orders = data?.orders ? processOrders(data.orders) : []
    const totalPages = data?.pagination?.totalPages || 1
    const totalOrders = data?.pagination?.total || 0
    const summaryData = data?.summary ? {
        totalRevenue: data.summary.totalRevenue,
        totalNet: data.summary.totalNet,
        totalFees: data.summary.totalFees,
        totalOrders: data.pagination.total
    } : undefined

    // Wrappers for state updates to track interaction
    const handleDateFromChange = (d: Date | undefined) => { if (d) { setDateFrom(d); setHasUserInteracted(true) } }
    const handleDateToChange = (d: Date | undefined) => { if (d) { setDateTo(d); setHasUserInteracted(true) } }
    const handleSearchChange = (s: string) => { setSearchQuery(s); setHasUserInteracted(true) }
    const handlePlatformChange = (p: string) => { setPlatformFilter(p); setHasUserInteracted(true) }
    const handleAbnormalChange = (b: boolean) => { setAbnormalFilter(b); setHasUserInteracted(true) }
    const handlePageChange = (p: number) => { setCurrentPage(p); setHasUserInteracted(true) }

    // Export to CSV
    const handleExportCSV = () => {
        const headers = ["Order ID", "Date", "Platform", "Product", "Revenue", "Net Payout", "Profit", "Status"]
        const csvContent = [
            headers.join(","),
            ...orders.map((order: any) => [
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

    if (error) return <div className="p-8 text-red-500">Failed to load orders</div>
    if (!data && !initialData) return <div className="p-8">Loading...</div>

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

            <OrderSummary orders={orders} summaryData={summaryData} />

            <OrderFilters
                dateFrom={dateFrom}
                dateTo={dateTo}
                setDateFrom={handleDateFromChange}
                setDateTo={handleDateToChange}
                searchQuery={searchQuery}
                setSearchQuery={handleSearchChange}
                platformFilter={platformFilter}
                setPlatformFilter={handlePlatformChange}
                abnormalFilter={abnormalFilter}
                setAbnormalFilter={handleAbnormalChange}
                filteredCount={totalOrders}
            />

            <OrderTable
                orders={orders}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                totalOrders={totalOrders}
                indexOfFirstOrder={(currentPage - 1) * itemsPerPage}
                indexOfLastOrder={Math.min(currentPage * itemsPerPage, totalOrders)}
                loading={isLoading && hasUserInteracted}
                visibleColumns={visibleColumns}
                sortField="date"
                sortDirection="desc"
                onSort={() => { }}
            />
        </div>
    )
}
