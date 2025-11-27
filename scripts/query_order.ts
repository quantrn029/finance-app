
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const orderId = '580569283153921782'
    console.log(`Querying order: ${orderId}`)

    const order = await prisma.order.findUnique({
        where: { platformOrderId: orderId }
    })

    console.log(JSON.stringify(order, null, 2))
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
