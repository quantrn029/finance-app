
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        await prisma.$executeRawUnsafe('DEALLOCATE ALL')
    } catch (e) { }

    console.log("Restoring Manual Expense for TikTok Platform Fee Adjustment...")

    const expense = await prisma.expense.create({
        data: {
            date: new Date('2025-10-27'),
            category: 'Platform',
            subcategory: 'TikTok Shop',
            amount: 24291025,
            note: 'Chi phí chênh lệch TikTok (Thuế, Phí khác chưa có trong đơn hàng)',
            type: 'Platform',
            isSystem: false,
            costType: 'Variable'
        }
    })

    console.log(`Restored expense: ${expense.id} - ${expense.amount}`)
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
