"use client"

import { useState, useEffect } from "react"
import { Calculator, TrendingUp, DollarSign, Percent, ArrowRight, Save, X, RefreshCw, Sliders, Plus, Trash2, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog"

interface Product {
    id: string
    name: string
    materialCost: number
    laborCost: number
    costBreakdown?: string // JSON string
}

interface MarketData {
    avgFees: {
        shopee: number
        tiktok: number
    }
    avgShipping: number
    topProducts: Array<{
        name: string
        margin: number
        avgPrice: number
        orderCount: number
    }>
    totalOrders: number
}

interface PricingResult {
    recommendedPrice: number
    productionCost: number
    targetMargin: number
    scenarios: {
        shopee: PlatformScenario
        tiktok: PlatformScenario
    }
}

interface PlatformScenario {
    revenue: number
    feeBreakdown: FeeBreakdown[]
    totalFee: number
    totalFeeRate: number
    shipping: number
    netPayout: number
    productionCost: number
    netProfit: number
    netMargin: number
}

interface FeeBreakdown {
    name: string
    rate: number | null
    amount: number
}

interface MaterialItem {
    id: string
    name: string
    cost: number
}

export default function PricingPage() {
    const [products, setProducts] = useState<Product[]>([])
    const [marketData, setMarketData] = useState<MarketData | null>(null)

    // Simulation State
    const [selectedProduct, setSelectedProduct] = useState<string>("")

    // Materials (Dynamic List)
    const [materials, setMaterials] = useState<MaterialItem[]>([
        { id: '1', name: 'Vải chính', cost: 0 }
    ])

    // Labor (Time-based)
    const [hourlyWage, setHourlyWage] = useState<string>("25000")
    const [minutesPerUnit, setMinutesPerUnit] = useState<string>("30")

    const [targetMargin, setTargetMargin] = useState(40) // Default 40%
    const [shippingPaidBy, setShippingPaidBy] = useState<"seller" | "buyer">("seller")
    const [estimatedShipping, setEstimatedShipping] = useState("15000")
    const [currentPlatformPrice, setCurrentPlatformPrice] = useState("") // For comparison

    // Save Modal State
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false)
    const [newProductName, setNewProductName] = useState("")
    const [saving, setSaving] = useState(false)

    // Real-time Calculated Results
    const [result, setResult] = useState<PricingResult | null>(null)

    // Fetch initial data
    useEffect(() => {
        fetchProducts()
        fetchMarketData()
    }, [])

    // Real-time calculation effect
    useEffect(() => {
        calculatePricing()
    }, [materials, hourlyWage, minutesPerUnit, targetMargin, shippingPaidBy, estimatedShipping, marketData])

    const fetchProducts = async () => {
        try {
            const res = await fetch('/api/products')
            const data = await res.json()
            setProducts(data.products || [])
        } catch (error) {
            console.error("Failed to fetch products:", error)
        }
    }

    const fetchMarketData = async () => {
        try {
            const res = await fetch('/api/pricing')
            if (res.ok) {
                const data = await res.json()
                setMarketData(data)
                if (data.avgShipping) setEstimatedShipping(data.avgShipping.toString())
            }
        } catch (error) {
            console.error("Failed to fetch market data", error)
        }
    }

    const handleProductChange = (productId: string) => {
        setSelectedProduct(productId)
        const product = products.find(p => p.id === productId)
        if (product) {
            // Parse cost breakdown if available
            if (product.costBreakdown) {
                try {
                    const breakdown = JSON.parse(product.costBreakdown)
                    if (breakdown.materials) setMaterials(breakdown.materials)
                    if (breakdown.labor) {
                        setHourlyWage(breakdown.labor.hourlyWage?.toString() || "25000")
                        setMinutesPerUnit(breakdown.labor.minutes?.toString() || "30")
                    }
                } catch (e) {
                    console.error("Error parsing cost breakdown", e)
                    // Fallback to simple costs
                    setMaterials([{ id: '1', name: 'Vật liệu tổng', cost: product.materialCost }])
                    setHourlyWage("0")
                    setMinutesPerUnit("0") // Or calculate backward if needed, but simpler to reset
                }
            } else {
                // Legacy products
                setMaterials([{ id: '1', name: 'Vật liệu tổng', cost: product.materialCost }])
                // Estimate labor time based on cost (assuming 25k/hr)
                const mins = Math.round((product.laborCost / 25000) * 60)
                setHourlyWage("25000")
                setMinutesPerUnit(mins.toString())
            }
        } else {
            setMaterials([{ id: '1', name: 'Vải chính', cost: 0 }])
            setHourlyWage("25000")
            setMinutesPerUnit("30")
        }
    }

    // Material Handlers
    const addMaterial = () => {
        setMaterials([...materials, { id: Math.random().toString(), name: '', cost: 0 }])
    }

    const updateMaterial = (id: string, field: keyof MaterialItem, value: string | number) => {
        setMaterials(materials.map(m => m.id === id ? { ...m, [field]: value } : m))
    }

    const removeMaterial = (id: string) => {
        setMaterials(materials.filter(m => m.id !== id))
    }

    const calculateTotalMaterialCost = () => {
        return materials.reduce((sum, m) => sum + (Number(m.cost) || 0), 0)
    }

    const calculateLaborCost = () => {
        const wage = parseFloat(hourlyWage) || 0
        const mins = parseFloat(minutesPerUnit) || 0
        return (wage / 60) * mins
    }

    const calculatePricing = () => {
        const matCost = calculateTotalMaterialCost()
        const labCost = calculateLaborCost()
        const prodCost = matCost + labCost
        const shipping = shippingPaidBy === 'seller' ? (parseFloat(estimatedShipping) || 0) : 0

        if (prodCost === 0) {
            setResult(null)
            return
        }

        // Fees (using market data or defaults)
        const shopeeFeeRate = marketData?.avgFees?.shopee || 0.105
        const tiktokFeeRate = marketData?.avgFees?.tiktok || 0.10

        // Formula: Price = (Cost + Shipping) / (1 - Margin - FeeRate)
        const denominator = 1 - shopeeFeeRate - (targetMargin / 100)

        if (denominator <= 0) {
            // Impossible margin
            setResult(null)
            return
        }

        const recommendedPrice = (prodCost + shipping) / denominator

        // Calculate scenarios for this price
        const calculateScenario = (price: number, feeRate: number): PlatformScenario => {
            const totalFee = price * feeRate
            const netPayout = price - totalFee - shipping
            const netProfit = netPayout - prodCost
            const netMargin = (netProfit / price) * 100

            return {
                revenue: price,
                feeBreakdown: [{ name: "Phí sàn (ước tính)", rate: feeRate, amount: totalFee }],
                totalFee,
                totalFeeRate: feeRate * 100,
                shipping,
                netPayout,
                productionCost: prodCost,
                netProfit,
                netMargin
            }
        }

        setResult({
            recommendedPrice,
            productionCost: prodCost,
            targetMargin,
            scenarios: {
                shopee: calculateScenario(recommendedPrice, shopeeFeeRate),
                tiktok: calculateScenario(recommendedPrice, tiktokFeeRate)
            }
        })
    }

    const handleSaveProduct = async () => {
        if (!newProductName) return
        setSaving(true)
        try {
            const costBreakdown = {
                materials,
                labor: {
                    hourlyWage: parseFloat(hourlyWage),
                    minutes: parseFloat(minutesPerUnit)
                }
            }

            const res = await fetch('/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newProductName,
                    materialCost: calculateTotalMaterialCost(),
                    laborCost: calculateLaborCost(),
                    costBreakdown
                })
            })

            if (res.ok) {
                setIsSaveModalOpen(false)
                setNewProductName("")
                fetchProducts() // Refresh list
                alert("Đã lưu sản phẩm thành công!")
            } else {
                const data = await res.json()
                alert(data.error || "Lỗi khi lưu sản phẩm")
            }
        } catch (error) {
            console.error("Save error", error)
        } finally {
            setSaving(false)
        }
    }

    const productionCost = calculateTotalMaterialCost() + calculateLaborCost()

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Sliders className="h-8 w-8 text-blue-600" />
                        Mô phỏng giá bán V2
                    </h2>
                    <p className="text-muted-foreground text-gray-500 mt-1">
                        Tính toán chi tiết từ nguyên vật liệu và nhân công theo giờ.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Dialog open={isSaveModalOpen} onOpenChange={setIsSaveModalOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="flex items-center gap-2">
                                <Save className="h-4 w-4" /> Lưu thành Sản phẩm
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Lưu sản phẩm mới</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Tên sản phẩm</Label>
                                    <Input
                                        placeholder="Nhập tên sản phẩm..."
                                        value={newProductName}
                                        onChange={(e) => setNewProductName(e.target.value)}
                                    />
                                </div>
                                <div className="text-sm text-gray-500">
                                    <p>Giá vốn: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(productionCost)}</p>
                                    <p>Vật liệu: {materials.length} loại</p>
                                    <p>Nhân công: {minutesPerUnit} phút</p>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsSaveModalOpen(false)}>Hủy</Button>
                                <Button onClick={handleSaveProduct} disabled={saving || !newProductName}>
                                    {saving ? "Đang lưu..." : "Lưu sản phẩm"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-12">
                {/* Left Column: Controls */}
                <div className="lg:col-span-5 space-y-6">
                    {/* 1. Product & Cost */}
                    <div className="bg-white p-5 rounded-xl shadow-sm border">
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                            <DollarSign className="h-4 w-4" /> Chi phí đầu vào
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sản phẩm mẫu (Load lại)</label>
                                <select
                                    value={selectedProduct}
                                    onChange={(e) => handleProductChange(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg text-sm"
                                >
                                    <option value="">-- Tự nhập chi phí --</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Materials List */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="block text-xs font-medium text-gray-500">Nguyên vật liệu</label>
                                    <button onClick={addMaterial} className="text-xs text-blue-600 flex items-center gap-1 hover:underline">
                                        <Plus className="h-3 w-3" /> Thêm
                                    </button>
                                </div>
                                {materials.map((item, index) => (
                                    <div key={item.id} className="flex gap-2 items-center">
                                        <input
                                            type="text"
                                            placeholder="Tên vật liệu"
                                            value={item.name}
                                            onChange={(e) => updateMaterial(item.id, 'name', e.target.value)}
                                            className="flex-1 px-2 py-1.5 border rounded text-sm"
                                        />
                                        <input
                                            type="number"
                                            placeholder="Giá"
                                            value={item.cost || ''}
                                            onChange={(e) => updateMaterial(item.id, 'cost', parseFloat(e.target.value))}
                                            className="w-24 px-2 py-1.5 border rounded text-sm text-right"
                                        />
                                        {materials.length > 1 && (
                                            <button onClick={() => removeMaterial(item.id)} className="text-gray-400 hover:text-red-500">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <div className="text-right text-xs text-gray-500">
                                    Tổng vật liệu: {new Intl.NumberFormat('vi-VN').format(calculateTotalMaterialCost())}
                                </div>
                            </div>

                            {/* Labor Calculation */}
                            <div className="pt-3 border-t space-y-3">
                                <label className="block text-xs font-medium text-gray-500 flex items-center gap-1">
                                    <Clock className="h-3 w-3" /> Nhân công (Theo thời gian)
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <span className="text-[10px] text-gray-400">Lương/giờ</span>
                                        <input
                                            type="number"
                                            value={hourlyWage}
                                            onChange={(e) => setHourlyWage(e.target.value)}
                                            className="w-full px-2 py-1.5 border rounded text-sm"
                                        />
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-gray-400">Số phút/SP</span>
                                        <input
                                            type="number"
                                            value={minutesPerUnit}
                                            onChange={(e) => setMinutesPerUnit(e.target.value)}
                                            className="w-full px-2 py-1.5 border rounded text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="text-right text-xs text-gray-500">
                                    Tổng nhân công: {new Intl.NumberFormat('vi-VN').format(calculateLaborCost())}
                                </div>
                            </div>

                            <div className="pt-3 border-t flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                                <span className="text-sm font-medium text-gray-600">Tổng giá vốn:</span>
                                <span className="text-lg font-bold text-gray-900">
                                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(productionCost)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 2. Margin Slider */}
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-blue-100 ring-4 ring-blue-50/50">
                        <h3 className="font-semibold mb-4 flex items-center gap-2 text-blue-700">
                            <Percent className="h-4 w-4" /> Mục tiêu Lợi nhuận
                        </h3>

                        <div className="space-y-6">
                            <div className="flex justify-between items-end">
                                <span className="text-4xl font-bold text-blue-600">{targetMargin}%</span>
                                <span className="text-sm text-gray-500 mb-1">Biên lợi nhuận ròng</span>
                            </div>

                            <input
                                type="range"
                                min="0"
                                max="99" // Limit to 99 to avoid divide by zero
                                step="1"
                                value={targetMargin}
                                onChange={(e) => setTargetMargin(parseInt(e.target.value))}
                                className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />

                            <div className="flex justify-between text-xs text-gray-400">
                                <span>0%</span>
                                <span>50%</span>
                                <span>99%</span>
                            </div>
                        </div>
                    </div>

                    {/* 3. Shipping & Comparison */}
                    <div className="bg-white p-5 rounded-xl shadow-sm border">
                        <h3 className="font-semibold mb-4 text-sm text-gray-700">Cấu hình khác</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Phí vận chuyển (Seller chịu)</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={shippingPaidBy === 'seller'}
                                        onChange={(e) => setShippingPaidBy(e.target.checked ? 'seller' : 'buyer')}
                                        className="h-4 w-4 text-blue-600 rounded"
                                    />
                                    <input
                                        type="number"
                                        value={estimatedShipping}
                                        onChange={(e) => setEstimatedShipping(e.target.value)}
                                        disabled={shippingPaidBy !== 'seller'}
                                        className="flex-1 px-3 py-1.5 border rounded-lg text-sm disabled:bg-gray-100 disabled:text-gray-400"
                                    />
                                </div>
                            </div>

                            <div className="pt-2 border-t">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Giá thị trường (để so sánh)</label>
                                <input
                                    type="number"
                                    value={currentPlatformPrice}
                                    onChange={(e) => setCurrentPlatformPrice(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg text-sm border-orange-200 focus:border-orange-500 focus:ring-orange-500"
                                    placeholder="VD: 150000"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Results */}
                <div className="lg:col-span-7 space-y-6">
                    {/* Main Result Card */}
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-32 bg-white opacity-5 rounded-full -mr-16 -mt-16 blur-3xl"></div>

                        <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center">
                            <div>
                                <p className="text-blue-100 font-medium mb-1">Giá bán đề xuất (Shopee)</p>
                                <div className="text-5xl font-bold tracking-tight">
                                    {result ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(result.recommendedPrice) : '---'}
                                </div>
                                <p className="text-sm text-blue-200 mt-2 opacity-80">
                                    Để đạt Net Margin {targetMargin}% sau khi trừ hết chi phí.
                                </p>
                            </div>

                            {currentPlatformPrice && result && (
                                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-blue-100">Giá thị trường:</span>
                                        <span className="font-medium">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(parseFloat(currentPlatformPrice))}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-blue-100 text-sm">Chênh lệch:</span>
                                        <span className={`text-xl font-bold ${result.recommendedPrice > parseFloat(currentPlatformPrice) ? 'text-red-300' : 'text-green-300'}`}>
                                            {result.recommendedPrice > parseFloat(currentPlatformPrice) ? '+' : ''}
                                            {((result.recommendedPrice - parseFloat(currentPlatformPrice)) / parseFloat(currentPlatformPrice) * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="text-xs text-blue-200 mt-2 text-right">
                                        {result.recommendedPrice > parseFloat(currentPlatformPrice)
                                            ? "⚠️ Giá của bạn cao hơn thị trường"
                                            : "✅ Giá cạnh tranh tốt"}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Breakdown Cards */}
                    {result && (
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Shopee Scenario */}
                            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                                <div className="bg-orange-50 px-4 py-3 border-b border-orange-100 flex justify-between items-center">
                                    <span className="font-bold text-orange-800 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-orange-500"></span> Shopee
                                    </span>
                                    <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">Phí ~{(result.scenarios.shopee.totalFeeRate).toFixed(1)}%</span>
                                </div>
                                <div className="p-5 space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Doanh thu (Giá bán)</span>
                                        <span className="font-medium">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(result.scenarios.shopee.revenue)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-red-600">
                                        <span className="flex items-center gap-1">Phí sàn <span className="text-xs opacity-70">(-{(result.scenarios.shopee.totalFeeRate).toFixed(1)}%)</span></span>
                                        <span>-{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(result.scenarios.shopee.totalFee)}</span>
                                    </div>
                                    {result.scenarios.shopee.shipping > 0 && (
                                        <div className="flex justify-between text-sm text-red-600">
                                            <span>Vận chuyển</span>
                                            <span>-{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(result.scenarios.shopee.shipping)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-sm text-purple-600">
                                        <span>Giá vốn</span>
                                        <span>-{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(result.scenarios.shopee.productionCost)}</span>
                                    </div>
                                    <div className="pt-3 border-t flex justify-between items-end">
                                        <div>
                                            <div className="text-xs text-gray-500">Lợi nhuận ròng</div>
                                            <div className="text-2xl font-bold text-gray-900">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(result.scenarios.shopee.netProfit)}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs text-gray-500">Margin</div>
                                            <div className="text-lg font-bold text-blue-600">{result.scenarios.shopee.netMargin.toFixed(1)}%</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* TikTok Scenario */}
                            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                                <div className="bg-gray-900 px-4 py-3 border-b border-gray-800 flex justify-between items-center text-white">
                                    <span className="font-bold flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-pink-500"></span> TikTok Shop
                                    </span>
                                    <span className="text-xs text-gray-300 bg-gray-800 px-2 py-1 rounded">Phí ~{(result.scenarios.tiktok.totalFeeRate).toFixed(1)}%</span>
                                </div>
                                <div className="p-5 space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Doanh thu (Giá bán)</span>
                                        <span className="font-medium">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(result.scenarios.tiktok.revenue)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-red-600">
                                        <span className="flex items-center gap-1">Phí sàn <span className="text-xs opacity-70">(-{(result.scenarios.tiktok.totalFeeRate).toFixed(1)}%)</span></span>
                                        <span>-{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(result.scenarios.tiktok.totalFee)}</span>
                                    </div>
                                    {result.scenarios.tiktok.shipping > 0 && (
                                        <div className="flex justify-between text-sm text-red-600">
                                            <span>Vận chuyển</span>
                                            <span>-{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(result.scenarios.tiktok.shipping)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-sm text-purple-600">
                                        <span>Giá vốn</span>
                                        <span>-{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(result.scenarios.tiktok.productionCost)}</span>
                                    </div>
                                    <div className="pt-3 border-t flex justify-between items-end">
                                        <div>
                                            <div className="text-xs text-gray-500">Lợi nhuận ròng</div>
                                            <div className="text-2xl font-bold text-gray-900">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(result.scenarios.tiktok.netProfit)}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs text-gray-500">Margin</div>
                                            <div className="text-lg font-bold text-blue-600">{result.scenarios.tiktok.netMargin.toFixed(1)}%</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
