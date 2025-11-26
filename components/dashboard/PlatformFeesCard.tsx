import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface FeeBreakdown {
    [key: string]: number
}

interface PlatformFeesCardProps {
    totalFees: number
    breakdown: FeeBreakdown
    totalRevenue: number
}

export default function PlatformFeesCard({ totalFees, breakdown, totalRevenue }: PlatformFeesCardProps) {
    const [open, setOpen] = useState(false)
    const percent = totalRevenue > 0 ? (totalFees / totalRevenue) * 100 : 0

    const formatted = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalFees)

    const feeEntries = Object.entries(breakdown).filter(([, v]) => v && v > 0)

    return (
        <div className="p-6 bg-white rounded-xl shadow-sm border flex flex-col justify-between">
            <div className="flex justify-between items-start">
                <div className="text-sm font-medium text-gray-500">Phí nền tảng</div>
                {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
            <div className="text-2xl font-bold mt-2 text-amber-600">{formatted} ({percent.toFixed(1)}%)</div>
            <button
                className="mt-2 text-sm text-amber-700 hover:underline self-start"
                onClick={() => setOpen(!open)}
            >
                {open ? 'Ẩn chi tiết' : 'Xem chi tiết'}
            </button>
            {open && (
                <div className="mt-4 space-y-2">
                    {feeEntries.map(([name, value]) => (
                        <div key={name} className="flex justify-between text-sm">
                            <span className="capitalize">{name}</span>
                            <span>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
