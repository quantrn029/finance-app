
import prisma from "@/lib/prisma"

async function main() {
    const products = await prisma.product.findMany()
    console.log(`Found ${products.length} products. Categorizing...`)

    let updatedCount = 0

    for (const product of products) {
        let category = null
        const name = product.name.toLowerCase()

        // Debug log for first product
        if (products.indexOf(product) === 0) {
            console.log(`Checking product: ${product.name}`)
            console.log(`Current category: ${product.category}`)
        }

        if (name.includes("vòng tay") || name.includes("lắc tay")) {
            category = "Vòng tay"
        } else if (name.includes("dây chuyền") || name.includes("vòng cổ") || name.includes("choker")) {
            category = "Dây chuyền"
        } else if (name.includes("nhẫn")) {
            category = "Nhẫn"
        } else if (name.includes("khuyên tai") || name.includes("bông tai")) {
            category = "Khuyên tai"
        } else if (name.includes("lắc chân")) {
            category = "Lắc chân"
        } else if (name.includes("combo")) {
            category = "Combo"
        }

        if (category && category !== product.category) {
            await prisma.product.update({
                where: { id: product.id },
                data: { category }
            })
            console.log(`Updated "${product.name}" -> ${category}`)
            updatedCount++
        }
    }

    console.log(`Done. Updated ${updatedCount} products.`)
}

main()
