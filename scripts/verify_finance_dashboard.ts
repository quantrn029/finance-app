
import { PrismaClient } from '@prisma/client'
import { startOfMonth, endOfMonth, subMonths } from 'date-fns'

const prisma = new PrismaClient()

async function main() {
    try {
        await prisma.$executeRawUnsafe('DEALLOCATE ALL')
    } catch (e) { }

    const octStart = new Date('2025-10-01')
    const octEnd = new Date('2025-10-31T23:59:59.999Z')

    const sepStart = new Date('2025-09-01')
    const sepEnd = new Date('2025-09-30T23:59:59.999Z')

    console.log("--- SEPTEMBER (Previous Period) ---")
    const sepExpenses = await prisma.expense.findMany({
        where: { date: { gte: sepStart, lte: sepEnd } }
    })
    console.log(`Total Expenses Count: ${sepExpenses.length}`)
    if (sepExpenses.length > 0) {
        console.log("Expenses found (unexpected 0 in dashboard?):")
        sepExpenses.forEach(e => console.log(`  ${e.category}: ${e.amount}`))
    } else {
        console.log("No expenses found. This explains why COGS/Ads/Operating are 0.")
    }

    const sepOrders = await prisma.order.aggregate({
        where: { date: { gte: sepStart, lte: sepEnd }, status: { not: 'Cancelled' } },
        _sum: { revenue: true, netPayout: true, platformFee: true }
    })
    console.log(`Revenue: ${sepOrders._sum.revenue}`)
    console.log(`Platform Fees: ${sepOrders._sum.platformFee}`)

    console.log("\n--- OCTOBER (Current Period) ---")
    const octExpenses = await prisma.expense.groupBy({
        by: ['category'],
        where: { date: { gte: octStart, lte: octEnd } },
        _sum: { amount: true }
    })
    console.log("Expenses by Category:")
    octExpenses.forEach(g => console.log(`  ${g.category}: ${g._sum.amount}`))

    const octOrders = await prisma.order.aggregate({
        where: { date: { gte: octStart, lte: octEnd }, status: { not: 'Cancelled' } },
        _sum: { revenue: true, netPayout: true, platformFee: true }
    })
    console.log(`Revenue: ${octOrders._sum.revenue}`)
    console.log(`Order Platform Fees: ${octOrders._sum.platformFee}`)

    // Calculate P&L Line Items
    const revenue = octOrders._sum.revenue || 0
    const materials = octExpenses.find(g => g.category === 'Materials')?._sum.amount || 0
    const ads = octExpenses.find(g => g.category === 'Ads')?._sum.amount || 0
    const operating = octExpenses.find(g => g.category === 'Operating')?._sum.amount || 0
    const platformExp = octExpenses.find(g => g.category === 'Platform')?._sum.amount || 0
    const orderFees = octOrders._sum.platformFee || 0

    const totalPlatformFees = orderFees + platformExp
    const grossProfit = revenue - materials
    const netProfit = grossProfit - (totalPlatformFees + ads + operating)

    console.log("\n--- CALCULATED P&L ---")
    console.log(`Revenue: ${revenue}`)
    console.log(`COGS (Materials): ${materials}`)
    console.log(`Gross Profit: ${grossProfit}`)
    console.log(`Platform Fees (Order + Exp): ${orderFees} + ${platformExp} = ${totalPlatformFees}`)
    console.log(`Ads: ${ads}`)
    console.log(`Operating: ${operating}`)
    console.log(`Net Profit: ${netProfit}`)
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
