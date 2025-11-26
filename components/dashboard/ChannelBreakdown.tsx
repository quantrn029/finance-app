"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TrendingUp, TrendingDown } from "lucide-react"

interface ChannelData {
    platform: string
    revenue: number
    ads: number
    fees: number
    profit: number
    orders: number
}

interface ChannelBreakdownProps {
    channels: ChannelData[]
}

export function ChannelBreakdown({ channels }: ChannelBreakdownProps) {
    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val)

    const getPlatformColor = (platform: string) => {
        switch (platform) {
            case 'Shopee': return 'text-orange-600 dark:text-orange-400'
            case 'TikTok': return 'text-black dark:text-white'
            case 'Facebook': return 'text-blue-600 dark:text-blue-400'
            case 'Instagram': return 'text-purple-600 dark:text-purple-400'
            default: return 'text-gray-600 dark:text-gray-400'
        }
    }

    const totalRevenue = channels.reduce((sum, c) => sum + c.revenue, 0)

    return (
        <Card>
            <CardHeader>
                <CardTitle className="dark:text-white">Hiệu quả từng kênh (Channel P&L)</CardTitle>
                <p className="text-xs text-muted-foreground dark:text-gray-400">So sánh doanh thu và lợi nhuận theo từng nền tảng</p>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Kênh</TableHead>
                            <TableHead className="text-right">Doanh thu</TableHead>
                            <TableHead className="text-right">Chi phí Ads</TableHead>
                            <TableHead className="text-right">Phí sàn</TableHead>
                            <TableHead className="text-right">Lợi nhuận</TableHead>
                            <TableHead className="text-right">Đơn hàng</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {channels.map((channel) => {
                            const margin = (channel.profit / channel.revenue) * 100
                            return (
                                <TableRow key={channel.platform}>
                                    <TableCell className="font-medium">
                                        <span className={getPlatformColor(channel.platform)}>
                                            ● {channel.platform}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right dark:text-gray-200">
                                        {formatCurrency(channel.revenue)}
                                        <div className="text-xs text-muted-foreground dark:text-gray-400">
                                            {((channel.revenue / totalRevenue) * 100).toFixed(1)}%
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right text-red-600 dark:text-red-400">
                                        -{formatCurrency(channel.ads)}
                                    </TableCell>
                                    <TableCell className="text-right text-red-600 dark:text-red-400">
                                        -{formatCurrency(channel.fees)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <span className={channel.profit > 0 ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-red-600 dark:text-red-400'}>
                                            {formatCurrency(channel.profit)}
                                        </span>
                                        <div className="text-xs text-muted-foreground dark:text-gray-400">
                                            Margin: {margin.toFixed(1)}%
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right dark:text-gray-200">
                                        {channel.orders}
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                        <TableRow className="bg-muted/50 dark:bg-gray-800/50 font-bold">
                            <TableCell className="dark:text-white">Tổng</TableCell>
                            <TableCell className="text-right dark:text-white">
                                {formatCurrency(channels.reduce((s, c) => s + c.revenue, 0))}
                            </TableCell>
                            <TableCell className="text-right text-red-600 dark:text-red-400">
                                -{formatCurrency(channels.reduce((s, c) => s + c.ads, 0))}
                            </TableCell>
                            <TableCell className="text-right text-red-600 dark:text-red-400">
                                -{formatCurrency(channels.reduce((s, c) => s + c.fees, 0))}
                            </TableCell>
                            <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(channels.reduce((s, c) => s + c.profit, 0))}
                            </TableCell>
                            <TableCell className="text-right dark:text-white">
                                {channels.reduce((s, c) => s + c.orders, 0)}
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
