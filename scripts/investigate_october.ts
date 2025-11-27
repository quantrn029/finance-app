
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        await prisma.$executeRawUnsafe('DEALLOCATE ALL')
    } catch (e) { }

    const startDate = new Date('2025-10-01')
    const endDate = new Date('2025-10-31T23:59:59.999Z')

    console.log("--- EXPENSES ---")
    const expenses = await prisma.expense.findMany({
        where: {
            date: { gte: startDate, lte: endDate }
        }
    })

    let totalExp = 0
    expenses.forEach(e => {
        console.log(`[${e.isSystem ? 'SYS' : 'MAN'}] ${e.category} - ${e.subcategory}: ${e.amount}`)
        totalExp += e.amount
    })
    console.log(`Total Expenses: ${totalExp}`)

    console.log("\n--- ORDERS ---")
    const orders = await prisma.order.findMany({
        where: {
            date: { gte: startDate, lte: endDate },
            status: { not: 'Cancelled' }
        },
        select: { platformFee: true }
    })

    const totalOrderFee = orders.reduce((sum, o) => sum + o.platformFee, 0)
    console.log(`Total Order Platform Fee: ${totalOrderFee}`)
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
