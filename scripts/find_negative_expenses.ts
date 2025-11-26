
import prisma from "@/lib/prisma"

async function main() {
    console.log("Searching for negative expenses...")
    const expenses = await prisma.expense.findMany({
        where: {
            amount: {
                lt: 0
            }
        }
    })

    console.log(`Found ${expenses.length} negative expenses.`)
    expenses.forEach(e => {
        console.log(`${e.date.toISOString().split('T')[0]} | ${e.category} | ${e.amount} | ${e.note}`)
    })

    // Also check Platform expenses specifically
    console.log("\nChecking Platform expenses sum...")
    const start = new Date("2025-11-01")
    const end = new Date("2025-11-30")
    end.setHours(23, 59, 59, 999)

    const platformExpenses = await prisma.expense.findMany({
        where: {
            date: { gte: start, lte: end },
            category: 'Platform'
        }
    })

    const total = platformExpenses.reduce((sum, e) => sum + e.amount, 0)
    console.log(`Total Platform Expenses in Nov: ${total}`)
    console.log(`Count: ${platformExpenses.length}`)
}

main()
