
import prisma from "@/lib/prisma"
import { startOfDay, endOfDay } from "date-fns"

async function main() {
    const from = "2025-11-01"
    const to = "2025-11-30"

    const startDate = startOfDay(new Date(from))
    const endDate = endOfDay(new Date(to))

    console.log(`Simulating Finance API for ${startDate.toISOString()} to ${endDate.toISOString()}`)

    // 1. Fetch Orders (Exact same query as API)
    const orders = await prisma.order.findMany({
        where: {
            date: {
                gte: startDate,
                lte: endDate,
            },
            status: { not: "Cancelled" }
        },
    })

    console.log(`Found ${orders.length} orders.`)

    // 2. Calculate Platform Fees (Exact same logic as API)
    const totalPlatformFees = orders.reduce((sum, order) => sum + order.platformFee + order.shippingFee + order.promotion + order.otherFees, 0)

    console.log("Total Platform Fees (from Orders):", totalPlatformFees)

    // 3. Fetch Expenses (Exact same query as API)
    const expenses = await prisma.expense.findMany({
        where: {
            date: {
                gte: startDate,
                lte: endDate,
            },
        },
    })

    // 4. Calculate Platform Expenses (Exact same logic as API)
    const sumExpenses = (exps: any[], category: string) =>
        exps.filter(e => e.category === category || (category === 'COGS' && e.category === 'Materials')).reduce((sum, e) => sum + e.amount, 0)

    const currentPlatformExpenses = sumExpenses(expenses, 'Platform')

    console.log("Platform Expenses (from Expenses table):", currentPlatformExpenses)

    // 5. Total shown in P&L
    const totalShown = totalPlatformFees + currentPlatformExpenses
    console.log("Total Shown in P&L (Chi phí sàn & Phí GD):", totalShown)
}

main()
