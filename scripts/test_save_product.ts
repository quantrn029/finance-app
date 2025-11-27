
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const body: any = {
        name: "Test Product " + Date.now(),
        materialCost: 100000,
        laborCost: 20000,
        costBreakdown: {
            materials: [{ id: '1', name: 'Test Material', cost: 100000 }],
            labor: { hourlyWage: 25000, minutes: 48 }
        }
    }

    console.log("Simulating POST /api/products with body:", body)

    try {
        const { name, sku, category, sellingPrice, materialCost, laborCost, description, tags, skus, costBreakdown } = body

        const product = await prisma.product.create({
            data: {
                name,
                sku: sku || null,
                category: category || null,
                sellingPrice: parseFloat(sellingPrice as any) || 0,
                materialCost: parseFloat(materialCost as any) || 0,
                laborCost: parseFloat(laborCost as any) || 0,
                description: description || null,
                tags: tags,
                costBreakdown: costBreakdown ? JSON.stringify(costBreakdown) : null,
                skus: {
                    create: skus && (skus as any).length > 0 ? (skus as any).map((sku: any) => ({
                        platform: sku.platform,
                        sku: sku.sku,
                        platformProductName: sku.platformProductName || sku.sku
                    })) : []
                }
            },
            include: {
                skus: true
            }
        })

        console.log("Product created successfully:", product.id)
    } catch (error) {
        console.error("Error creating product:", error)
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
