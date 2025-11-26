interface ExpenseBreakdownProps {
    data: {
        category: string
        amount: number
        color: string
    }[]
}

export function ExpenseBreakdown({ data }: ExpenseBreakdownProps) {
    const total = data.reduce((sum, item) => sum + item.amount, 0)

    if (total === 0) {
        return (
            <div className="h-[200px] flex items-center justify-center text-gray-400">
                Chưa có chi phí
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {data.map((item) => {
                const percentage = (item.amount / total) * 100
                return (
                    <div key={item.category} className="space-y-1">
                        <div className="flex justify-between text-sm">
                            <span className="font-medium">{item.category}</span>
                            <span className="text-gray-500">
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', notation: 'compact' }).format(item.amount)}
                            </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className={`h-2 rounded-full ${item.color}`}
                                style={{ width: `${percentage}%` }}
                            />
                        </div>
                        <div className="text-xs text-gray-500 text-right">{percentage.toFixed(1)}%</div>
                    </div>
                )
            })}
        </div>
    )
}
