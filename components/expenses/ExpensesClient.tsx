"use client"

import { useState, useEffect, useMemo } from "react"
import { Plus, Trash2, Filter, TrendingUp, TrendingDown, Minus, Edit, Tag } from "lucide-react"
import { format, startOfMonth, endOfMonth, subDays, subMonths, subYears, differenceInDays } from "date-fns"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts'
import useSWR, { mutate } from 'swr'
import { TimePeriodFilter } from "@/components/TimePeriodFilter"
import { DateRange } from "react-day-picker"

// Types
interface Expense {
    id: string
    date: string | Date
    type: string
    category: string
    subcategory?: string
    amount: number
    note: string
    description?: string
    isSystem?: boolean
    isRecurring?: boolean
    costType?: string
    details?: { label: string; amount: number }[]
}

const EXPENSE_CATEGORIES = [
    { value: "Ads", label: "Marketing/Ads", color: "bg-purple-100 text-purple-800", icon: "📢", chartColor: "#a855f7" },
    { value: "Materials", label: "Vật liệu", color: "bg-orange-100 text-orange-800", icon: "📦", chartColor: "#f97316" },
    { value: "Operating", label: "Chi phí vận hành", color: "bg-gray-100 text-gray-800", icon: "🏢", chartColor: "#6b7280" },
    { value: "Platform", label: "Phí sàn", color: "bg-red-100 text-red-800", icon: "🛒", chartColor: "#ef4444" },
]

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface ExpensesClientProps {
    initialData: { expenses: Expense[] }
    initialDateRange: { from: Date, to: Date }
}

