
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        await prisma.$executeRawUnsafe('DEALLOCATE ALL')
    } catch (e) {}

    // 1. Delete all December expenses
    // Assuming Dec 2025 based on previous context (November was 2025)
    // If the image implies 2024, I should probably check recent data to be sure of the year.
    // However, the November update was for 2025-11. So I will stick to 2025.
    // Wait, the user previously updated November 2025. 
    // Let me check the current date in the system to be sure? 
    // The system time says 2025-12-13. So it is indeed December 2025.

    const startDate = new Date('2025-12-01T00:00:00.000Z')
    const endDate = new Date('2025-12-31T23:59:59.999Z')

    console.log("Deleting existing December expenses...")
    const deleteResult = await prisma.expense.deleteMany({
        where: {
            date: {
                gte: startDate,
                lte: endDate
            }
        }
    })
    console.log(`Deleted ${deleteResult.count} expenses.`)

    // 2. Insert new expenses
    const expenses = [
        {
            amount: 18600400,
            category: "Materials",
            subcategory: "Charm mắt",
            date: new Date('2025-12-30')
        },
        {
            amount: 8800000,
            category: "Ads",
            subcategory: "Quảng cáo TikTok",
            date: new Date('2025-12-30')
        },
        {
            amount: 3974880,
            category: "Materials",
            subcategory: "Kim loại bạc",
            date: new Date('2025-12-30')
        },
        {
            amount: 1980000,
            category: "Materials",
            subcategory: "Vật liệu đóng gói",
            date: new Date('2025-12-30')
        },
        {
            amount: 35000,
            category: "Operating",
            subcategory: "Phí ship",
            date: new Date('2025-12-30')
        }
    ]

    console.log("Creating new expenses...")
    for (const expense of expenses) {
        await prisma.expense.create({
            data: {
                date: expense.date,
                amount: expense.amount,
                category: expense.category,
                subcategory: expense.subcategory,
                type: "Expense", // Legacy field
                description: `Imported from breakdown: ${expense.subcategory}`
            }
        })
        console.log(`Created: ${expense.subcategory} - ${expense.amount.toLocaleString()}`)
    }

    console.log("Done.")
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
