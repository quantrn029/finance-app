import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const period = searchParams.get('period') // e.g., "2025-11" or "all"

        // 1. Fetch all products
        const products = await prisma.product.findMany({
            include: {
                skus: true
            }
        })

        // 2. Fetch all order items with order details
        // Filter by date if period is provided
        let dateFilter = {}
        if (period && period !== 'all') {
            const [year, month] = period.split('-').map(Number)
            const startDate = new Date(year, month - 1, 1)
            const endDate = new Date(year, month, 0)
            dateFilter = {
                date: {
                    gte: startDate,
                    lte: endDate
                }
            }
        }

        const orderItems = await prisma.orderItem.findMany({
            where: {
                order: {
                    ...dateFilter,
                    status: { not: 'Cancelled' } // Exclude cancelled orders
                }
            },
            include: {
                order: true
            }
        })

        // 3. Fetch all expenses for the period
        const expenses = await prisma.expense.findMany({
            where: {
                ...dateFilter
            }
        })

        // 4. Calculate Global Metrics
        const totalRevenue = orderItems.reduce((sum, item) => sum + item.totalRevenue, 0) // This is item revenue. Better to use Order revenue?
        // Actually, orderItems includes all items. But we need Total Revenue of the shop to calculate OpEx %.
        // Let's fetch all Orders directly for accurate Total Revenue and Total Platform Fees.

        const allOrders = await prisma.order.findMany({
            where: {
                ...dateFilter,
                status: { not: 'Cancelled' }
            }
        })

        const globalRevenue = allOrders.reduce((sum, o) => sum + o.revenue, 0)
        const globalPlatformFees = allOrders.reduce((sum, o) => sum + (o.platformFee || 0), 0) // Note: platformFee in DB is (Revenue - NetPayout), so it includes everything.
        // Wait, earlier we established platformFee = Revenue - NetPayout.
        // So Platform Fee % = (Total Platform Fees) / Total Revenue.

        const totalOpEx = expenses.reduce((sum, e) => sum + e.amount, 0)

        const avgPlatformFeePercent = globalRevenue > 0 ? (globalPlatformFees / globalRevenue) : 0
        const avgOpExPercent = globalRevenue > 0 ? (totalOpEx / globalRevenue) : 0

        // 5. Aggregate metrics per product
        const productMetrics = products.map(product => {
            // ... (existing logic)
            // Find items related to this product
            const productSkuSet = new Set(product.skus.map(s => s.sku))
            const items = orderItems.filter(item =>
                (item.sku && productSkuSet.has(item.sku)) || item.productName === product.name
            )

            const totalOrders = new Set(items.map(i => i.orderId)).size
            const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0)
            const totalRevenue = items.reduce((sum, i) => sum + i.totalRevenue, 0)

            // Calculate COGS
            const totalCOGS = totalQuantity * (product.materialCost + product.laborCost)

            // We can still return these for now, but UI will ignore them if needed.
            // ...

            return {
                id: product.id,
                name: product.name,
                sku: product.sku,
                category: product.category,
                sellingPrice: product.sellingPrice,
                materialCost: product.materialCost,
                laborCost: product.laborCost,
                tags: product.tags ? product.tags.split(',') : [],
                metrics: {
                    revenue: totalRevenue,
                    orders: totalOrders,
                    quantity: totalQuantity,
                    // ...
                }
            }
        })

        // Sort by Revenue desc by default
        productMetrics.sort((a, b) => b.metrics.revenue - a.metrics.revenue)

        return NextResponse.json({
            products: productMetrics,
            globalMetrics: {
                avgPlatformFeePercent,
                avgOpExPercent,
                totalRevenue: globalRevenue,
                totalOpEx,
                totalPlatformFees: globalPlatformFees
            },
            period
        })

    } catch (error: any) {
        console.error('GET /api/products/analytics error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
