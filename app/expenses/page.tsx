"use client"

import { useState, useEffect, useMemo, Fragment } from "react"
import { Plus, Trash2, Filter, Calendar, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronRight, Edit, Repeat, Tag } from "lucide-react"
import { format, startOfMonth, endOfMonth, subDays, subMonths, subYears, isSameDay, differenceInDays } from "date-fns"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts'

interface Expense {
    id: string
    date: Date
    type: string
    category: string // Main category: Materials, Ads, Operating
    subcategory?: string // NEW: Subcategory for grouping
    amount: number
    note: string
    description?: string
    isSystem?: boolean // Flag for auto-generated expenses
    isRecurring?: boolean // NEW: Recurring expense flag
    costType?: string // NEW: "Fixed" | "Variable"
    details?: { label: string; amount: number }[] // NEW: Breakdown details
}

// Main categories
const EXPENSE_CATEGORIES = [
    { value: "Ads", label: "Marketing/Ads", color: "bg-purple-100 text-purple-800", icon: "📢", chartColor: "#a855f7" },
    { value: "Materials", label: "Vật liệu", color: "bg-orange-100 text-orange-800", icon: "📦", chartColor: "#f97316" },
    { value: "Operating", label: "Chi phí vận hành", color: "bg-gray-100 text-gray-800", icon: "🏢", chartColor: "#6b7280" },
    { value: "Platform", label: "Phí sàn", color: "bg-red-100 text-red-800", icon: "🛒", chartColor: "#ef4444" },
]

