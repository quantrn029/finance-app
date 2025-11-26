import { ExpensesClient } from "@/components/expenses/ExpensesClient"
import { startOfMonth, endOfMonth } from "date-fns"

export const dynamic = 'force-dynamic'

async function getExpensesData(startDate: Date, endDate: Date) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const query = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
    })

    try {
        const res = await fetch(`${baseUrl}/api/expenses?${query}`, {
            cache: 'no-store'
        })

        if (!res.ok) {
            throw new Error('Failed to fetch expenses data')
        }

        return await res.json()
    } catch (error) {
        console.error('Server-side expenses fetch error:', error)
        return { expenses: [] }
    }
}

export default async function ExpensesPage() {
    const now = new Date()
    const startDate = startOfMonth(now)
    const endDate = endOfMonth(now)

    const initialData = await getExpensesData(startDate, endDate)

    return (
        <ExpensesClient
            initialData={initialData}
            initialDateRange={{ from: startDate, to: endDate }}
        />
    )
}
