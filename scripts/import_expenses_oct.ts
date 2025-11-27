
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log("Importing Expenses for October 2025...")
    try {
        await prisma.$executeRawUnsafe('DEALLOCATE ALL')
    } catch (e) {
        console.log("Could not deallocate, continuing...")
    }

    const expenses = [
        { name: "Charm mắt", amount: 69463706, category: "Materials" },
        { name: "Quảng cáo TikTok", amount: 19250000, category: "Ads" },
        { name: "Kim loại bạc", amount: 12888879, category: "Materials" },
        { name: "Vật liệu đóng gói", amount: 9835704, category: "Materials" },
        { name: "Phí ship", amount: 6635804, category: "Operating" },
        { name: "Phát sinh khác", amount: 3719952, category: "Operating" },
        { name: "Cườm/ Hạt", amount: 2826011, category: "Materials" },
        { name: "Dây các loại", amount: 1099100, category: "Materials" },
        { name: "N/A", amount: 193120, category: "Operating" },
        { name: "Lương nhân viên", amount: 26460267, category: "Operating" }
    ]

    const date = new Date("2025-10-01") // October 2025

    for (const exp of expenses) {
        await prisma.expense.create({
            data: {
                date: date,
                type: "Expense", // Required legacy field
                category: exp.category,
                subcategory: exp.name,
                amount: exp.amount,
                description: `Imported from chart: ${exp.name}`,
                costType: exp.category === "Operating" ? "Fixed" : "Variable"
            }
        })
        console.log(`Added: ${exp.name} (${exp.category}) - ${exp.amount}`)
    }

    console.log("Finished importing expenses.")
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
