import { DashboardClient } from "@/components/DashboardClient"
import { startOfMonth, endOfMonth } from "date-fns"

// Force dynamic rendering (server-render on each request)
export const dynamic = 'force-dynamic'

async function getDashboardData(startDate: Date, endDate: Date) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const query = `?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`

  try {
    const res = await fetch(`${baseUrl}/api/dashboard${query}`, {
      cache: 'no-store' // Always get fresh data
    })

    if (!res.ok) {
      throw new Error('Failed to fetch dashboard data')
    }

    return await res.json()
  } catch (error) {
    console.error('Server-side dashboard fetch error:', error)
    // Return minimal data structure to prevent crash
    return {
      revenue: 0,
      netPayout: 0,
      platformFees: 0,
      totalExpenses: 0,
      materials: 0,
      adsSpend: 0,
      operating: 0,
      profit: 0,
      orderCount: 0,
      aov: 0,
      projectedRevenue: 0,
      projectedProfit: 0,
      daysPassed: 0,
      daysInMonth: 0,
      currentGoal: null,
      channelMetrics: [],
      alerts: [],
      weeklyData: null
    }
  }
}

export default async function DashboardPage() {
  // Fetch initial data for this month (default view)
  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  const initialData = await getDashboardData(monthStart, monthEnd)

  return (
    <DashboardClient
      initialData={initialData}
      initialPeriod="month"
      initialDateRange={{ from: monthStart, to: monthEnd }}
    />
  )
}
