import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, TrendingDown, Target } from "lucide-react"
import { ForecastingData } from "@/lib/analytics"

interface ForecastingCardProps {
    data: ForecastingData
}

export function ForecastingCard({ data }: ForecastingCardProps) {
    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-medium">
                    Dự báo cuối tháng
                </CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Progress Bar */}
                    <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Tiến độ tháng</span>
                            <span>Ngày {data.daysPassed}/{data.totalDays} ({Math.round(data.progress)}%)</span>
                        </div>
                        <Progress value={data.progress} className="h-2" />
                    </div>

                    {/* Revenue Projection */}
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Doanh thu dự kiến</p>
                        <div className="flex items-baseline justify-between">
                            <span className="text-2xl font-bold">{formatCurrency(data.projectedRevenue)}</span>
                            <span className="text-xs text-muted-foreground">
                                Hiện tại: {formatCurrency(data.currentRevenue)}
                            </span>
                        </div>
                        <p className="text-xs text-emerald-600 flex items-center">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            Trung bình: {formatCurrency(data.dailyAverageRevenue)}/ngày
                        </p>
                    </div>

                    {/* Profit Projection */}
                    <div className="space-y-1 pt-2 border-t">
                        <p className="text-sm font-medium text-muted-foreground">Lợi nhuận dự kiến</p>
                        <div className="flex items-baseline justify-between">
                            <span className={`text-xl font-bold ${data.projectedProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {formatCurrency(data.projectedProfit)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                Hiện tại: {formatCurrency(data.currentProfit)}
                            </span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
