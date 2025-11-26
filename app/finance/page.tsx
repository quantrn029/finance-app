import { FinanceDashboardClient } from "@/components/finance/FinanceDashboardClient"
import { startOfMonth, endOfMonth } from "date-fns"

// Force dynamic rendering
export const dynamic = 'force-dynamic'

async function getFinanceData(from: Date, to: Date) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const query = `?from=${from.toISOString()}&to=${to.toISOString()}&period=this_month&comparison=mom`

    try {
        const res = await fetch(`${baseUrl}/api/finance${query}`, {
            cache: 'no-store'
        })

        if (!res.ok) {
            throw new Error('Failed to fetch finance data')
        }

        return await res.json()
    } catch (error) {
        console.error('Server-side finance fetch error:', error)
        return null
    }
}

export default async function FinancePage() {
    // Fetch initial data for this month
    const now = new Date()
    const from = startOfMonth(now)
    const to = endOfMonth(now)

    const initialData = await getFinanceData(from, to)

    return (
        <FinanceDashboardClient
            initialData={initialData}
            initialPeriod="this_month"
            initialDateRange={{ from, to }}
        />
    )
}
