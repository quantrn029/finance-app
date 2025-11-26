import { NextRequest, NextResponse } from 'next/server'
import prisma from "@/lib/prisma"
import { startOfMonth, endOfMonth } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const period = searchParams.get('period') // e.g., "2025-11" or "all"

        // 1. Determine Date Filter
        let dateFilter: any = {}
        if (period && period !== 'all') {
            const [year, month] = period.split('-').map(Number)
            const startDate = new Date(year, month - 1, 1)
            const endDate = endOfMonth(startDate)
            dateFilter = {
                date: {
                    gte: startDate,
                    lte: endDate
                }
            }
        }

        // 2. Fetch Global Metrics (Efficient Aggregation)
        const [globalStats, expenseStats] = await Promise.all([
            prisma.order.aggregate({
                where: {
                    ...dateFilter,
                    status: { not: 'Cancelled' }
                },
                _sum: {
                    revenue: true,
                    platformFee: true, // Note: Ensure this field is populated correctly in DB
                    // If platformFee is not directly stored, we might need to calc it. 
                    // Based on previous files, platformFee seems to be a field or calculated.
                    // Let's assume it's available or we approximate.
                    // Actually, in `api/expenses`, we summed many fee fields. 
                    // Doing that here for ALL orders might be complex if we don't have a generated column.
                    // Let's check schema if needed. For now, assuming 'platformFee' exists or we use a simplified approach.
                    // Re-checking `api/expenses`: it manually summed fields.
                    // `Order` model has `platformFee` field? Let's assume yes from `api/products/analytics` existing code:
                    // `const globalPlatformFees = allOrders.reduce((sum, o) => sum + (o.platformFee || 0), 0)`
                    // So `platformFee` exists.
                }
            }),
            prisma.expense.aggregate({
                where: {
                    ...dateFilter
                },
                _sum: { amount: true }
            })
        ])

        const totalRevenue = globalStats._sum.revenue || 0
        const totalPlatformFees = globalStats._sum.platformFee || 0
        const totalOpEx = expenseStats._sum.amount || 0

        const avgPlatformFeePercent = totalRevenue > 0 ? (totalPlatformFees / totalRevenue) : 0
        const avgOpExPercent = totalRevenue > 0 ? (totalOpEx / totalRevenue) : 0

        // 3. Fetch Products and SKUs
        const products = await prisma.product.findMany({
            include: { skus: true }
        })

        // 4. Aggregate Order Items (Group By SKU/Name)
        // We use groupBy to avoid fetching individual items
        const itemStats = await prisma.orderItem.groupBy({
            by: ['sku', 'productName'],
            where: {
                order: {
                    ...dateFilter,
                    status: { not: 'Cancelled' }
                }
            },
            _sum: {
                quantity: true,
                totalRevenue: true
            },
            _count: {
                orderId: true // Approximate order count (line items count)
            }
        })

        // 5. Map Stats to Products
        // Create lookup maps
        const productMap = new Map<string, any>()
        const skuToProductId = new Map<string, string>()
        const nameToProductId = new Map<string, string>()

        products.forEach(p => {
            productMap.set(p.id, {
                ...p,
                metrics: { revenue: 0, orders: 0, quantity: 0 }
            })
            // Map SKUs
            p.skus.forEach(s => {
                if (s.sku) skuToProductId.set(s.sku.toLowerCase(), p.id)
            })
            // Map Name
            if (p.name) nameToProductId.set(p.name.toLowerCase(), p.id)
        })

        // Distribute stats
        itemStats.forEach(stat => {
            let productId = null

            // Try matching by SKU
            if (stat.sku) {
                productId = skuToProductId.get(stat.sku.toLowerCase())
            }

            // Try matching by Name if no SKU match
            if (!productId && stat.productName) {
                productId = nameToProductId.get(stat.productName.toLowerCase())
            }

            if (productId) {
                const p = productMap.get(productId)
                if (p) {
                    p.metrics.revenue += stat._sum.totalRevenue || 0
                    p.metrics.quantity += stat._sum.quantity || 0
                    p.metrics.orders += stat._count.orderId || 0
                }
            }
        })

        // Convert map to array and sort
        const productMetrics = Array.from(productMap.values())
            .sort((a, b) => b.metrics.revenue - a.metrics.revenue)

        return NextResponse.json({
            products: productMetrics,
            globalMetrics: {
                avgPlatformFeePercent,
                avgOpExPercent,
                totalRevenue,
                totalOpEx,
                totalPlatformFees
            },
            period
        }, {
            headers: {
                'Cache-Control': 's-maxage=60, stale-while-revalidate=300'
            }
        })

    } catch (error: any) {
        console.error('GET /api/products/analytics error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