export default function ExpensesPage() {
    const [expenses, setExpenses] = useState<Expense[]>([])
    const [showForm, setShowForm] = useState(false)
    const [selectedCategory, setSelectedCategory] = useState<string>("all")
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set()) // Track expanded rows
    const [editingId, setEditingId] = useState<string | null>(null) // Track which expense is being edited

    // Date state
    const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
    const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
    const [activeRange, setActiveRange] = useState<'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'>('month')

    const [subcategorySuggestions, setSubcategorySuggestions] = useState<string[]>([])

    useEffect(() => {
        const savedPeriod = localStorage.getItem("defaultTimePeriod")
        if (savedPeriod && ['today', 'week', 'month', 'quarter', 'year', 'all'].includes(savedPeriod)) {
            // Map 'all' to 'custom' or handle it in setQuickRange if supported
            // The setQuickRange function supports: 'today' | 'week' | 'month' | 'quarter' | 'year'
            // If 'all', we might need to handle it manually or map to 'year' for now if 'all' isn't supported in setQuickRange
            if (savedPeriod === 'all') {
                setActiveRange('custom')
                setDateFrom('2020-01-01')
                setDateTo(format(new Date(), 'yyyy-MM-dd'))
            } else {
                setQuickRange(savedPeriod as any)
            }
        }
    }, [])

    // Form state
    const [formData, setFormData] = useState({
        date: format(new Date(), 'yyyy-MM-dd'),
        category: "Materials",
        subcategory: "",
        amount: "",
        note: "",
        isRecurring: false,
        costType: "Variable"
    })

    // Toggle row expansion
    const toggleExpand = (id: string) => {
        const newExpanded = new Set(expandedIds)
        if (newExpanded.has(id)) {
            newExpanded.delete(id)
        } else {
            newExpanded.add(id)
        }
        setExpandedIds(newExpanded)
    }

    // Fetch expenses and orders
    const fetchData = async () => {
        try {
            // Calculate previous period dates for comparison
            const currentFrom = new Date(dateFrom)
            const currentTo = new Date(dateTo)
            const diff = differenceInDays(currentTo, currentFrom) + 1
            const prevToDate = subDays(currentFrom, 1)
            const prevFromDate = subDays(prevToDate, diff - 1)

            const prevFrom = format(prevFromDate, 'yyyy-MM-dd')
            const prevTo = format(prevToDate, 'yyyy-MM-dd')

            // Fetch all required data in parallel
            const [currentExpRes, prevExpRes, currentOrdRes, prevOrdRes] = await Promise.all([
                fetch(`/api/expenses?startDate=${dateFrom}&endDate=${dateTo}`),
                fetch(`/api/expenses?startDate=${prevFrom}&endDate=${prevTo}`),
                fetch(`/api/orders?startDate=${dateFrom}&endDate=${dateTo}`),
                fetch(`/api/orders?startDate=${prevFrom}&endDate=${prevTo}`)
            ])

            const [currentExpData, prevExpData, currentOrdData, prevOrdData] = await Promise.all([
                currentExpRes.json(),
                prevExpRes.json(),
                currentOrdRes.json(),
                prevOrdRes.json()
            ])

            // Process Current Expenses
            const processExpenses = (data: any) => (data.expenses || data || []).map((e: any) => {
                let details = undefined;
                if (e.description) {
                    try {
                        const parsed = JSON.parse(e.description);
                        if (typeof parsed === 'object' && parsed !== null) {
                            details = Object.entries(parsed).map(([key, value]) => ({
                                label: key,
                                amount: Number(value)
                            })).filter(item => item.amount > 0).sort((a, b) => b.amount - a.amount);
                        }
                    } catch (err) { }
                }
                return { ...e, date: new Date(e.date), details };
            })

            const currentManualExpenses = processExpenses(currentExpData)
            const previousManualExpenses = processExpenses(prevExpData)

            // Extract unique subcategories
            const uniqueSubcategories = Array.from(
                new Set([...currentManualExpenses, ...previousManualExpenses]
                    .filter((e: any) => e.subcategory)
                    .map((e: any) => e.subcategory as string)
                )
            ).sort()
            setSubcategorySuggestions(uniqueSubcategories as string[])

            // Helper to calculate platform fees
            const calculatePlatformFees = (orders: any[]) => {
                const platformFeesMap = new Map<string, { total: number, details: Map<string, number> }>()

                orders.forEach(order => {
                    const date = new Date(order.date)
                    const monthKey = format(date, 'yyyy-MM')
                    const platform = order.platform
                    const groupKey = `${monthKey}|${platform}`

                    if (!platformFeesMap.has(groupKey)) {
                        platformFeesMap.set(groupKey, { total: 0, details: new Map() })
                    }
                    const group = platformFeesMap.get(groupKey)!

                    const addFee = (type: string, amount: number | undefined | null) => {
                        if (amount && amount > 0) {
                            group.total += amount
                            const currentDetail = group.details.get(type) || 0
                            group.details.set(type, currentDetail + amount)
                        }
                    }

                    if (platform === 'Shopee') {
                        addFee('Phí dịch vụ', order.serviceFee)
                        addFee('Phí thanh toán', order.paymentFee)
                        addFee('Phí cố định', order.fixedFee)
                        addFee('Phí Affiliate', order.affiliateFee)
                        addFee('Phí vận chuyển (Shop trả)', order.shippingFee)
                        addFee('Voucher/Giảm giá', order.promotion)
                        addFee('Thuế (VAT/PIT)', (order.taxVAT || 0) + (order.taxPIT || 0))
                        addFee('Voucher người bán', order.sellerVoucher)
                        addFee('Hoàn xu người bán', order.sellerCoinCashback)
                        addFee('Phí trả hàng', order.returnShippingFee)
                        addFee('Phí khác', order.otherFees)
                    } else if (platform === 'TikTok') {
                        addFee('Phí hoa hồng (Commission)', order.commissionFee)
                        addFee('Phí giao dịch (Transaction)', order.transactionFee)
                        addFee('Phí xử lý đơn hàng (Order processing)', order.orderProcessingFee)
                        addFee('Hoa hồng Affiliate (KOL/KOC)', order.affiliateCommission)
                        addFee('Hoa hồng Quảng cáo cửa hàng', order.adCommission)
                        addFee('Hoa hồng Đối tác', order.partnerCommission)
                        addFee('Hoa hồng Đối tác - Quảng cáo', order.affiliatePartnerShopAdsCommission)
                        addFee('Phí Flash Sale', order.flashSaleFee)
                        addFee('Phí dịch vụ khác', order.otherServiceFees)
                        addFee('Phí vận chuyển (Shop trả)', order.shippingFee)
                        addFee('Voucher/Giảm giá', order.promotion)
                        addFee('Thuế (VAT/PIT)', (order.taxVAT || 0) + (order.taxPIT || 0))
                        addFee('Phí khác', order.otherFees)
                    } else {
                        addFee('Phí khác', order.platformFee)
                    }

                    const currentTotal = Array.from(group.details.values()).reduce((a, b) => a + b, 0)
                    if (currentTotal === 0 && order.platformFee > 0) {
                        addFee('Phí sàn (Chung)', order.platformFee)
                    }
                })

                return Array.from(platformFeesMap.entries()).map(([key, data]) => {
                    const [month, platform] = key.split('|')
                    const date = new Date(`${month}-01`)
                    const details = Array.from(data.details.entries()).map(([label, amount]) => ({
                        label, amount
                    })).sort((a, b) => b.amount - a.amount)

                    return {
                        id: `sys-${key}`,
                        date: date,
                        type: "Platform",
                        category: "Platform",
                        subcategory: platform,
                        amount: data.total,
                        note: `Tự động tổng hợp từ đơn hàng ${month}`,
                        isSystem: true,
                        details: details,
                        costType: "Variable",
                        isRecurring: true
                    }
                })
            }

            const currentSystemExpenses = calculatePlatformFees(currentOrdData.orders || [])
            const previousSystemExpenses = calculatePlatformFees(prevOrdData.orders || [])

            // Merge and sort
            const allCurrentExpenses = [...currentManualExpenses, ...currentSystemExpenses].sort((a, b) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            )

            // We store ALL expenses (current + previous) in state but filter them in useMemo
            // Actually, to keep logic simple, let's just store everything in 'expenses' 
            // and let the existing useMemo logic handle the splitting based on date ranges.
            // However, existing useMemo relies on 'expenses' containing everything.
            // So we should combine them.

            const allExpenses = [...currentManualExpenses, ...previousManualExpenses, ...currentSystemExpenses, ...previousSystemExpenses]
            // Remove duplicates if any (though IDs should be unique enough or we don't care for display)

            setExpenses(allExpenses)
        } catch (error) {
            console.error("Failed to fetch data:", error)
        }
    }

    useEffect(() => {
        fetchData()
    }, [dateFrom, dateTo])

    // Number formatting helper
    const formatNumber = (value: string): string => {
        const numbers = value.replace(/\D/g, '')
        if (!numbers) return ''
        return new Intl.NumberFormat('vi-VN').format(parseInt(numbers))
    }

    const parseFormattedNumber = (value: string): number => {
        return parseInt(value.replace(/\D/g, '') || '0')
    }

    // Handle amount input with formatting
    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatNumber(e.target.value)
        setFormData({ ...formData, amount: formatted })
    }

    // Edit expense
    const handleEdit = (expense: Expense) => {
        setEditingId(expense.id)
        setFormData({
            date: format(new Date(expense.date), 'yyyy-MM-dd'),
            category: expense.category,
            subcategory: expense.subcategory || "",
            amount: new Intl.NumberFormat('vi-VN').format(expense.amount),
            note: expense.note || "",
            isRecurring: expense.isRecurring || false,
            costType: expense.costType || "Variable"
        })
        setShowForm(true)
    }

    // Add or Update expense
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        try {
            const payload = {
                id: editingId || undefined,
                date: formData.date,
                category: formData.category,
                subcategory: formData.subcategory || undefined,
                amount: parseFormattedNumber(formData.amount),
                note: formData.note,
                type: formData.category, // For backward compatibility
                isRecurring: formData.isRecurring,
                costType: formData.costType
            }

            const res = await fetch('/api/expenses', {
                method: editingId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            if (res.ok) {
                await fetchData()
                setShowForm(false)
                setEditingId(null)
                setFormData({
                    date: format(new Date(), 'yyyy-MM-dd'),
                    category: "Materials",
                    subcategory: "",
                    amount: "",
                    note: "",
                    isRecurring: false,
                    costType: "Variable"
                })
            } else {
                const error = await res.json()
                alert(`Lỗi: ${error.error || 'Không thể lưu chi phí'}`)
            }
        } catch (error) {
            console.error("Failed to save expense:", error)
            alert('Lỗi kết nối! Vui lòng thử lại.')
        }
    }

    // Delete expense
    const handleDelete = async (id: string) => {
        if (!confirm("Bạn chắc chắn muốn xóa chi phí này?")) return

        try {
            const res = await fetch(`/api/expenses?id=${id}`, {
                method: 'DELETE',
            })

            if (res.ok) {
                await fetchData()
            }
        } catch (error) {
            console.error("Failed to delete expense:", error)
        }
    }

    // --- Analytics Logic ---

    // 1. Calculate Previous Period Date Range
    const previousPeriod = useMemo(() => {
        const currentFrom = new Date(dateFrom)
        const currentTo = new Date(dateTo)

        let prevFrom: Date
        let prevTo: Date

        switch (activeRange) {
            case 'today':
                prevFrom = subDays(currentFrom, 1)
                prevTo = subDays(currentTo, 1)
                break
            case 'week':
                prevFrom = subDays(currentFrom, 7)
                prevTo = subDays(currentTo, 7)
                break
            case 'month':
                prevFrom = subMonths(currentFrom, 1)
                prevTo = subMonths(currentTo, 1) // This might need adjustment for end of month
                // Ensure end of month
                prevTo = endOfMonth(prevFrom)
                break
            case 'quarter':
                prevFrom = subMonths(currentFrom, 3)
                prevTo = subMonths(currentTo, 3)
                prevTo = endOfMonth(prevTo)
                break
            case 'year':
                prevFrom = subYears(currentFrom, 1)
                prevTo = subYears(currentTo, 1)
                break
            case 'custom':
            default:
                const diff = differenceInDays(currentTo, currentFrom) + 1
                prevTo = subDays(currentFrom, 1)
                prevFrom = subDays(prevTo, diff - 1)
                break
        }

        return { from: prevFrom, to: prevTo }
    }, [dateFrom, dateTo, activeRange])

    // 2. Filter Expenses for Current and Previous Period
    const { currentExpenses, previousExpenses } = useMemo(() => {
        const currentFrom = new Date(dateFrom)
        const currentTo = new Date(dateTo)
        currentTo.setHours(23, 59, 59, 999)

        const prevFrom = previousPeriod.from
        const prevTo = previousPeriod.to
        prevTo.setHours(23, 59, 59, 999)

        const current = expenses.filter(e => {
            const d = new Date(e.date)
            return d >= currentFrom && d <= currentTo
        })

        const previous = expenses.filter(e => {
            const d = new Date(e.date)
            return d >= prevFrom && d <= prevTo
        })

        return { currentExpenses: current, previousExpenses: previous }
    }, [expenses, dateFrom, dateTo, previousPeriod])

    // 3. Calculate Summary Stats with Comparison
    const summaryStats = useMemo(() => {
        return EXPENSE_CATEGORIES.map(cat => {
            const currentTotal = currentExpenses
                .filter(e => e.category === cat.value || e.type === cat.value)
                .reduce((sum, e) => sum + e.amount, 0)

            const prevTotal = previousExpenses
                .filter(e => e.category === cat.value || e.type === cat.value)
                .reduce((sum, e) => sum + e.amount, 0)

            const percentChange = prevTotal === 0
                ? (currentTotal > 0 ? 100 : 0)
                : ((currentTotal - prevTotal) / prevTotal) * 100

            return {
                ...cat,
                total: currentTotal,
                prevTotal,
                percentChange,
                trend: currentTotal > prevTotal ? 'up' : currentTotal < prevTotal ? 'down' : 'flat'
            }
        })
    }, [currentExpenses, previousExpenses])

    const totalCurrent = currentExpenses.reduce((sum, e) => sum + e.amount, 0)
    const totalPrevious = previousExpenses.reduce((sum, e) => sum + e.amount, 0)
    const totalPercentChange = totalPrevious === 0
        ? (totalCurrent > 0 ? 100 : 0)
        : ((totalCurrent - totalPrevious) / totalPrevious) * 100

    // 4. Filter for List View (apply category filter)
    const filteredListExpenses = currentExpenses.filter(e =>
        selectedCategory === "all" || e.category === selectedCategory || e.type === selectedCategory
    )

    // Quick date range buttons
    const setQuickRange = (range: 'today' | 'week' | 'month' | 'quarter' | 'year') => {
        setActiveRange(range)
        const today = new Date()
        let from = new Date()
        let to = new Date()

        switch (range) {
            case 'today':
                from = to = today
                break
            case 'week':
                from = new Date(today.setDate(today.getDate() - 7))
                to = new Date()
                break
            case 'month':
                from = startOfMonth(new Date())
                to = endOfMonth(new Date())
                break
            case 'quarter':
                const currentMonth = new Date().getMonth()
                const quarterStart = Math.floor(currentMonth / 3) * 3
                from = new Date(new Date().getFullYear(), quarterStart, 1)
                to = new Date(new Date().getFullYear(), quarterStart + 3, 0)
                break
            case 'year':
                from = new Date(new Date().getFullYear(), 0, 1)
                to = new Date(new Date().getFullYear(), 11, 31)
                break
        }

        setDateFrom(format(from, 'yyyy-MM-dd'))
        setDateTo(format(to, 'yyyy-MM-dd'))
    }

    return (
        <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">Quản lý Chi phí</h2>
                    <p className="text-gray-500 mt-1">
                        Theo dõi và tối ưu hóa các khoản chi tiêu của shop.
                    </p>
                </div>
                <button
                    onClick={() => {
                        setEditingId(null)
                        setShowForm(!showForm)
                        if (!showForm && selectedCategory !== 'all' && selectedCategory !== 'Platform') {
                            setFormData(prev => ({ ...prev, category: selectedCategory }))
                        } else {
                            setFormData({
                                date: format(new Date(), 'yyyy-MM-dd'),
                                category: "Materials",
                                subcategory: "",
                                amount: "",
                                note: "",
                                isRecurring: false,
                                costType: "variable"
                            })
                        }
                    }}
                    className="flex items-center justify-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition shadow-sm font-medium"
                >
                    <Plus className="mr-2 h-4 w-4" /> Thêm chi phí
                </button>
            </div>

            {/* Summary Cards (Clickable) */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                {/* Total Card */}
                <div
                    onClick={() => setSelectedCategory('all')}
                    className={`p-5 rounded-xl border transition-all cursor-pointer relative overflow-hidden group
                        ${selectedCategory === 'all'
                            ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500 shadow-md'
                            : 'bg-white border-gray-200 hover:border-emerald-300 hover:shadow-md'
                        }`}
                >
                    <div className="flex justify-between items-start mb-2">
                        <div className="text-sm font-medium text-gray-500 uppercase tracking-wider">Tổng chi phí</div>
                        <div className={`p-1.5 rounded-full ${selectedCategory === 'all' ? 'bg-emerald-200' : 'bg-gray-100 group-hover:bg-emerald-100'}`}>
                            <Filter className={`h-4 w-4 ${selectedCategory === 'all' ? 'text-emerald-700' : 'text-gray-500 group-hover:text-emerald-600'}`} />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                        {new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(totalCurrent)} ₫
                    </div>
                    <div className="mt-2 flex items-center text-xs">
                        {totalPercentChange > 0 ? (
                            <span className="text-red-600 flex items-center font-medium bg-red-50 px-1.5 py-0.5 rounded">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                {Math.abs(totalPercentChange).toFixed(1)}%
                            </span>
                        ) : totalPercentChange < 0 ? (
                            <span className="text-emerald-600 flex items-center font-medium bg-emerald-50 px-1.5 py-0.5 rounded">
                                <TrendingDown className="h-3 w-3 mr-1" />
                                {Math.abs(totalPercentChange).toFixed(1)}%
                            </span>
                        ) : (
                            <span className="text-gray-500 flex items-center font-medium bg-gray-100 px-1.5 py-0.5 rounded">
                                <Minus className="h-3 w-3 mr-1" /> 0%
                            </span>
                        )}
                        <span className="text-gray-400 ml-2">vs kỳ trước</span>
                    </div>
                </div>

                {/* Category Cards */}
                {summaryStats.map((cat) => (
                    <div
                        key={cat.value}
                        onClick={() => setSelectedCategory(selectedCategory === cat.value ? 'all' : cat.value)}
                        className={`p-5 rounded-xl border transition-all cursor-pointer relative overflow-hidden group
                            ${selectedCategory === cat.value
                                ? `bg-white border-${cat.color.split('-')[1]}-500 ring-1 ring-${cat.color.split('-')[1]}-500 shadow-md`
                                : 'bg-white border-gray-200 hover:shadow-md'
                            }`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                                <span className="text-lg">{cat.icon}</span>
                                <span className="text-sm font-medium text-gray-600 truncate max-w-[100px]">{cat.label}</span>

                            </div>
                        </div>
                        <div className="text-xl font-bold text-gray-900 mt-1">
                            {new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(cat.total)} ₫
                        </div>
                        <div className="mt-2 flex items-center text-xs">
                            {cat.percentChange > 0 ? (
                                <span className="text-red-600 flex items-center font-medium bg-red-50 px-1.5 py-0.5 rounded">
                                    <TrendingUp className="h-3 w-3 mr-1" />
                                    {Math.abs(cat.percentChange).toFixed(1)}%
                                </span>
                            ) : cat.percentChange < 0 ? (
                                <span className="text-emerald-600 flex items-center font-medium bg-emerald-50 px-1.5 py-0.5 rounded">
                                    <TrendingDown className="h-3 w-3 mr-1" />
                                    {Math.abs(cat.percentChange).toFixed(1)}%
                                </span>
                            ) : (
                                <span className="text-gray-500 flex items-center font-medium bg-gray-100 px-1.5 py-0.5 rounded">
                                    <Minus className="h-3 w-3 mr-1" /> 0%
                                </span>
                            )}
                            <span className="text-gray-400 ml-2">vs kỳ trước</span>
                        </div>

                        {/* Active Indicator Line */}
                        {selectedCategory === cat.value && (
                            <div className={`absolute bottom-0 left-0 right-0 h-1 ${cat.color.replace('bg-', 'bg-').replace('text-', 'bg-').split(' ')[0].replace('100', '500')}`} />
                        )}
                    </div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid gap-6 md:grid-cols-2">
                <div className="bg-white p-6 rounded-xl shadow-sm border">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">Phân bổ chi phí</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={summaryStats.filter(s => s.total > 0)}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={2}
                                    dataKey="total"
                                    nameKey="label"
                                    onClick={(data) => setSelectedCategory(data.value === selectedCategory ? 'all' : data.value)}
                                    cursor="pointer"
                                >
                                    {summaryStats.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.chartColor}
                                            strokeWidth={selectedCategory === entry.value ? 2 : 0}
                                            stroke="#000"
                                            opacity={selectedCategory === 'all' || selectedCategory === entry.value ? 1 : 0.3}
                                        />
                                    ))}
                                </Pie>
                                <RechartsTooltip
                                    formatter={(value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Cost Structure Analysis */}
                <div className="bg-white p-6 rounded-xl shadow-sm border">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">Cấu trúc chi phí</h3>
                    <div className="space-y-4">
                        {(() => {
                            const fixedCosts = currentExpenses.filter(e => e.costType === 'Fixed').reduce((sum, e) => sum + e.amount, 0)
                            const variableCosts = currentExpenses.filter(e => e.costType === 'Variable' || !e.costType).reduce((sum, e) => sum + e.amount, 0)
                            const total = fixedCosts + variableCosts

                            return (
                                <>
                                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                                                <Tag className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-700">Chi phí cố định (Fixed)</p>
                                                <p className="text-xs text-gray-500">Mặt bằng, lương cứng, phần mềm...</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-blue-700">{new Intl.NumberFormat('vi-VN').format(fixedCosts)} ₫</p>
                                            <p className="text-xs text-blue-600">{total > 0 ? ((fixedCosts / total) * 100).toFixed(1) : 0}%</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-100">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-orange-100 rounded-full text-orange-600">
                                                <TrendingUp className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-700">Chi phí biến đổi (Variable)</p>
                                                <p className="text-xs text-gray-500">Ads, nguyên liệu, phí sàn...</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-orange-700">{new Intl.NumberFormat('vi-VN').format(variableCosts)} ₫</p>
                                            <p className="text-xs text-orange-600">{total > 0 ? ((variableCosts / total) * 100).toFixed(1) : 0}%</p>
                                        </div>
                                    </div>
                                </>
                            )
                        })()}
                    </div>
                </div>
            </div>

            {/* Add Expense Form */}
            {showForm && (
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 animate-in fade-in slide-in-from-top-4 duration-200">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <div className={`p-1.5 ${editingId ? 'bg-blue-100' : 'bg-emerald-100'} rounded-lg`}>
                            {editingId ? <Edit className="h-5 w-5 text-blue-600" /> : <Plus className="h-5 w-5 text-emerald-600" />}
                        </div>
                        {editingId ? 'Chỉnh sửa chi phí' : 'Thêm chi phí mới'}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Ngày</label>
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Loại chi phí</label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value, subcategory: "" })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                >
                                    {EXPENSE_CATEGORIES.filter(c => c.value !== 'Platform').map(cat => (
                                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Subcategory (conditional) */}
                        {formData.category === 'Ads' ? (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Phân loại chi tiết (Marketing/Ads)
                                </label>
                                <select
                                    value={formData.subcategory}
                                    onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                >
                                    <option value="">-- Chọn loại --</option>
                                    <option value="Ads">Ads</option>
                                    <option value="Booking">Booking</option>
                                    <option value="Dịch vụ thuê ngoài">Dịch vụ thuê ngoài</option>
                                    <option value="Khác">Khác</option>
                                </select>
                            </div>
                        ) : (formData.category === 'Materials' || formData.category === 'Operating') && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Phân loại chi tiết {formData.category === 'Materials' ? '(Vật liệu)' : '(Vận hành)'}
                                    <span className="text-gray-400 text-xs ml-1">(Tùy chọn)</span>
                                </label>
                                <input
                                    type="text"
                                    list="subcategory-suggestions"
                                    value={formData.subcategory}
                                    onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    placeholder="Ví dụ: Vải cotton, Thuê mặt bằng..."
                                />
                                <datalist id="subcategory-suggestions">
                                    {subcategorySuggestions.map(sub => (
                                        <option key={sub} value={sub} />
                                    ))}
                                </datalist>
                                <p className="text-xs text-gray-500 mt-1">
                                    💡 Gõ tự do hoặc chọn từ gợi ý có sẵn
                                </p>
                            </div>
                        )}

                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền (VND)</label>
                                <input
                                    type="text"
                                    value={formData.amount}
                                    onChange={handleAmountChange}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono"
                                    placeholder="0"
                                    required
                                />
                                {formData.amount && (
                                    <p className="text-xs text-gray-500 mt-1 font-medium text-emerald-600">
                                        {parseFormattedNumber(formData.amount).toLocaleString('vi-VN')} ₫
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                                <input
                                    type="text"
                                    value={formData.note}
                                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    placeholder="Mô tả chi tiết..."
                                />
                            </div>
                        </div>

                        {/* New Fields: Recurring & Cost Type */}
                        <div className="grid gap-4 md:grid-cols-2 bg-gray-50 p-3 rounded-lg border">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Loại chi phí (Tính chất)</label>
                                <div className="flex gap-4 mt-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="costType"
                                            value="Variable"
                                            checked={formData.costType === 'Variable'}
                                            onChange={() => setFormData({ ...formData, costType: 'Variable' })}
                                            className="text-emerald-600 focus:ring-emerald-500"
                                        />
                                        <span className="text-sm text-gray-700">Biến đổi (Variable)</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="costType"
                                            value="Fixed"
                                            checked={formData.costType === 'Fixed'}
                                            onChange={() => setFormData({ ...formData, costType: 'Fixed' })}
                                            className="text-emerald-600 focus:ring-emerald-500"
                                        />
                                        <span className="text-sm text-gray-700">Cố định (Fixed)</span>
                                    </label>
                                </div>
                            </div>
                            <div className="flex items-center">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.isRecurring}
                                        onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                                        className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                    />
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                            <Repeat className="h-3 w-3" /> Chi phí định kỳ
                                        </span>
                                        <span className="text-xs text-gray-500">Lặp lại hàng tháng (ví dụ: tiền thuê nhà, lương)</span>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowForm(false)
                                    setEditingId(null)
                                    setFormData({
                                        date: format(new Date(), 'yyyy-MM-dd'),
                                        category: "Materials",
                                        subcategory: "",
                                        amount: "",
                                        note: "",
                                        isRecurring: false,
                                        costType: "Variable"
                                    })
                                }}
                                className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition text-gray-700"
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition shadow-sm"
                            >
                                {editingId ? 'Cập nhật' : 'Lưu chi phí'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Controls Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex flex-wrap items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700 mr-2">Thời gian:</span>

                    {/* Quick buttons */}
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        {(['today', 'week', 'month', 'quarter', 'year'] as const).map(range => (
                            <button
                                key={range}
                                onClick={() => setQuickRange(range)}
                                className={`px-3 py-1 text-xs rounded-md transition-all ${activeRange === range
                                    ? 'bg-white text-emerald-700 shadow-sm font-medium'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                {range === 'today' ? 'Hôm nay' :
                                    range === 'week' ? '7 ngày' :
                                        range === 'month' ? 'Tháng này' :
                                            range === 'quarter' ? 'Quý này' : 'Năm nay'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                        <DatePickerWithRange
                            dateFrom={new Date(dateFrom)}
                            dateTo={new Date(dateTo)}
                            onSelect={(range) => {
                                setDateFrom(format(range.from, 'yyyy-MM-dd'))
                                setDateTo(format(range.to, 'yyyy-MM-dd'))
                                setActiveRange('custom')
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Expense List Table */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                        Danh sách chi phí
                        {selectedCategory !== 'all' && (
                            <span className="text-xs font-normal bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                                Đang lọc: {EXPENSE_CATEGORIES.find(c => c.value === selectedCategory)?.label}
                            </span>
                        )}
                    </h3>
                    <div className="text-sm text-gray-500">
                        {filteredListExpenses.length} giao dịch
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-3 font-medium">Ngày</th>
                                <th className="px-6 py-3 font-medium">Loại</th>
                                <th className="px-6 py-3 font-medium">Phân loại chi tiết</th>
                                <th className="px-6 py-3 font-medium text-right">Số tiền</th>
                                <th className="px-6 py-3 font-medium">Ghi chú</th>
                                <th className="px-6 py-3 font-medium text-center">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredListExpenses.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center text-gray-400">
                                            <Filter className="h-8 w-8 mb-2 opacity-20" />
                                            <p>Chưa có chi phí nào trong khoảng thời gian này!</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredListExpenses.map((expense) => {
                                    const category = EXPENSE_CATEGORIES.find(c => c.value === expense.category || c.value === expense.type)
                                    const isExpanded = expandedIds.has(expense.id)
                                    const hasDetails = expense.details && expense.details.length > 0

                                    return (
                                        <Fragment key={expense.id}>
                                            <tr
                                                className={`hover:bg-gray-50 transition-colors ${expense.isSystem ? 'bg-gray-50/30' : ''} ${isExpanded ? 'bg-gray-50' : ''}`}
                                                onClick={() => hasDetails && toggleExpand(expense.id)}
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-600 flex items-center gap-2 cursor-pointer">
                                                    {hasDetails && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                toggleExpand(expense.id)
                                                            }}
                                                            className="p-1 hover:bg-gray-200 rounded-full transition"
                                                        >
                                                            {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                                                        </button>
                                                    )}
                                                    {!hasDetails && <div className="w-6" />} {/* Spacer */}

                                                    {format(new Date(expense.date), 'dd/MM/yyyy')}
                                                    {expense.isSystem && (
                                                        <span className="ml-2 px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-medium rounded border border-gray-200">AUTO</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${category?.color}`}>
                                                            {category?.icon} {category?.label}
                                                        </span>
                                                        {expense.isRecurring && (
                                                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded flex items-center gap-0.5" title="Chi phí định kỳ">
                                                                <Repeat className="h-3 w-3" />
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-gray-900">{expense.subcategory || '-'}</span>
                                                        {expense.costType && (
                                                            <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                                                                {expense.costType === 'Fixed' ? 'Cố định' : 'Biến đổi'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold text-gray-900">
                                                    {new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(expense.amount)} ₫
                                                </td>
                                                <td className="px-6 py-4 text-gray-500 max-w-[200px] truncate" title={expense.note}>
                                                    {expense.note || '-'}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {!expense.isSystem && (
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    handleEdit(expense)
                                                                }}
                                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                                title="Chỉnh sửa"
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    handleDelete(expense.id)
                                                                }}
                                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                                title="Xóa"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>

                                            {/* Expanded Details Row */}
                                            {isExpanded && hasDetails && (
                                                <tr className="bg-gray-50/50 animate-in fade-in slide-in-from-top-1 duration-200">
                                                    <td colSpan={6} className="px-6 py-4 pl-14">
                                                        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm max-w-3xl">
                                                            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                                                Chi tiết phí sàn
                                                                <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                                                    {expense.subcategory}
                                                                </span>
                                                            </h4>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                                                                {expense.details!.map((detail, idx) => (
                                                                    <div key={idx} className="flex justify-between items-center text-sm py-1 border-b border-gray-50 last:border-0">
                                                                        <span className="text-gray-600">{detail.label}</span>
                                                                        <span className="font-medium text-gray-900">
                                                                            {new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(detail.amount)} ₫
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
