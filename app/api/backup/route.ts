import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export const dynamic = 'force-dynamic'

/**
 * Export all data as JSON for backup
 */
export async function GET() {
    try {
        const [orders, expenses, goals, products, skus, orderItems, cashflows] = await Promise.all([
            prisma.order.findMany({ include: { items: true } }),
            prisma.expense.findMany(),
            prisma.goal.findMany(),
            prisma.product.findMany(),
            prisma.productSKU.findMany(),
            prisma.orderItem.findMany(),
            prisma.cashFlow.findMany(),
        ])

        const backup = {
            version: "1.0",
            timestamp: new Date().toISOString(),
            data: {
                orders,
                expenses,
                goals,
                products,
                skus,
                orderItems,
                cashflows,
            },
            stats: {
                orders: orders.length,
                expenses: expenses.length,
                goals: goals.length,
                products: products.length,
                skus: skus.length,
                orderItems: orderItems.length,
                cashflows: cashflows.length,
            }
        }

        const filename = `finadvisor-backup-${new Date().toISOString().slice(0, 10)}.json`

        return new NextResponse(JSON.stringify(backup, null, 2), {
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        })
    } catch (error: any) {
        console.error("Backup export error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

/**
 * Import data from JSON backup
 * WARNING: This will DELETE all existing data!
 */
export async function POST(req: Request) {
    try {
        const backup = await req.json()

        if (!backup.version || !backup.data) {
            return NextResponse.json(
                { error: "Invalid backup file format" },
                { status: 400 }
            )
        }

        // Delete all existing data (in correct order due to foreign keys)
        await prisma.orderItem.deleteMany()
        await prisma.order.deleteMany()
        await prisma.expense.deleteMany()
        await prisma.goal.deleteMany()
        await prisma.cashFlow.deleteMany()
        await prisma.productSKU.deleteMany()
        await prisma.product.deleteMany()

        // Restore data
        const { data } = backup

        // Products first (no dependencies)
        if (data.products?.length > 0) {
            for (const product of data.products) {
                await prisma.product.create({ data: product })
            }
        }

        if (data.skus?.length > 0) {
            for (const sku of data.skus) {
                await prisma.productSKU.create({ data: sku })
            }
        }

        // Orders (independent)
        if (data.orders?.length > 0) {
            for (const order of data.orders) {
                const { items, ...orderData } = order
                await prisma.order.create({
                    data: {
                        ...orderData,
                        items: items ? { create: items } : undefined
                    }
                })
            }
        }

        // Other independent tables
        if (data.expenses?.length > 0) {
            for (const expense of data.expenses) {
                await prisma.expense.create({ data: expense })
            }
        }

        if (data.goals?.length > 0) {
            for (const goal of data.goals) {
                await prisma.goal.create({ data: goal })
            }
        }

        if (data.cashflows?.length > 0) {
            for (const cashflow of data.cashflows) {
                await prisma.cashFlow.create({ data: cashflow })
            }
        }

        return NextResponse.json({
            success: true,
            message: "Data restored successfully",
            stats: backup.stats
        })

    } catch (error: any) {
        console.error("Backup import error:", error)
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        )
    }
}
