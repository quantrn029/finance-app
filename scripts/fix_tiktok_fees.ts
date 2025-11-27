
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log("Starting TikTok Fee Fix...")
    try {
        await prisma.$executeRawUnsafe('DEALLOCATE ALL')
    } catch (e) {
        console.log("Could not deallocate, continuing...")
    }

    // Get all TikTok orders
    const orders = await prisma.order.findMany({
        where: {
            platform: { contains: 'TikTok' }
        }
    })

    console.log(`Found ${orders.length} TikTok orders. Checking for discrepancies...`)

    let updatedCount = 0

    for (const order of orders) {
        // Calculate true platform fee based on financials
        const truePlatformFee = order.revenue - order.netPayout

        // Check if discrepancy exists (allow small rounding error)
        if (Math.abs(truePlatformFee - order.platformFee) > 100) {

            // Calculate missing fee
            let otherFees = order.otherFees || 0
            if (truePlatformFee > order.platformFee) {
                otherFees += (truePlatformFee - order.platformFee)
            } else {
                // If true fee is LESS than stored fee, it's weird but we should trust financials
                // Maybe we double counted something?
                // For now, let's just sync platformFee to truePlatformFee
            }

            console.log(`Fixing Order ${order.platformOrderId}:`)
            console.log(`  Rev: ${order.revenue}, Net: ${order.netPayout}`)
            console.log(`  Current Fee: ${order.platformFee}, True Fee: ${truePlatformFee}`)
            console.log(`  Updating PlatformFee to ${truePlatformFee} and OtherFees to ${otherFees}`)

            await prisma.order.update({
                where: { id: order.id },
                data: {
                    platformFee: truePlatformFee,
                    otherFees: otherFees
                }
            })
            updatedCount++
        }
    }

    console.log(`Finished. Updated ${updatedCount} orders.`)
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
