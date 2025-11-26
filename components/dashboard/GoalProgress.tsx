interface GoalProgressProps {
    actual: number
    target: number
    label: string
    icon: React.ReactNode
    color: string
}

export function GoalProgress({ actual, target, label, icon, color }: GoalProgressProps) {
    const percentage = target > 0 ? Math.min((actual / target) * 100, 100) : 0
    const achieved = actual >= target

    return (
        <div className="flex items-center gap-4">
            <div className="relative w-16 h-16">
                <svg className="w-16 h-16 transform -rotate-90">
                    <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="#e5e7eb"
                        strokeWidth="6"
                        fill="none"
                    />
                    <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke={color}
                        strokeWidth="6"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 28}`}
                        strokeDashoffset={`${2 * Math.PI * 28 * (1 - percentage / 100)}`}
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold">{Math.round(percentage)}%</span>
                </div>
            </div>

            <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                    {icon}
                    <span className="text-sm font-medium text-gray-700">{label}</span>
                    {achieved && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">✓ Đạt</span>}
                </div>
                <div className="text-xs text-gray-500">
                    <span className="font-semibold" style={{ color }}>{new Intl.NumberFormat('vi-VN', {
                        style: actual < 10000 ? 'decimal' : 'currency',
                        currency: 'VND',
                        notation: 'compact'
                    }).format(actual)}</span>
                    {' / '}
                    {new Intl.NumberFormat('vi-VN', {
                        style: target < 10000 ? 'decimal' : 'currency',
                        currency: 'VND',
                        notation: 'compact'
                    }).format(target)}
                </div>
            </div>
        </div>
    )
}
