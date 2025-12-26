
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        await prisma.$executeRawUnsafe('DEALLOCATE ALL')
    } catch (e) { }

    // 1. Delete all November expenses
    const startDate = new Date('2025-11-01T00:00:00.000Z')
    const endDate = new Date('2025-11-30T23:59:59.999Z')

    console.log("Deleting existing November expenses...")
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
            amount: 25342899,
            category: "Operating",
            subcategory: "Lương nhân viên",
            date: new Date('2025-11-30')
        },
        {
            amount: 22000000,
            category: "Ads",
            subcategory: "Quảng cáo TikTok",
            date: new Date('2025-11-30')
        },
        {
            amount: 11081000,
            category: "Materials",
            subcategory: "Vật liệu đóng gói",
            date: new Date('2025-11-30')
        },
        {
            amount: 11067274,
            category: "Materials",
            subcategory: "Kim loại bạc",
            date: new Date('2025-11-30')
        },
        {
            amount: 4268000,
            category: "Materials",
            subcategory: "Charm mắt",
            date: new Date('2025-11-30')
        },
        {
            amount: 1414923,
            category: "Operating",
            subcategory: "Phí ship",
            date: new Date('2025-11-30')
        },
        {
            amount: 1320752,
            category: "Materials",
            subcategory: "Dây các loại",
            date: new Date('2025-11-30')
        },
        {
            amount: 1131020,
            category: "Materials",
            subcategory: "Kim loại vàng",
            date: new Date('2025-11-30')
        },
        {
            amount: 7000,
            category: "Operating",
            subcategory: "Phát sinh khác",
            date: new Date('2025-11-30')
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
