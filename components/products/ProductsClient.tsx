"use client"

import { useState, useEffect } from "react"
import { Search, Plus, Filter, Download, Edit2, Trash2, MoreHorizontal, Save, X, ChevronDown, ChevronUp, Tag, Package, ArrowUpDown, Check } from "lucide-react"
import useSWR, { mutate } from 'swr'

// Types
interface ProductSKU {
    id?: string
    platform: string
    sku: string
    platformProductName: string
}

interface ProductMetrics {
    revenue: number
    orders: number
    quantity: number
}

interface GlobalMetrics {
    avgPlatformFeePercent: number
    avgOpExPercent: number
    totalRevenue: number
    totalOpEx: number
    totalPlatformFees: number
}

interface Product {
    id: string
    sku?: string
    name: string
    category?: string
    sellingPrice: number
    materialCost: number
    laborCost: number
    description?: string
    tags?: string[] | string // Handle both array or string from DB/API
    skus: ProductSKU[]
    metrics?: ProductMetrics
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface ProductsClientProps {
    initialProducts: Product[]
    initialGlobalMetrics: GlobalMetrics | null
}

export function ProductsClient({ initialProducts, initialGlobalMetrics }: ProductsClientProps) {
    const [showForm, setShowForm] = useState(false)
    const [editingProduct, setEditingProduct] = useState<Product | null>(null)
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'netMargin', direction: 'asc' })
    const [hasUserInteracted, setHasUserInteracted] = useState(false)

    // SWR Fetching
    const { data } = useSWR('/api/products/analytics?period=all', fetcher, {
        fallbackData: { products: initialProducts, globalMetrics: initialGlobalMetrics },
        revalidateOnFocus: false
    })

    const products: Product[] = data?.products || []
    const globalMetrics: GlobalMetrics | null = data?.globalMetrics || null

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        sku: "",
        category: "",
        sellingPrice: "",
        materialCost: "",
        laborCost: "",
        description: "",
        tags: "",
    })

    const [skuMappings, setSkuMappings] = useState<ProductSKU[]>([
        { platform: "Shopee", sku: "", platformProductName: "" },
        { platform: "TikTok", sku: "", platformProductName: "" }
    ])

    const [quickAddData, setQuickAddData] = useState({
        name: "",
        sku: "",
        category: "",
        sellingPrice: "",
        materialCost: "",
    })
    const [isQuickAdding, setIsQuickAdding] = useState(false)

    // Handle form submit
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        await saveProduct(formData)
    }

    const handleQuickAdd = async () => {
        if (!quickAddData.name) return
        setIsQuickAdding(true)
        await saveProduct({
            ...quickAddData,
            id: "",
            laborCost: "0",
            description: "",
            tags: "",
            skus: [],
            costBreakdown: null
        })
        setQuickAddData({
            name: "",
            sku: "",
            category: "",
            sellingPrice: "",
            materialCost: "",
        })
        setIsQuickAdding(false)
    }

    const saveProduct = async (data: any) => {
        try {
            const productData = {
                ...data,
                sellingPrice: parseFloat(data.sellingPrice) || 0,
                materialCost: parseFloat(data.materialCost) || 0,
                laborCost: parseFloat(data.laborCost) || 0,
                skus: skuMappings.filter(s => s.sku), // Only send valid mappings
            }

            const res = await fetch('/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productData),
            })

            if (res.ok) {
                mutate('/api/products/analytics?period=all') // Refresh data
                resetForm()
            }
        } catch (error) {
            console.error("Failed to save product:", error)
        }
    }

    const resetForm = () => {
        setFormData({
            name: "",
            sku: "",
            category: "",
            sellingPrice: "",
            materialCost: "",
            laborCost: "",
            description: "",
            tags: "",
        })
        setSkuMappings([
            { platform: "Shopee", sku: "", platformProductName: "" },
            { platform: "TikTok", sku: "", platformProductName: "" }
        ])
        setEditingProduct(null)
        setShowForm(false)
    }

    // Edit product
    const handleEdit = (product: Product) => {
        setEditingProduct(product)
        setFormData({
            name: product.name,
            sku: product.sku || "",
            category: product.category || "",
            sellingPrice: product.sellingPrice.toString(),
            materialCost: product.materialCost.toString(),
            laborCost: product.laborCost.toString(),
            description: product.description || "",
            tags: Array.isArray(product.tags) ? product.tags.join(', ') : (product.tags || ""),
        })

        // Load existing SKU mappings
        const shopeeSKU = product.skus?.find(s => s.platform === "Shopee")
        const tiktokSKU = product.skus?.find(s => s.platform === "TikTok")

        setSkuMappings([
            {
                platform: "Shopee",
                sku: shopeeSKU?.sku || "",
                platformProductName: shopeeSKU?.platformProductName || ""
            },
            {
                platform: "TikTok",
                sku: tiktokSKU?.sku || "",
                platformProductName: tiktokSKU?.platformProductName || ""
            }
        ])

        setShowForm(true)
    }

    // Delete product
    const handleDelete = async (id: string) => {
        if (!confirm("Bạn chắc chắn muốn xóa sản phẩm này?")) return

        try {
            const res = await fetch(`/api/products?id=${id}`, {
                method: 'DELETE',
            })

            if (res.ok) {
                mutate('/api/products/analytics?period=all')
            }
        } catch (error) {
            console.error("Failed to delete product:", error)
        }
    }

    // Calculate margins
    const calculateMargins = (product: Product) => {
        const price = product.sellingPrice || 0
        const cost = product.materialCost + product.laborCost
        const grossProfit = price - cost
        const grossMargin = price > 0 ? (grossProfit / price) * 100 : 0

        const platformFee = price * (globalMetrics?.avgPlatformFeePercent || 0)
        const opEx = price * (globalMetrics?.avgOpExPercent || 0)
        const netProfit = grossProfit - platformFee - opEx
        const netMargin = price > 0 ? (netProfit / price) * 100 : 0

        return {
            grossMargin,
            netMargin,
            platformFee,
            opEx,
            netProfit
        }
    }

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc'
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc'
        }
        setSortConfig({ key, direction })
    }

    // Sorting logic
    const sortedProducts = [...products].sort((a, b) => {
        if (sortConfig.key === 'name') {
            return sortConfig.direction === 'asc'
                ? a.name.localeCompare(b.name)
                : b.name.localeCompare(a.name)
        }
        if (sortConfig.key === 'sellingPrice') {
            return sortConfig.direction === 'asc'
                ? (a.sellingPrice || 0) - (b.sellingPrice || 0)
                : (b.sellingPrice || 0) - (a.sellingPrice || 0)
        }
        // Default sort by Net Margin asc (to find bad products)
        const marginA = calculateMargins(a).netMargin
        const marginB = calculateMargins(b).netMargin
        return sortConfig.direction === 'asc' ? marginA - marginB : marginB - marginA
    })

    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Phân tích Giá & Biên Lợi Nhuận</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Đánh giá hiệu quả giá bán dựa trên chi phí thực tế của doanh nghiệp.</p>
            </div>

            {/* Global Metrics Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700 shadow-sm">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Chi phí Sàn (TB)</div>
                    <div className="text-2xl font-bold text-orange-600">
                        {globalMetrics ? (globalMetrics.avgPlatformFeePercent * 100).toFixed(1) : 0}%
                    </div>
                    <div className="text-xs text-gray-400 mt-1">Trên doanh thu</div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700 shadow-sm">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Chi phí Vận hành (TB)</div>
                    <div className="text-2xl font-bold text-purple-600">
                        {globalMetrics ? (globalMetrics.avgOpExPercent * 100).toFixed(1) : 0}%
                    </div>
                    <div className="text-xs text-gray-400 mt-1">Trên doanh thu</div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700 shadow-sm">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Tổng Chi phí Ngoài (TB)</div>
                    <div className="text-2xl font-bold text-red-600">
                        {globalMetrics ? ((globalMetrics.avgPlatformFeePercent + globalMetrics.avgOpExPercent) * 100).toFixed(1) : 0}%
                    </div>
                    <div className="text-xs text-gray-400 mt-1">Sàn + Vận hành</div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                    <div className="text-sm text-blue-700 dark:text-blue-400 mb-1">Mục tiêu Net Margin</div>
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                        &gt; 15%
                    </div>
                    <div className="text-xs text-blue-500 dark:text-blue-300 mt-1">Khuyến nghị</div>
                </div>
            </div>

            {/* Add/Edit Form */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {editingProduct ? "Cập nhật sản phẩm" : "Thêm sản phẩm mới"}
                            </h3>
                            <button onClick={resetForm}><X className="h-5 w-5 text-gray-500" /></button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-4">
                            {/* Basic Info */}
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Tên sản phẩm (chuẩn hóa) *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 dark:text-white"
                                        placeholder="VD: Túi handmade hoa sen trắng"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Mã SKU (Master)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.sku}
                                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                        className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 dark:text-white"
                                        placeholder="VD: BAG-001"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Danh mục
                                    </label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 dark:text-white"
                                    >
                                        <option value="">Chọn danh mục</option>
                                        <option value="Vòng tay">Vòng tay</option>
                                        <option value="Dây chuyền">Dây chuyền</option>
                                        <option value="Nhẫn">Nhẫn</option>
                                        <option value="Khuyên tai">Khuyên tai</option>
                                        <option value="Lắc chân">Lắc chân</option>
                                        <option value="Combo">Combo</option>
                                        <option value="Khác">Khác</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Giá bán (VND)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.sellingPrice}
                                        onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                                        className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 dark:text-white"
                                        placeholder="150000"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        💰 Chi phí vật liệu (VND) *
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.materialCost}
                                        onChange={(e) => setFormData({ ...formData, materialCost: e.target.value })}
                                        className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 dark:text-white"
                                        placeholder="80000"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        👷 Chi phí nhân công (VND) *
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.laborCost}
                                        onChange={(e) => setFormData({ ...formData, laborCost: e.target.value })}
                                        className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 dark:text-white"
                                        placeholder="50000"
                                        required
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Tags (phân cách bằng dấu phẩy)
                                    </label>
                                    <div className="relative">
                                        <Tag className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                        <input
                                            type="text"
                                            value={formData.tags}
                                            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                                            className="w-full pl-9 px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 dark:text-white"
                                            placeholder="best-seller, seasonal, new"
                                        />
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Mô tả (tùy chọn)
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 dark:text-white"
                                        rows={2}
                                        placeholder="Mô tả chi tiết sản phẩm..."
                                    />
                                </div>
                            </div>

                            {/* SKU Mapping */}
                            <div className="border-t dark:border-gray-700 pt-4">
                                <h4 className="font-semibold mb-3 text-gray-900 dark:text-white">🔗 Mapping SKU (Tùy chọn)</h4>
                                <div className="grid gap-4 md:grid-cols-2">
                                    {skuMappings.map((mapping, index) => (
                                        <div key={mapping.platform} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border dark:border-gray-700">
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${mapping.platform === 'Shopee' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {mapping.platform}
                                                </span>
                                            </div>
                                            <div className="space-y-2">
                                                <input
                                                    type="text"
                                                    value={mapping.sku}
                                                    onChange={(e) => {
                                                        const updated = [...skuMappings]
                                                        updated[index].sku = e.target.value
                                                        setSkuMappings(updated)
                                                    }}
                                                    className="w-full px-2 py-1.5 text-sm border dark:border-gray-600 rounded bg-white dark:bg-gray-800 dark:text-white"
                                                    placeholder={`SKU trên ${mapping.platform}`}
                                                />
                                                <input
                                                    type="text"
                                                    value={mapping.platformProductName}
                                                    onChange={(e) => {
                                                        const updated = [...skuMappings]
                                                        updated[index].platformProductName = e.target.value
                                                        setSkuMappings(updated)
                                                    }}
                                                    className="w-full px-2 py-1.5 text-sm border dark:border-gray-600 rounded bg-white dark:bg-gray-800 dark:text-white"
                                                    placeholder={`Tên sản phẩm trên ${mapping.platform}`}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t dark:border-gray-700">
                                <button type="button" onClick={resetForm} className="px-4 py-2 border dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition dark:text-gray-300">Hủy</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">{editingProduct ? "Cập nhật" : "Tạo sản phẩm"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Products List Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                    <h3 className="font-semibold text-gray-700 dark:text-gray-300">Chi tiết sản phẩm</h3>
                    <div className="flex gap-2 items-center">
                        <button
                            onClick={() => setShowForm(true)}
                            className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                        >
                            <Plus className="w-4 h-4 mr-1" /> Thêm sản phẩm
                        </button>
                        <select
                            value={sortConfig.key}
                            onChange={(e) => handleSort(e.target.value)}
                            className="text-sm border dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 dark:text-white"
                        >
                            <option value="netMargin">Sắp xếp: Net Margin</option>
                            <option value="grossMargin">Sắp xếp: Gross Margin</option>
                            <option value="sellingPrice">Sắp xếp: Giá bán</option>
                            <option value="name">Sắp xếp: Tên sản phẩm</option>
                        </select>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[30%]">Sản phẩm</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Danh mục</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">SKU</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-200" onClick={() => handleSort('sellingPrice')}>
                                    Giá bán <ArrowUpDown className="w-3 h-3 inline ml-1" />
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Giá vốn</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Gross Margin</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Est. Net Margin</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {/* Quick Add Row */}
                            <tr className="bg-blue-50/50 dark:bg-blue-900/20">
                                <td className="px-4 py-2">
                                    <input
                                        type="text"
                                        placeholder="Tên sản phẩm mới..."
                                        className="w-full px-2 py-1 text-sm border dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 outline-none bg-white dark:bg-gray-900 dark:text-white"
                                        value={quickAddData.name}
                                        onChange={(e) => setQuickAddData({ ...quickAddData, name: e.target.value })}
                                        onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
                                    />
                                </td>
                                <td className="px-4 py-2">
                                    <select
                                        className="w-full px-2 py-1 text-sm border dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 outline-none bg-white dark:bg-gray-900 dark:text-white"
                                        value={quickAddData.category}
                                        onChange={(e) => setQuickAddData({ ...quickAddData, category: e.target.value })}
                                    >
                                        <option value="">Danh mục</option>
                                        <option value="Vòng tay">Vòng tay</option>
                                        <option value="Dây chuyền">Dây chuyền</option>
                                        <option value="Nhẫn">Nhẫn</option>
                                        <option value="Khuyên tai">Khuyên tai</option>
                                        <option value="Lắc chân">Lắc chân</option>
                                        <option value="Combo">Combo</option>
                                        <option value="Khác">Khác</option>
                                    </select>
                                </td>
                                <td className="px-4 py-2">
                                    <input
                                        type="text"
                                        placeholder="SKU"
                                        className="w-full px-2 py-1 text-sm border dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 outline-none bg-white dark:bg-gray-900 dark:text-white"
                                        value={quickAddData.sku}
                                        onChange={(e) => setQuickAddData({ ...quickAddData, sku: e.target.value })}
                                        onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
                                    />
                                </td>
                                <td className="px-4 py-2">
                                    <input
                                        type="number"
                                        placeholder="Giá bán"
                                        className="w-full px-2 py-1 text-sm border dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 outline-none text-right bg-white dark:bg-gray-900 dark:text-white"
                                        value={quickAddData.sellingPrice}
                                        onChange={(e) => setQuickAddData({ ...quickAddData, sellingPrice: e.target.value })}
                                        onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
                                    />
                                </td>
                                <td className="px-4 py-2">
                                    <input
                                        type="number"
                                        placeholder="Giá vốn"
                                        className="w-full px-2 py-1 text-sm border dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 outline-none text-right bg-white dark:bg-gray-900 dark:text-white"
                                        value={quickAddData.materialCost}
                                        onChange={(e) => setQuickAddData({ ...quickAddData, materialCost: e.target.value })}
                                        onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
                                    />
                                </td>
                                <td colSpan={2} className="px-4 py-2 text-center">
                                    <button
                                        onClick={handleQuickAdd}
                                        disabled={!quickAddData.name || isQuickAdding}
                                        className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Thêm nhanh"
                                    >
                                        <Check className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>

                            {sortedProducts.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                                        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                        Chưa có dữ liệu sản phẩm.
                                    </td>
                                </tr>
                            ) : (
                                sortedProducts.map((product) => (
                                    <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-gray-900 dark:text-gray-100">{product.name}</div>
                                            {product.description && <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{product.description}</div>}
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {product.tags && (Array.isArray(product.tags) ? product.tags : (product.tags as string).split(',')).map((tag, i) => (
                                                    tag.trim() && (
                                                        <span
                                                            key={i}
                                                            className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs"
                                                        >
                                                            {tag.trim()}
                                                        </span>
                                                    )
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                                            {product.category || "-"}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                                            {product.sku || "-"}
                                        </td>
                                        <td className="px-4 py-3 text-right text-sm text-gray-900 dark:text-gray-100 font-medium">
                                            {new Intl.NumberFormat('vi-VN').format(product.sellingPrice || 0)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-300">
                                            {new Intl.NumberFormat('vi-VN').format(product.materialCost + product.laborCost)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-sm">
                                            <div className="font-medium text-gray-900 dark:text-gray-100">
                                                {calculateMargins(product).grossMargin.toFixed(1)}%
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                Lãi: {new Intl.NumberFormat('vi-VN', { notation: "compact" }).format((product.sellingPrice || 0) - (product.materialCost + product.laborCost))}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right text-sm">
                                            <div className={`font-bold ${calculateMargins(product).netMargin >= 15 ? 'text-green-600' : calculateMargins(product).netMargin >= 0 ? 'text-orange-600' : 'text-red-600'}`}>
                                                {calculateMargins(product).netMargin.toFixed(1)}%
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                Lãi: {new Intl.NumberFormat('vi-VN', { notation: "compact" }).format(calculateMargins(product).netProfit)}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => handleEdit(product)} className="p-1 text-blue-600 hover:bg-blue-50 rounded transition"><Edit2 className="h-4 w-4" /></button>
                                                <button onClick={() => handleDelete(product.id)} className="p-1 text-red-600 hover:bg-red-50 rounded transition"><Trash2 className="h-4 w-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div >
    )
}
