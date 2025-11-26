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
import { getDaysInMonth, differenceInDays, startOfMonth, endOfMonth, subWeeks } from "date-fns"

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

        // Fetch orders and expenses with date filtering
        // Note: Goals are small enough to fetch all for now, or could be filtered similarly if needed
        const [ordersRes, expensesRes, goalsRes] = await Promise.all([
          fetch(`/api/orders${query}`),
          fetch(`/api/expenses${query}`),
          fetch('/api/goals')
        ])

        if (!ordersRes.ok) {
          const err = await ordersRes.json()
          throw new Error(err.error || "Failed to fetch orders")
        }
        if (!expensesRes.ok) {
          const err = await expensesRes.json()
          throw new Error(err.error || "Failed to fetch expenses")
        }
        if (!goalsRes.ok) {
          const err = await goalsRes.json()
          throw new Error(err.error || "Failed to fetch goals")
        }

        const ordersData = await ordersRes.json()
        const expensesData = await expensesRes.json()
        const goalsData = await goalsRes.json()

        const orders = ordersData.orders || ordersData || []
        const expenses = expensesData.expenses || expensesData || []
        const goals = goalsData.goals || goalsData || []

        // Filter by period
        const filteredOrders = orders.filter((o: any) => {
          const orderDate = new Date(o.date)
          return orderDate >= range.from && orderDate <= range.to
        })

        const filteredExpenses = expenses.filter((e: any) => {
          const expenseDate = new Date(e.date)
          return expenseDate >= range.from && expenseDate <= range.to
        })

        // Get last week orders for order drop calculation
        const lastWeekRange = getPeriodRange(period, subWeeks(date, 1))
        const lastWeekOrders = orders.filter((o: any) => {
          const orderDate = new Date(o.date)
          return orderDate >= lastWeekRange.from && orderDate <= lastWeekRange.to
        })

        // Calculate metrics
        const revenue = filteredOrders.reduce((sum: number, o: any) => sum + o.revenue, 0)
        const netPayout = filteredOrders.reduce((sum: number, o: any) => sum + o.netPayout, 0)
        const platformFees = filteredOrders.reduce((sum: number, o: any) => sum + o.platformFee, 0)
        const totalExpenses = filteredExpenses.reduce((sum: number, e: any) => sum + e.amount, 0)
        const materials = filteredExpenses.filter((e: any) => e.type === 'Materials' || e.category === 'Materials').reduce((sum: number, e: any) => sum + e.amount, 0)
        const adsSpend = filteredExpenses.filter((e: any) => e.type === 'Ads' || e.category === 'Ads').reduce((sum: number, e: any) => sum + e.amount, 0)
        const operating = totalExpenses - materials - adsSpend
        const profit = netPayout - totalExpenses
        const orderCount = filteredOrders.length
        const aov = orderCount > 0 ? revenue / orderCount : 0

        // Forecasting (only for month period)
        const daysInMonth = getDaysInMonth(date)
        const daysPassed = period === 'month' ? Math.min(differenceInDays(new Date(), startOfMonth(date)) + 1, daysInMonth) : daysInMonth
        const projectedRevenue = (revenue / Math.max(daysPassed, 1)) * daysInMonth
        const projectedProfit = (profit / Math.max(daysPassed, 1)) * daysInMonth

        // Goals (for current period)
        let currentPeriodKey = ''
        if (period === 'month') {
          currentPeriodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        } else if (period === 'year') {
          currentPeriodKey = `${date.getFullYear()}`
        }
        // Note: Quarter logic would need to be added here if the filter supports it, 
        // but for now let's stick to month/year matching based on the filter.

        const currentGoal = goals.find((g: any) => g.period === currentPeriodKey)

        // Channel metrics
        const platforms = ['Shopee', 'TikTok', 'Facebook', 'Instagram']
        const channelMetrics = platforms.map(platform => {
          const platformOrders = filteredOrders.filter((o: any) => o.platform === platform)
          const platformRevenue = platformOrders.reduce((sum: number, o: any) => sum + o.revenue, 0)
          const platformFees = platformOrders.reduce((sum: number, o: any) => sum + o.platformFee, 0)
          const platformAds = filteredExpenses.filter((e: any) =>
            (e.type === 'Ads' || e.category === 'Ads') &&
            e.note?.toLowerCase().includes(platform.toLowerCase())
          ).reduce((sum: number, e: any) => sum + e.amount, 0)

          return {
            platform,
            revenue: platformRevenue,
            ads: platformAds,
            fees: platformFees,
            profit: platformRevenue - platformFees - platformAds,
            orders: platformOrders.length
          }
        }).filter(c => c.orders > 0)

        // Alerts
        const totalFees = filteredOrders.reduce((sum: number, o: any) => sum + o.platformFee, 0)
        const cir = revenue > 0 ? ((totalFees + adsSpend) / revenue) * 100 : 0
        const materialsRatio = revenue > 0 ? (materials / revenue) * 100 : 0
        const orderDropPercent = lastWeekOrders.length > 0
          ? ((lastWeekOrders.length - orderCount) / lastWeekOrders.length) * 100
          : 0

        const alerts = generateAlerts({ cir, materialsRatio, orderDropPercent })

        // Weekly breakdown (for week period)
        let weeklyData = null
        if (period === 'week') {
          // Get monthly goal for the month containing this week
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          const monthlyGoal = goals.find((g: any) => g.period === monthKey && g.type === 'monthly')

          if (monthlyGoal) {
            // Calculate number of weeks in this month
            const weeksInMonth = Math.ceil(getDaysInMonth(date) / 7)

            // Weekly targets (divide monthly goal by weeks)
            const weeklyRevenueTarget = monthlyGoal.revenueTarget / weeksInMonth
            const weeklyProfitTarget = monthlyGoal.profitTarget / weeksInMonth
            const weeklyOrdersTarget = Math.round(monthlyGoal.ordersTarget / weeksInMonth)

            // Calculate progress
            const revenueProgress = weeklyRevenueTarget > 0 ? (revenue / weeklyRevenueTarget) * 100 : 0
            const profitProgress = weeklyProfitTarget > 0 ? (profit / weeklyProfitTarget) * 100 : 0
            const ordersProgress = weeklyOrdersTarget > 0 ? (orderCount / weeklyOrdersTarget) * 100 : 0

            // Determine week index (approximate)
            const startOfMonthDate = startOfMonth(date)
            const weekIndex = Math.ceil((date.getDate() + startOfMonthDate.getDay()) / 7)

            weeklyData = [{
              weekIndex,
              start: range.from,
              end: range.to,
              targets: {
                revenue: weeklyRevenueTarget,
                profit: weeklyProfitTarget,
                orders: weeklyOrdersTarget
              },
              actuals: {
                revenue,
                profit,
                orders: orderCount
              },
              progress: {
                revenue: revenueProgress,
                profit: profitProgress,
                orders: ordersProgress
              }
            }]
          }
        }



        setData({
          revenue,
          netPayout,
          platformFees,
          totalExpenses,
          materials,
          adsSpend,
          operating,
          profit,
          orderCount,
          aov,
          projectedRevenue,
          projectedProfit,
          daysPassed,
          daysInMonth,
          currentGoal,
          channelMetrics,
          alerts,
          weeklyData,

        })
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
