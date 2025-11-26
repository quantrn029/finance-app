import { OrdersClient } from "@/components/orders/OrdersClient"
import { startOfMonth, endOfMonth } from "date-fns"

export const dynamic = 'force-dynamic'

async function getOrdersData(startDate: Date, endDate: Date) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const query = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        page: '1',
        limit: '50'
    })

    try {
        const res = await fetch(`${baseUrl}/api/orders?${query}`, {
            cache: 'no-store'
        })

        if (!res.ok) {
            throw new Error('Failed to fetch orders data')
        }

        return await res.json()
    } catch (error) {
        console.error('Server-side orders fetch error:', error)
        return { orders: [], pagination: { total: 0, totalPages: 1 }, summary: null }
    }
}

export default async function OrdersPage() {
    const now = new Date()
    const startDate = startOfMonth(now)
    const endDate = endOfMonth(now)

    const initialData = await getOrdersData(startDate, endDate)

    return (
        <OrdersClient
            initialData={initialData}
            initialDateFrom={startDate}
            initialDateTo={endDate}
        />
    )
}
