"use client"

import { useState, useEffect } from "react"
import { TrendingUp, DollarSign, Calculator } from "lucide-react"

interface SimulatorProps {
    initialData: {
        revenue: number
        cogsRate: number // %
        adsRate: number // %
        platformFeeRate: number // %
        shippingRate: number // %
        fixedCost: number
    }
}

export function FinancialSimulator({ initialData }: SimulatorProps) {
    const [revenue, setRevenue] = useState(initialData.revenue)
    const [cogsRate, setCogsRate] = useState(initialData.cogsRate)
    const [adsRate, setAdsRate] = useState(initialData.adsRate)
    const [platformFeeRate, setPlatformFeeRate] = useState(initialData.platformFeeRate)
    const [shippingRate, setShippingRate] = useState(initialData.shippingRate)
    const [fixedCost, setFixedCost] = useState(initialData.fixedCost)

    // Calculate projected results
    const projectedCogs = revenue * (cogsRate / 100)
    const projectedAds = revenue * (adsRate / 100)
    const projectedPlatformFees = revenue * (platformFeeRate / 100)
    const projectedShipping = revenue * (shippingRate / 100)
    const totalVariableCost = projectedCogs + projectedAds + projectedPlatformFees + projectedShipping
    const projectedProfit = revenue - totalVariableCost - fixedCost
    const projectedMargin = revenue > 0 ? (projectedProfit / revenue) * 100 : 0

    // Format currency
    const fmt = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n)

    return (
        <div className="bg-gradient-to-br from-indigo-900 to-blue-900 p-6 rounded-xl text-white shadow-lg">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <Calculator className="h-5 w-5 text-yellow-400" />
                        Giả lập Tài chính & Đối soát
                    </h3>
                    <p className="text-indigo-200 text-sm mt-1">Điều chỉnh các thông số để thấy ngay lợi nhuận dự kiến.</p>
                </div>
                <div className="bg-indigo-800/50 px-4 py-2 rounded-lg border border-indigo-700">
                    <span className="text-xs text-indigo-300 uppercase font-bold block">Mục tiêu lợi nhuận</span>
                    <span className="text-xl font-bold text-green-400">50.000.000 ₫</span>
                </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
                {/* Controls */}
                <div className="space-y-6">
                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-sm font-medium text-indigo-200">Doanh thu (Ước tính)</label>
                            <span className="font-bold">{fmt(revenue)}</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max={initialData.revenue * 2 || 1000000000}
                            step="1000000"
                            value={revenue}
                            onChange={(e) => setRevenue(Number(e.target.value))}
                            className="w-full h-2 bg-indigo-700 rounded-lg appearance-none cursor-pointer accent-blue-400"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-indigo-300 mb-1">Giá vốn (COGS) %</label>
                            <input
                                type="number"
                                value={cogsRate}
                                onChange={(e) => setCogsRate(Number(e.target.value))}
                                className="w-full bg-indigo-800/50 border border-indigo-600 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-indigo-300 mb-1">Chi phí Ads %</label>
                            <input
                                type="number"
                                value={adsRate}
                                onChange={(e) => setAdsRate(Number(e.target.value))}
                                className="w-full bg-indigo-800/50 border border-indigo-600 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-indigo-300 mb-1">Phí sàn TB %</label>
                            <input
                                type="number"
                                value={platformFeeRate}
                                onChange={(e) => setPlatformFeeRate(Number(e.target.value))}
                                className="w-full bg-indigo-800/50 border border-indigo-600 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-indigo-300 mb-1">Hoàn hủy/Ship %</label>
                            <input
                                type="number"
                                value={shippingRate}
                                onChange={(e) => setShippingRate(Number(e.target.value))}
                                className="w-full bg-indigo-800/50 border border-indigo-600 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-indigo-300 mb-1">Chi phí cố định (Lương/Thuê nhà)</label>
                        <input
                            type="number"
                            value={fixedCost}
                            onChange={(e) => setFixedCost(Number(e.target.value))}
                            className="w-full bg-indigo-800/50 border border-indigo-600 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>

                {/* Results */}
                <div className="bg-indigo-950/50 rounded-xl p-6 border border-indigo-800 flex flex-col justify-center space-y-6">
                    <h4 className="text-sm font-semibold text-indigo-300 uppercase tracking-wider border-b border-indigo-800 pb-2">
                        Kết quả dự tính (Tháng tới)
                    </h4>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-indigo-200">Tổng Doanh Thu:</span>
                            <span className="text-xl font-bold text-white">{fmt(revenue)}</span>
                        </div>
                        <div className="flex justify-between items-center text-red-300">
                            <span>Tổng Chi Phí:</span>
                            <span className="font-semibold">-{fmt(totalVariableCost + fixedCost)}</span>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-indigo-800">
                        <div className="flex justify-between items-end mb-1">
                            <span className="text-green-400 font-bold text-lg">Lợi Nhuận Ròng:</span>
                            <span className="text-3xl font-bold text-green-400">{fmt(projectedProfit)}</span>
                        </div>
                        <div className="flex justify-end items-center gap-2 text-xs">
                            {projectedProfit > 50000000 ? (
                                <span className="text-yellow-400 flex items-center gap-1">
                                    🚀 Tuyệt vời! Đã vượt mục tiêu!
                                </span>
                            ) : (
                                <span className="text-gray-400">Tiếp tục cố gắng!</span>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-indigo-300 mb-1">
                            <span>Tiến độ mục tiêu Lợi nhuận</span>
                            <span>{Math.min((projectedProfit / 50000000) * 100, 100).toFixed(1)}%</span>
                        </div>
                        <div className="h-2 bg-indigo-900 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min((projectedProfit / 50000000) * 100, 100)}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
