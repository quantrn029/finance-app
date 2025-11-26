import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Target, DollarSign, Wallet, ShoppingCart, Calendar } from "lucide-react";
import { DailyData } from "@/utils/goalCascade";

interface DailyProgressProps {
    dailyData: DailyData;
}

export function DailyProgress({ dailyData }: DailyProgressProps) {
    const { month, dayOfMonth, targets, actuals, progress } = dailyData;

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
            notation: "compact",
            maximumFractionDigits: 1,
        }).format(value);

    const formatNumber = (value: number) => new Intl.NumberFormat("vi-VN").format(value);

    const getProgressColor = (percentage: number) => {
        if (percentage >= 100) return "text-green-600 bg-green-50";
        if (percentage >= 70) return "text-blue-600 bg-blue-50";
        if (percentage >= 50) return "text-yellow-600 bg-yellow-50";
        return "text-red-600 bg-red-50";
    };

    const getProgressIcon = (percentage: number) =>
        percentage >= 100 ? (
            <TrendingUp className="h-4 w-4 text-green-600" />
        ) : (
            <TrendingDown className="h-4 w-4 text-red-600" />
        );

    const metrics = [
        { label: "Doanh thu", icon: DollarSign, key: "revenue" as const },
        { label: "Lợi nhuận", icon: Wallet, key: "profit" as const },
        { label: "Đơn hàng", icon: ShoppingCart, key: "orders" as const },
    ];

    return (
        <Card className="col-span-full">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-blue-600" />
                        Mục tiêu hôm nay (Ngày {dayOfMonth})
                    </CardTitle>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                    Phân bổ từ mục tiêu tháng {month}
                </p>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                    {metrics.map((metric) => {
                        const target = targets[metric.key];
                        const actual = actuals[metric.key];
                        const prog = progress[metric.key];
                        const progressColor = getProgressColor(prog);
                        const Icon = metric.icon;
                        return (
                            <div key={metric.label} className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Icon className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm font-medium">{metric.label}</span>
                                    </div>
                                    {getProgressIcon(prog)}
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Mục tiêu:</span>
                                        <span className="font-medium">
                                            {metric.key === "orders" ? formatNumber(target) : formatCurrency(target)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Thực tế:</span>
                                        <span className="font-semibold">
                                            {metric.key === "orders" ? formatNumber(actual) : formatCurrency(actual)}
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center">
                                        <span className={`text-xs font-semibold ${progressColor}`}> {prog.toFixed(1)}% </span>
                                        <span className="text-xs text-muted-foreground">
                                            {prog >= 100 ? "Đạt mục tiêu" : "Chưa đạt"}
                                        </span>
                                    </div>
                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-500 ${prog >= 100
                                                    ? "bg-green-500"
                                                    : prog >= 70
                                                        ? "bg-blue-500"
                                                        : prog >= 50
                                                            ? "bg-yellow-500"
                                                            : "bg-red-500"
                                                }`}
                                            style={{ width: `${Math.min(prog, 100)}%` }}
                                        />
                                    </div>
                                </div>
                                <div className="text-xs">
                                    {actual >= target ? (
                                        <span className="text-green-600 font-medium">
                                            ↑ Vượt {metric.key === "orders" ? formatNumber(actual - target) : formatCurrency(actual - target)}
                                        </span>
                                    ) : (
                                        <span className="text-red-600 font-medium">
                                            ↓ Thiếu {metric.key === "orders" ? formatNumber(target - actual) : formatCurrency(target - actual)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
