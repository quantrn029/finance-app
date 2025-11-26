import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log("Starting cleanup of duplicate TikTok expenses...")

    // Find all system expenses for TikTok Shop
    const expenses = await prisma.expense.findMany({
        where: {
            category: 'Platform',
            subcategory: 'TikTok Shop',
            isSystem: true
        },
        orderBy: {
            createdAt: 'asc' // Keep the oldest one
        }
    })

    console.log(`Found ${expenses.length} TikTok system expenses.`)

    // Group by date and amount to find duplicates
    const groups: Record<string, typeof expenses> = {}

    for (const exp of expenses) {
        const key = `${exp.date.toISOString()}_${exp.amount}`
        if (!groups[key]) {
            groups[key] = []
        }
        groups[key].push(exp)
    }

    let deletedCount = 0

    for (const key in groups) {
        const group = groups[key]
        if (group.length > 1) {
            console.log(`Found ${group.length} duplicates for key ${key}`)
            // Keep the first one (oldest), delete the rest
            const toDelete = group.slice(1)
            for (const item of toDelete) {
                await prisma.expense.delete({
                    where: { id: item.id }
                })
                deletedCount++
                console.log(`Deleted duplicate expense ID: ${item.id}`)
            }
        }
    }

    console.log(`Cleanup complete. Deleted ${deletedCount} duplicate expenses.`)
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
