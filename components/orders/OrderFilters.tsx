"use client"

import { Search, Filter, AlertTriangle } from "lucide-react"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { format } from "date-fns"

interface OrderFiltersProps {
    dateFrom: Date
    dateTo: Date
    setDateFrom: (date: Date) => void
    setDateTo: (date: Date) => void
    searchQuery: string
    setSearchQuery: (query: string) => void
    platformFilter: string
    setPlatformFilter: (platform: string) => void
    abnormalFilter: boolean
    setAbnormalFilter: (abnormal: boolean) => void
    filteredCount: number
}

export function OrderFilters({
    dateFrom,
    dateTo,
    setDateFrom,
    setDateTo,
    searchQuery,
    setSearchQuery,
    platformFilter,
    setPlatformFilter,
    abnormalFilter,
    setAbnormalFilter,
    filteredCount
}: OrderFiltersProps) {
    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border">
            <div className="grid gap-4 md:grid-cols-6">
                {/* Date Range Picker */}
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Thời gian
                    </label>
                    <DatePickerWithRange
                        dateFrom={dateFrom}
                        dateTo={dateTo}
                        onSelect={(range) => {
                            if (range?.from) setDateFrom(range.from)
                            if (range?.to) setDateTo(range.to)
                        }}
                        className="w-full"
                    />
                </div>

                {/* Search */}
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tìm kiếm
                    </label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Nhập mã đơn hàng..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>

                {/* Platform Filter */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sàn
                    </label>
                    <select
                        value={platformFilter}
                        onChange={(e) => setPlatformFilter(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="all">Tất cả</option>
                        <option value="Shopee">Shopee</option>
                        <option value="TikTok">TikTok</option>
                        <option value="Facebook">Facebook</option>
                        <option value="Instagram">Instagram</option>
                    </select>
                </div>


            </div>

            {/* Abnormal Filter Toggle */}
            <div className="mt-4 pt-4 border-t">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={abnormalFilter}
                        onChange={(e) => setAbnormalFilter(e.target.checked)}
                        className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                    />
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium text-gray-700">
                        Đơn bất thường (doanh thu ≤ 0)
                    </span>
                    {abnormalFilter && (
                        <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
                            {filteredCount} đơn
                        </span>
                    )}
                </label>
            </div>
        </div>
    )
}
