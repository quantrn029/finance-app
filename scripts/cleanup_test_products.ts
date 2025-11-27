
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        await prisma.$executeRawUnsafe('DEALLOCATE ALL')
    } catch (e) { }

    console.log("Cleaning up test products...")
    const result = await prisma.product.deleteMany({
        where: {
            name: {
                startsWith: "Test Product"
            }
        }
    })
    console.log(`Deleted ${result.count} test products.`)
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
