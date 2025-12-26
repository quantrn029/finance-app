
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        await prisma.$executeRawUnsafe('DEALLOCATE ALL')
    } catch (e) {}

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const orders = await prisma.order.findMany({
        where: {
            date: { gte: thirtyDaysAgo },
            platform: { in: ['Shopee', 'TikTok'] }
        },
        take: 20
    })

    console.log("Analyzing recent orders for fee structure:")
    orders.forEach(o => {
        let componentsSum = 0
        if (o.platform === 'Shopee') {
            componentsSum = o.serviceFee + o.paymentFee + o.fixedFee + o.taxVAT + o.taxPIT
        } else {
            componentsSum = o.transactionFee + o.commissionFee + o.orderProcessingFee + o.taxVAT + o.taxPIT // Added all fields potentially used
        }
        
        console.log(`[${o.platform}] Revenue: ${o.revenue}, PlatformFee: ${o.platformFee}, ComponentsSum: ${componentsSum}, Diff: ${o.platformFee - componentsSum}`)
    })
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
