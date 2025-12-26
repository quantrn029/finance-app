
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
    log: ['error', 'warn']
})

async function main() {
    try {
        console.log("Attempting database connection...")
        await prisma.$connect()
        console.log("Connected successfully.")

        try {
            await prisma.$executeRawUnsafe('DEALLOCATE ALL')
        } catch (e) {
            console.warn("DEALLOCATE ALL failed (non-fatal)")
        }

        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        console.log("Analyzing orders since:", thirtyDaysAgo.toISOString())

        const orders = await prisma.order.findMany({
            where: {
                date: { gte: thirtyDaysAgo }
            }
        })

        console.log(`Found ${orders.length} orders.`)

        const platforms = ['Shopee', 'TikTok']
        let hasData = false

        for (const platform of platforms) {
            const platformOrders = orders.filter(o => o.platform === platform && o.revenue > 0)

            if (platformOrders.length === 0) {
                console.log(`[${platform}] No valid orders found.`)
                continue
            }
            hasData = true

            const totalRevenue = platformOrders.reduce((sum, o) => sum + o.revenue, 0)
            const totalFee = platformOrders.reduce((sum, o) => sum + o.platformFee, 0)
            const effectiveRate = totalRevenue > 0 ? (totalFee / totalRevenue) * 100 : 0

            console.log(`[${platform}]`)
            console.log(`- Orders: ${platformOrders.length}`)
            console.log(`- Total Revenue: ${totalRevenue.toLocaleString()}`)
            console.log(`- Total Platform Fee: ${totalFee.toLocaleString()}`)
            console.log(`- Effective Rate: ${effectiveRate.toFixed(2)}%`)
        }

        if (!hasData) {
            console.log("No data found for any platform in the last 30 days.")
        }
    } catch (e) {
        console.error("Script failed:", e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
