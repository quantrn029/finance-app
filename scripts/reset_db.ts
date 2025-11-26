import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Start clearing database...')

    const deletedExpenses = await prisma.expense.deleteMany({})
    console.log(`Deleted ${deletedExpenses.count} expenses.`)

    const deletedOrders = await prisma.order.deleteMany({})
    console.log(`Deleted ${deletedOrders.count} orders.`)

    console.log('Database cleared successfully.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
