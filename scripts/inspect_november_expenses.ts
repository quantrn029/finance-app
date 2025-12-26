
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        await prisma.$executeRawUnsafe('DEALLOCATE ALL')
    } catch (e) { }

    const startDate = new Date('2025-11-01T00:00:00.000Z')
    const endDate = new Date('2025-11-30T23:59:59.999Z')

    const expenses = await prisma.expense.findMany({
        where: {
            date: {
                gte: startDate,
                lte: endDate
            }
        },
        orderBy: {
            amount: 'desc'
        }
    })

    console.log("Current November Expenses:")
    expenses.forEach(e => {
        console.log(`- ${e.date.toISOString().split('T')[0]} | ${e.category} | ${e.subcategory || 'No Sub'} | ${e.amount.toLocaleString()} | System: ${e.isSystem}`)
    })

    const total = expenses.reduce((sum, e) => sum + e.amount, 0)
    console.log(`\nTotal: ${total.toLocaleString()}`)
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
