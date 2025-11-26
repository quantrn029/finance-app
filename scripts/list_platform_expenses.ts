
import prisma from "@/lib/prisma"

async function main() {
    const start = new Date("2025-11-01")
    const end = new Date("2025-11-30")
    end.setHours(23, 59, 59, 999)

    console.log(`Checking Platform expenses from ${start.toISOString()} to ${end.toISOString()}`)

    const expenses = await prisma.expense.findMany({
        where: {
            date: {
                gte: start,
                lte: end
            },
            category: 'Platform'
        },
        orderBy: {
            date: 'desc'
        }
    })

    console.log("Total Platform Expenses Found:", expenses.length)

    let totalAmount = 0
    console.table(expenses.map(e => {
        totalAmount += e.amount
        return {
            date: e.date.toISOString().split('T')[0],
            amount: e.amount,
            note: e.note,
            desc: e.description?.substring(0, 50)
        }
    }))

    console.log("Total Platform Expense Amount (Finance Page):", totalAmount)
}

main()
