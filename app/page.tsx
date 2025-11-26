"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TimePeriodFilter, getPeriodRange, type TimePeriod } from "@/components/TimePeriodFilter"
import { TargetsCard } from "@/components/dashboard/TargetsCard"
import { SmartForecast } from "@/components/dashboard/SmartForecast"
import { WaterfallChart } from "@/components/dashboard/WaterfallChart"
import { ChannelBreakdown } from "@/components/dashboard/ChannelBreakdown"
import { AlertsSection, generateAlerts } from "@/components/dashboard/AlertsSection"
import { WeeklyProgress } from "@/components/dashboard/WeeklyProgress"

import { DollarSign, ShoppingCart, Wallet, TrendingUp, Loader2 } from "lucide-react"
import { startOfMonth, endOfMonth } from "date-fns"

export default function DashboardPage() {
  const [period, setPeriod] = useState<TimePeriod>('month')
  const [date, setDate] = useState(new Date())
  const [dateRange, setDateRange] = useState<{ from: Date, to: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  })
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const savedPeriod = localStorage.getItem("defaultTimePeriod")
    if (savedPeriod && ['today', 'week', 'month', 'year', 'all'].includes(savedPeriod)) {
      if (savedPeriod === 'today') {
        setPeriod('today')
        const today = new Date()
        setDateRange({ from: today, to: today })
      } else if (savedPeriod === 'year') {
        setPeriod('this_year')
        const yearStart = new Date(new Date().getFullYear(), 0, 1)
        const yearEnd = new Date(new Date().getFullYear(), 11, 31)
        setDateRange({ from: yearStart, to: yearEnd })
      } else if (savedPeriod === 'month') {
        setPeriod('this_month')
        setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) })
      } else if (savedPeriod === 'all') {
        setPeriod('all')
        // Set a wide range for "all time"
        const allStart = new Date(2020, 0, 1)
        const allEnd = new Date()
        setDateRange({ from: allStart, to: allEnd })
      }
    }
  }, [])

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)
        let range = { from: new Date(), to: new Date() }

        if (period === 'custom') {
          range = dateRange
        } else {
          range = getPeriodRange(period, date)
        }

        // Format dates for API
        const startDate = range.from.toISOString()
        const endDate = range.to.toISOString()
        const query = `?startDate=${startDate}&endDate=${endDate}`

        // Fetch pre-calculated dashboard data from server
        const res = await fetch(`/api/dashboard${query}`)

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || "Failed to fetch dashboard data")
        }

        const dashboardData = await res.json()
        setData(dashboardData)
      } catch (error: any) {
        console.error("Failed to fetch dashboard data:", error)
        setError(error.message || "Không thể tải dữ liệu. Vui lòng kiểm tra kết nối Database.")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [period, date])

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Đang tải dữ liệu...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2 text-red-500">
          <p className="font-medium">Đã xảy ra lỗi</p>
          <p className="text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Thử lại
          </button>
        </div>
      </div>
    )
  }

  if (!data) return null

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val)

  return (
    <div className="p-8 max-w-[1800px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight dark:text-white">Dashboard</h2>
          <p className="text-muted-foreground dark:text-gray-400">Tổng quan tài chính doanh nghiệp</p>
        </div>
        <TimePeriodFilter
          period={period}
          setPeriod={setPeriod}
          date={date}
          setDate={setDate}
          dateRange={dateRange}
          setDateRange={(range) => {
            if (range?.from && range?.to) {
              setDateRange({ from: range.from, to: range.to })
            }
          }}
        />
      </div>

      {/* Targets and Forecast Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {data.currentGoal && period === 'month' && (
          <TargetsCard
            revenueTarget={data.currentGoal.revenueTarget || 0}
            revenueCurrent={data.revenue}
            profitTarget={data.currentGoal.profitTarget || 0}
            profitCurrent={data.profit}
            ordersTarget={data.currentGoal.ordersTarget || 0}
            ordersCurrent={data.orderCount}
            daysPassed={data.daysPassed}
            totalDays={data.daysInMonth}
          />
        )}
        {period === 'month' && data.currentGoal && (
          <SmartForecast
            currentRevenue={data.revenue}
            projectedRevenue={data.projectedRevenue}
            currentProfit={data.profit}
            projectedProfit={data.projectedProfit}
            revenueTarget={data.currentGoal.revenueTarget || 0}
            profitTarget={data.currentGoal.profitTarget || 0}
            daysPassed={data.daysPassed}
            totalDays={data.daysInMonth}
          />
        )}
      </div>

      {/* Weekly Progress (only for week period) */}
      {period === 'week' && data.weeklyData && (
        <WeeklyProgress weeklyData={data.weeklyData} />
      )}



      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Doanh thu</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold dark:text-white">{formatCurrency(data.revenue)}</div>
            <p className="text-xs text-muted-foreground dark:text-gray-400">Tổng doanh thu</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chi phí</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(data.totalExpenses + data.platformFees)}</div>
            <p className="text-xs text-muted-foreground dark:text-gray-400">Chi phí sàn + Ads + Ops + NVL</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lợi nhuận</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(data.profit)}</div>
            <p className="text-xs text-muted-foreground dark:text-gray-400">Thực nhận - Chi phí</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đơn hàng</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold dark:text-white">{data.orderCount}</div>
            <p className="text-xs text-muted-foreground dark:text-gray-400">AOV: {formatCurrency(data.aov)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Waterfall Chart */}
      <WaterfallChart
        revenue={data.revenue}
        materials={data.materials}
        platformFees={data.platformFees}
        adsSpend={data.adsSpend}
        operating={data.operating}
        netProfit={data.profit}
      />

      {/* Channel Breakdown */}
      {data.channelMetrics.length > 0 && (
        <ChannelBreakdown channels={data.channelMetrics} />
      )}

      {/* Alerts */}
      {data.alerts.length > 0 && (
        <AlertsSection alerts={data.alerts} />
      )}

      {/* Tabs for detailed views */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="reports">Báo cáo chi tiết</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Thông tin thêm</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground dark:text-gray-400">
                Xem các tab khác để phân tích sâu hơn về dữ liệu tài chính.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Export Reports</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <a href="/api/export?format=csv" className="block w-full">
                <button className="w-full p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Download CSV
                </button>
              </a>
              <a href="/api/export?format=json" className="block w-full">
                <button className="w-full p-3 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  Download JSON
                </button>
              </a>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
