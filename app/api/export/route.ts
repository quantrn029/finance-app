import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { startOfMonth, endOfMonth } from "date-fns"

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const format = searchParams.get("format") || "json" // json, csv, or pdf

        // Get all orders and expenses
        const orders = await prisma.order.findMany({
            orderBy: { date: 'desc' }
        })

        const expenses = await prisma.expense.findMany({
            orderBy: { date: 'desc' }
        })

        // Calculate summary metrics
        const totalRevenue = orders.reduce((sum, o) => sum + o.revenue, 0)
        const totalNetPayout = orders.reduce((sum, o) => sum + o.netPayout, 0)
        const totalPlatformFees = orders.reduce((sum, o) => sum + o.platformFee, 0)
        const totalShippingFees = orders.reduce((sum, o) => sum + o.shippingFee, 0)
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
        const netProfit = totalNetPayout - totalExpenses

        const report = {
            generatedAt: new Date().toISOString(),
            period: {
                start: startOfMonth(new Date()).toISOString(),
                end: endOfMonth(new Date()).toISOString()
            },
            summary: {
                totalRevenue,
                totalNetPayout,
                totalPlatformFees,
                totalShippingFees,
                totalExpenses,
                netProfit
            },
            orders: orders.map(o => ({
                id: o.platformOrderId,
                platform: o.platform,
                date: o.date.toISOString(),
                revenue: o.revenue,
                platformFee: o.platformFee,
                shippingFee: o.shippingFee,
                netPayout: o.netPayout,
                status: o.status
            })),
            expenses: expenses.map(e => ({
                id: e.id,
                category: e.category,
                date: e.date.toISOString(),
                amount: e.amount,
                description: e.description
            }))
        }

        if (format === "csv") {
            // Generate CSV
            const csvHeaders = "Date,Platform,Revenue,Platform Fee,Shipping Fee,Net Payout,Status\n"
            const csvRows = orders.map(o =>
                `${o.date.toISOString()},${o.platform},${o.revenue},${o.platformFee},${o.shippingFee},${o.netPayout},${o.status}`
            ).join("\n")

            return new NextResponse(csvHeaders + csvRows, {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="financial-report-${Date.now()}.csv"`
                }
            })
        }

        // Return JSON by default
        return NextResponse.json(report)

    } catch (error: any) {
        console.error("Export error:", error)
        return NextResponse.json({
            error: error.message || "Export failed"
        }, { status: 500 })
    }
}
