"use client"

import { useState } from "react";
import { ChevronDown, ChevronUp, Target, TrendingUp, DollarSign, ShoppingBag, Calendar } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

export interface WeekData {
    weekIndex: number;
    start: Date;
    end: Date;
    targets: { revenue: number; profit: number; orders: number };
    actuals: { revenue: number; profit: number; orders: number };
    expenses?: { ads: number; operating: number; platform: number };
    progress: { revenue: number; profit: number; orders: number };
}

interface WeeklyProgressProps {
    weeklyData: WeekData[];
}

export function WeeklyProgress({ weeklyData }: WeeklyProgressProps) {
    const [expandedWeek, setExpandedWeek] = useState<number | null>(null);

    const toggleWeek = (weekIndex: number) => {
        if (expandedWeek === weekIndex) {
            setExpandedWeek(null);
        } else {
            setExpandedWeek(weekIndex);
        }
    };

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
            notation: "compact",
            maximumFractionDigits: 1,
        }).format(value);

    const formatNumber = (value: number) => new Intl.NumberFormat("vi-VN").format(value);

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                Tiến độ theo tuần
            </h3>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <CardTitle className="flex items-center gap-2 dark:text-white">
                    <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    Tiến độ hàng tuần (Weekly Progress)
                </CardTitle>
                {/* Header Row */}
                <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <div className="col-span-3 md:col-span-2">Tuần</div>
                    <div className="col-span-3 md:col-span-3 text-right">Doanh thu</div>
                    <div className="col-span-3 md:col-span-3 text-right">Lợi nhuận</div>
                    <div className="col-span-3 md:col-span-3 text-right">Đơn hàng</div>
                    <div className="hidden md:block md:col-span-1 text-center">Chi tiết</div>
                </div>

                {/* Week Rows */}
                <div className="divide-y divide-gray-100">
                    {weeklyData.map((week) => {
                        const isExpanded = expandedWeek === week.weekIndex;
                        const isCurrentWeek = new Date() >= week.start && new Date() <= week.end;

                        return (
                            <div key={week.weekIndex} className={`transition-colors ${isExpanded ? 'bg-blue-50/30' : 'hover:bg-gray-50'}`}>
                                {/* Summary Row (Clickable) */}
                                <div
                                    onClick={() => toggleWeek(week.weekIndex)}
                                    className="grid grid-cols-12 gap-4 p-4 items-center cursor-pointer group"
                                >
                                    {/* Week Info */}
                                    <div className="col-span-3 md:col-span-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`font-medium ${isCurrentWeek ? 'text-blue-600' : 'text-gray-900'}`}>
                                                Tuần {week.weekIndex}
                                            </span>
                                            {isCurrentWeek && (
                                                <span className="hidden md:inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700">
                                                    Hiện tại
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-0.5">
                                            {format(week.start, 'dd/MM')} - {format(week.end, 'dd/MM')}
                                        </div>
                                    </div>

                                    {/* Revenue Summary */}
                                    <div className="col-span-3 md:col-span-3 text-right">
                                        <div className="text-sm font-medium text-gray-900">
                                            {formatCurrency(week.actuals.revenue)}
                                        </div>
                                        <div className="flex items-center justify-end gap-2 mt-1">
                                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${week.progress.revenue >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                                                    style={{ width: `${Math.min(week.progress.revenue, 100)}%` }}
                                                />
                                            </div>
                                            <span className={`text-[10px] font-medium ${week.progress.revenue >= 100 ? 'text-green-600' : 'text-gray-500'}`}>
                                                {week.progress.revenue.toFixed(0)}%
                                            </span>
                                        </div>
                                    </div>

                                    {/* Profit Summary */}
                                    <div className="col-span-3 md:col-span-3 text-right">
                                        <div className="text-sm font-medium text-gray-900">
                                            {formatCurrency(week.actuals.profit)}
                                        </div>
                                        <div className="flex items-center justify-end gap-2 mt-1">
                                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${week.progress.profit >= 100 ? 'bg-green-500' : 'bg-green-600'}`}
                                                    style={{ width: `${Math.min(week.progress.profit, 100)}%` }}
                                                />
                                            </div>
                                            <span className={`text-[10px] font-medium ${week.progress.profit >= 100 ? 'text-green-600' : 'text-gray-500'}`}>
                                                {week.progress.profit.toFixed(0)}%
                                            </span>
                                        </div>
                                    </div>

                                    {/* Orders Summary */}
                                    <div className="col-span-3 md:col-span-3 text-right">
                                        <div className="text-sm font-medium text-gray-900">
                                            {formatNumber(week.actuals.orders)}
                                        </div>
                                        <div className="flex items-center justify-end gap-2 mt-1">
                                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${week.progress.orders >= 100 ? 'bg-green-500' : 'bg-purple-500'}`}
                                                    style={{ width: `${Math.min(week.progress.orders, 100)}%` }}
                                                />
                                            </div>
                                            <span className={`text-[10px] font-medium ${week.progress.orders >= 100 ? 'text-green-600' : 'text-gray-500'}`}>
                                                {week.progress.orders.toFixed(0)}%
                                            </span>
                                        </div>
                                    </div>

                                    {/* Expand Icon */}
                                    <div className="hidden md:flex md:col-span-1 justify-center">
                                        {isExpanded ? (
                                            <ChevronUp className="h-4 w-4 text-gray-400" />
                                        ) : (
                                            <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                                        )}
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {isExpanded && (
                                    <div className="px-4 pb-4 md:px-12 md:pb-6 animate-in slide-in-from-top-2 duration-200">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white rounded-lg border border-gray-100 shadow-sm">
                                            {/* Detailed Revenue */}
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                                    <div className="p-1.5 bg-blue-50 rounded text-blue-600">
                                                        <DollarSign className="h-4 w-4" />
                                                    </div>
                                                    Chi tiết Doanh thu
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-500">Mục tiêu:</span>
                                                    <span className="font-medium">{formatCurrency(week.targets.revenue)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-500">Thực tế:</span>
                                                    <span className="font-bold text-gray-900">{formatCurrency(week.actuals.revenue)}</span>
                                                </div>
                                                <div className="pt-1">
                                                    <div className="flex justify-between text-xs mb-1">
                                                        <span className="text-gray-500">Tiến độ</span>
                                                        <span className={week.progress.revenue >= 100 ? 'text-green-600 font-medium' : 'text-blue-600 font-medium'}>
                                                            {week.progress.revenue.toFixed(1)}%
                                                        </span>
                                                    </div>
                                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${week.progress.revenue >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                                                            style={{ width: `${Math.min(week.progress.revenue, 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Detailed Profit */}
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                                    <div className="p-1.5 bg-green-50 rounded text-green-600">
                                                        <TrendingUp className="h-4 w-4" />
                                                    </div>
                                                    Chi tiết Lợi nhuận
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-500">Mục tiêu:</span>
                                                    <span className="font-medium">{formatCurrency(week.targets.profit)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-500">Thực tế:</span>
                                                    <span className="font-bold text-gray-900">{formatCurrency(week.actuals.profit)}</span>
                                                </div>
                                                <div className="pt-1">
                                                    <div className="flex justify-between text-xs mb-1">
                                                        <span className="text-gray-500">Tiến độ</span>
                                                        <span className={week.progress.profit >= 100 ? 'text-green-600 font-medium' : 'text-green-600 font-medium'}>
                                                            {week.progress.profit.toFixed(1)}%
                                                        </span>
                                                    </div>
                                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${week.progress.profit >= 100 ? 'bg-green-500' : 'bg-green-600'}`}
                                                            style={{ width: `${Math.min(week.progress.profit, 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Detailed Orders */}
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                                    <div className="p-1.5 bg-purple-50 rounded text-purple-600">
                                                        <ShoppingBag className="h-4 w-4" />
                                                    </div>
                                                    Chi tiết Đơn hàng
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-500">Mục tiêu:</span>
                                                    <span className="font-medium">{formatNumber(week.targets.orders)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-500">Thực tế:</span>
                                                    <span className="font-bold text-gray-900">{formatNumber(week.actuals.orders)}</span>
                                                </div>
                                                <div className="pt-1">
                                                    <div className="flex justify-between text-xs mb-1">
                                                        <span className="text-gray-500">Tiến độ</span>
                                                        <span className={week.progress.orders >= 100 ? 'text-green-600 font-medium' : 'text-purple-600 font-medium'}>
                                                            {week.progress.orders.toFixed(1)}%
                                                        </span>
                                                    </div>
                                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${week.progress.orders >= 100 ? 'bg-green-500' : 'bg-purple-500'}`}
                                                            style={{ width: `${Math.min(week.progress.orders, 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Expense Analysis */}
                                            <div className="col-span-1 md:col-span-3 mt-2 pt-4 border-t border-gray-100">
                                                <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                                    <TrendingUp className="h-4 w-4 text-orange-500" />
                                                    Phân tích Chi phí & Lợi nhuận
                                                </h4>
                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                    <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                                                        <div className="text-xs text-gray-500 mb-1">Chi phí Ads</div>
                                                        <div className="font-medium text-gray-900">{formatCurrency(week.expenses?.ads || 0)}</div>
                                                    </div>
                                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                        <div className="text-xs text-gray-500 mb-1">Vận hành & Vật liệu</div>
                                                        <div className="font-medium text-gray-900">{formatCurrency(week.expenses?.operating || 0)}</div>
                                                    </div>
                                                    <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                                                        <div className="text-xs text-gray-500 mb-1">Phí sàn (Điều chỉnh)</div>
                                                        <div className="font-medium text-gray-900">{formatCurrency(week.expenses?.platform || 0)}</div>
                                                    </div>
                                                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                                                        <div className="text-xs text-gray-500 mb-1">Tỷ suất Lợi nhuận</div>
                                                        <div className={`font-bold ${week.actuals.revenue > 0 && (week.actuals.profit / week.actuals.revenue) < 0.15 ? 'text-red-600' : 'text-blue-600'}`}>
                                                            {week.actuals.revenue > 0 ? ((week.actuals.profit / week.actuals.revenue) * 100).toFixed(1) : 0}%
                                                        </div>
                                                    </div>
                                                </div>
                                                {week.actuals.revenue > 0 && (week.actuals.profit / week.actuals.revenue) < 0.15 && (
                                                    <div className="mt-3 text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100 flex items-start gap-2">
                                                        <span className="font-bold">⚠️ Cảnh báo:</span>
                                                        Tỷ suất lợi nhuận thấp ({(week.actuals.profit / week.actuals.revenue * 100).toFixed(1)}%).
                                                        {(week.expenses?.ads || 0) / week.actuals.revenue > 0.3 ? " Chi phí Ads đang chiếm tỷ trọng cao." : ""}
                                                        {(week.expenses?.platform || 0) > 0 ? " Có phát sinh phí sàn điều chỉnh." : ""}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