export function ExpensesClient({ initialData, initialDateRange }: ExpensesClientProps) {
    // State
    const [period, setPeriod] = useState('this_month')
    const [dateRange, setDateRange] = useState<DateRange | undefined>(initialDateRange)
    const [showForm, setShowForm] = useState(false)
    const [selectedCategory, setSelectedCategory] = useState<string>("all")
    const [editingId, setEditingId] = useState<string | null>(null)
    const [hasUserInteracted, setHasUserInteracted] = useState(false)

    // Form State
    const [formData, setFormData] = useState({
        date: format(new Date(), 'yyyy-MM-dd'),
        category: "Materials",
        subcategory: "",
        amount: "",
        note: "",
        isRecurring: false,
        costType: "Variable"
    })

    // Load default period
    useEffect(() => {
        const savedPeriod = localStorage.getItem("defaultTimePeriod")
        if (savedPeriod && ['today', 'week', 'month', 'year', 'all'].includes(savedPeriod)) {
            if (savedPeriod === 'today') {
                setPeriod('today')
                setDateRange({ from: new Date(), to: new Date() })
                setHasUserInteracted(true)
            } else if (savedPeriod === 'year') {
                setPeriod('this_year')
                setDateRange({ from: startOfMonth(new Date(new Date().getFullYear(), 0, 1)), to: endOfMonth(new Date()) })
                setHasUserInteracted(true)
            } else if (savedPeriod === 'all') {
                setPeriod('all')
                setDateRange({ from: new Date('2020-01-01'), to: new Date() })
                setHasUserInteracted(true)
            } else if (savedPeriod === 'month') {
                setPeriod('this_month')
                setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) })
            }
        }
    }, [])

    // Calculate Previous Period
    const previousPeriod = useMemo(() => {
        if (!dateRange?.from || !dateRange?.to) return { from: subMonths(new Date(), 1), to: subMonths(new Date(), 1) }

        const currentFrom = dateRange.from
        const currentTo = dateRange.to
        const diff = differenceInDays(currentTo, currentFrom) + 1

        // Simple logic: subtract duration
        const prevTo = subDays(currentFrom, 1)
        const prevFrom = subDays(prevTo, diff - 1)

        return { from: prevFrom, to: prevTo }
    }, [dateRange])

    // Fetch Data (Current & Previous)
    const queryCurrent = dateRange?.from && dateRange?.to
        ? `/api/expenses?startDate=${dateRange.from.toISOString()}&endDate=${dateRange.to.toISOString()}`
        : null

    const queryPrevious = previousPeriod.from && previousPeriod.to
        ? `/api/expenses?startDate=${previousPeriod.from.toISOString()}&endDate=${previousPeriod.to.toISOString()}`
        : null

    const { data: currentData, mutate: mutateCurrent } = useSWR(
        queryCurrent,
        fetcher,
        {
            fallbackData: hasUserInteracted ? undefined : initialData,
            revalidateOnFocus: false
        }
    )

    const { data: prevData } = useSWR(
        queryPrevious,
        fetcher,
        { revalidateOnFocus: false }
    )

    const expenses = currentData?.expenses || []
    const prevExpenses = prevData?.expenses || []

    // --- Analytics Logic ---
    const summaryStats = useMemo(() => {
        return EXPENSE_CATEGORIES.map(cat => {
            const currentTotal = expenses
                .filter((e: Expense) => e.category === cat.value || e.type === cat.value)
                .reduce((sum: number, e: Expense) => sum + e.amount, 0)

            const prevTotal = prevExpenses
                .filter((e: Expense) => e.category === cat.value || e.type === cat.value)
                .reduce((sum: number, e: Expense) => sum + e.amount, 0)

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
    }, [expenses, prevExpenses])

    const totalCurrent = expenses.reduce((sum: number, e: Expense) => sum + e.amount, 0)
    const totalPrevious = prevExpenses.reduce((sum: number, e: Expense) => sum + e.amount, 0)
    const totalPercentChange = totalPrevious === 0
        ? (totalCurrent > 0 ? 100 : 0)
        : ((totalCurrent - totalPrevious) / totalPrevious) * 100

    const filteredListExpenses = expenses.filter((e: Expense) =>
        selectedCategory === "all" || e.category === selectedCategory || e.type === selectedCategory
    )

    // --- Handlers ---
    const handlePeriodChange = (p: any) => { setPeriod(p); setHasUserInteracted(true) }
    const handleDateRangeChange = (r: DateRange | undefined) => { setDateRange(r); setHasUserInteracted(true) }

    const formatNumber = (val: string) => val.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ".")
    const parseNumber = (val: string) => parseInt(val.replace(/\./g, '') || '0')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const payload = {
                id: editingId || undefined,
                ...formData,
                amount: parseNumber(formData.amount),
                type: formData.category
            }

            const res = await fetch('/api/expenses', {
                method: editingId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            if (res.ok) {
                mutateCurrent() // Refresh data
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
            }
        } catch (error) {
            console.error("Failed to save", error)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Xóa chi phí này?")) return
        await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' })
        mutateCurrent()
    }

    const handleEdit = (expense: Expense) => {
        setEditingId(expense.id)
        setFormData({
            date: format(new Date(expense.date), 'yyyy-MM-dd'),
            category: expense.category,
            subcategory: expense.subcategory || "",
            amount: new Intl.NumberFormat('vi-VN').format(expense.amount).replace(/,/g, '.'), // Adjust for locale
            note: expense.note || "",
            isRecurring: expense.isRecurring || false,
            costType: expense.costType || "Variable"
        })
        setShowForm(true)
    }

    return (
        <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Quản lý Chi phí</h2>
                    <p className="text-gray-500 mt-1">Theo dõi và tối ưu hóa các khoản chi tiêu.</p>
                </div>
                <div className="flex items-center gap-4">
                    <TimePeriodFilter
                        period={period as any}
                        setPeriod={handlePeriodChange}
                        dateRange={dateRange}
                        setDateRange={handleDateRangeChange}
                    />
                    <button
                        onClick={() => {
                            setEditingId(null)
                            setShowForm(!showForm)
                            setFormData(prev => ({ ...prev, amount: "" }))
                        }}
                        className="flex items-center justify-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition shadow-sm font-medium"
                    >
                        <Plus className="mr-2 h-4 w-4" /> Thêm chi phí
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <div
                    onClick={() => setSelectedCategory('all')}
                    className={`p-5 rounded-xl border transition-all cursor-pointer relative overflow-hidden group
                        ${selectedCategory === 'all'
                            ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500 shadow-md'
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-emerald-300'
                        }`}
                >
                    <div className="flex justify-between items-start mb-2">
                        <div className="text-sm font-medium text-gray-500 uppercase">Tổng chi phí</div>
                        <Filter className={`h-4 w-4 ${selectedCategory === 'all' ? 'text-emerald-700' : 'text-gray-400'}`} />
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {new Intl.NumberFormat('vi-VN').format(totalCurrent)} ₫
                    </div>
                    <div className="mt-2 flex items-center text-xs">
                        {totalPercentChange > 0 ? (
                            <span className="text-red-600 flex items-center font-medium bg-red-50 px-1.5 py-0.5 rounded">
                                <TrendingUp className="h-3 w-3 mr-1" /> {Math.abs(totalPercentChange).toFixed(1)}%
                            </span>
                        ) : (
                            <span className="text-emerald-600 flex items-center font-medium bg-emerald-50 px-1.5 py-0.5 rounded">
                                <TrendingDown className="h-3 w-3 mr-1" /> {Math.abs(totalPercentChange).toFixed(1)}%
                            </span>
                        )}
                        <span className="text-gray-400 ml-2">vs kỳ trước</span>
                    </div>
                </div>

                {summaryStats.map((cat) => (
                    <div
                        key={cat.value}
                        onClick={() => setSelectedCategory(selectedCategory === cat.value ? 'all' : cat.value)}
                        className={`p-5 rounded-xl border transition-all cursor-pointer relative overflow-hidden group
                            ${selectedCategory === cat.value
                                ? `bg-white border-${cat.color.split('-')[1]}-500 ring-1 ring-${cat.color.split('-')[1]}-500 shadow-md`
                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-md'
                            }`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                                <span className="text-lg">{cat.icon}</span>
                                <span className="text-sm font-medium text-gray-600 dark:text-gray-300 truncate">{cat.label}</span>
                            </div>
                        </div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                            {new Intl.NumberFormat('vi-VN').format(cat.total)} ₫
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts & List */}
            <div className="grid gap-6 md:grid-cols-2">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border dark:border-gray-700">
                    <h3 className="text-lg font-semibold mb-4">Phân bổ chi phí</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={summaryStats.filter(s => s.total > 0)}
                                    cx="50%" cy="50%"
                                    innerRadius={60} outerRadius={100}
                                    paddingAngle={2}
                                    dataKey="total" nameKey="label"
                                >
                                    {summaryStats.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.chartColor} />
                                    ))}
                                </Pie>
                                <RechartsTooltip formatter={(value: number) => new Intl.NumberFormat('vi-VN').format(value)} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* List View */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden flex flex-col">
                    <div className="p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-medium">
                        Danh sách chi phí ({filteredListExpenses.length})
                    </div>
                    <div className="overflow-y-auto max-h-[500px] p-0">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0">
                                <tr>
                                    <th className="px-4 py-3">Ngày</th>
                                    <th className="px-4 py-3">Loại</th>
                                    <th className="px-4 py-3">Chi tiết</th>
                                    <th className="px-4 py-3 text-right">Số tiền</th>
                                    <th className="px-4 py-3 text-center">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredListExpenses.map((expense: Expense) => (
                                    <tr key={expense.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {format(new Date(expense.date), 'dd/MM/yyyy')}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${expense.category === 'Platform' ? 'bg-red-100 text-red-800' :
                                                    expense.category === 'Ads' ? 'bg-purple-100 text-purple-800' :
                                                        expense.category === 'Materials' ? 'bg-orange-100 text-orange-800' :
                                                            'bg-gray-100 text-gray-800'
                                                }`}>
                                                {expense.category}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-gray-900 dark:text-white">{expense.subcategory || expense.note}</div>
                                            {expense.note && expense.subcategory && <div className="text-xs text-gray-500">{expense.note}</div>}
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold">
                                            {new Intl.NumberFormat('vi-VN').format(expense.amount)} ₫
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {!expense.isSystem && (
                                                <div className="flex justify-center gap-2">
                                                    <button onClick={() => handleEdit(expense)} className="text-blue-600 hover:text-blue-800">
                                                        <Edit className="h-4 w-4" />
                                                    </button>
                                                    <button onClick={() => handleDelete(expense.id)} className="text-red-600 hover:text-red-800">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full p-6 animate-in fade-in zoom-in duration-200">
                        <h3 className="text-lg font-bold mb-4">{editingId ? 'Sửa chi phí' : 'Thêm chi phí mới'}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Ngày</label>
                                    <input
                                        type="date"
                                        value={formData.date}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full p-2 border rounded"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Loại</label>
                                    <select
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full p-2 border rounded"
                                    >
                                        {EXPENSE_CATEGORIES.filter(c => c.value !== 'Platform').map(c => (
                                            <option key={c.value} value={c.value}>{c.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Số tiền</label>
                                <input
                                    type="text"
                                    value={formData.amount}
                                    onChange={e => setFormData({ ...formData, amount: formatNumber(e.target.value) })}
                                    className="w-full p-2 border rounded font-mono text-lg"
                                    placeholder="0"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Chi tiết / Ghi chú</label>
                                <input
                                    type="text"
                                    value={formData.note}
                                    onChange={e => setFormData({ ...formData, note: e.target.value })}
                                    className="w-full p-2 border rounded"
                                    placeholder="Ví dụ: Tiền điện, Vải..."
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded hover:bg-gray-50">Hủy</button>
                                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700">Lưu</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
