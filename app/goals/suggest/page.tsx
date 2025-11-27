import { KPISuggestionClient } from "@/components/goals/KPISuggestionClient"
import prisma from "@/lib/prisma"

export const dynamic = 'force-dynamic'

async function getOrders() {
    try {
        // Fetch all orders to analyze history
        // Optimize: Select only necessary fields
        const orders = await prisma.order.findMany({
            select: {
                date: true,
                revenue: true,
                netPayout: true,
                shippingFee: true,
                platformFee: true
            },
            orderBy: {
                date: 'asc'
            }
        })
        return orders
    } catch (error) {
        console.error('Failed to fetch orders for KPI analysis:', error)
        return []
    }
}

export default async function KPISuggestionPage() {
    const orders = await getOrders()

    return (
        <KPISuggestionClient initialOrders={orders} />
    )
}
