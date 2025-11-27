
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        await prisma.$executeRawUnsafe('DEALLOCATE ALL')
    } catch (e) { }

    console.log("Deleting stale System Expenses (Category: Platform)...")

    const result = await prisma.expense.deleteMany({
        where: {
            category: 'Platform',
            isSystem: true
        }
    })

    console.log(`Deleted ${result.count} records.`)
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
