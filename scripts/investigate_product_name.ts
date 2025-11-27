
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const products = await prisma.product.findMany({
        where: {
            name: {
                contains: "Evil eye"
            }
        },
        select: { id: true, name: true }
    })

    console.log("Found products:", products)
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
