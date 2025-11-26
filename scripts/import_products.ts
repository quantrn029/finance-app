
import prisma from "@/lib/prisma"
import * as XLSX from "xlsx"
import fs from "fs"
import path from "path"

async function main() {
    // const filePath = path.join(process.cwd(), "sanpham_giavon.xlsx")
    const filePath = "/Users/quantran/Downloads/data/sanpham_giavon.xlsx"

    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`)
        console.log("Files in current directory:")
        fs.readdirSync(process.cwd()).forEach(file => console.log(` - ${file}`))
        return
    }

    console.log(`Reading file: ${filePath}`)
    const workbook = XLSX.readFile(filePath)
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(sheet) as any[]

    console.log(`Found ${data.length} rows.`)
    console.log("Sample row:", data[0])

    let updated = 0
    let created = 0
    let errors = 0

    for (const row of data) {
        try {
            // Normalize keys (handle potential case/spacing issues)
            const getVal = (keys: string[]) => {
                for (const k of keys) {
                    if (row[k] !== undefined) return row[k]
                }
                // Try case-insensitive search
                const rowKeys = Object.keys(row)
                for (const k of keys) {
                    const found = rowKeys.find(rk => rk.toLowerCase().trim() === k.toLowerCase().trim())
                    if (found) return row[found]
                }
                return undefined
            }

            const name = getVal(["Tên sản phẩm", "Product Name", "Name"])
            const sku = getVal(["Mã SKU", "SKU", "Mã sản phẩm"])
            const sellingPrice = getVal(["Giá bán", "Selling Price", "Price"])
            const costPrice = getVal(["Giá vốn", "Cost Price", "Cost", "Vốn"])

            if (updated + created < 3) {
                console.log("DEBUG ROW:", JSON.stringify(row))
                console.log("DEBUG KEYS:", Object.keys(row))
                console.log(`DEBUG EXTRACTED: Name=${name}, SKU=${sku}, Price=${sellingPrice}, Cost=${costPrice}`)
            }

            if (!name) {
                console.warn("Skipping row without name:", row)
                continue
            }

            const cleanName = String(name).trim()
            const cleanSku = sku ? String(sku).trim() : undefined
            const cleanSellingPrice = sellingPrice ? parseFloat(String(sellingPrice).replace(/,/g, '')) : 0
            const cleanCostPrice = costPrice ? parseFloat(String(costPrice).replace(/,/g, '')) : 0

            // Try to find existing product
            let existingProduct = null

            if (cleanSku) {
                existingProduct = await prisma.product.findUnique({ where: { sku: cleanSku } })
            }

            if (!existingProduct) {
                existingProduct = await prisma.product.findUnique({ where: { name: cleanName } })
            }

            if (existingProduct) {
                await prisma.product.update({
                    where: { id: existingProduct.id },
                    data: {
                        sku: cleanSku || existingProduct.sku, // Update SKU if provided
                        sellingPrice: cleanSellingPrice || existingProduct.sellingPrice,
                        materialCost: cleanCostPrice || existingProduct.materialCost,
                        // Keep laborCost as is, or 0 if not set? Let's assume Cost Price covers everything for now, mapped to materialCost
                    }
                })
                updated++
                // console.log(`Updated: ${cleanName}`)
            } else {
                await prisma.product.create({
                    data: {
                        name: cleanName,
                        sku: cleanSku,
                        sellingPrice: cleanSellingPrice,
                        materialCost: cleanCostPrice,
                        laborCost: 0
                    }
                })
                created++
                console.log(`Created: ${cleanName}`)
            }

        } catch (error) {
            console.error("Error processing row:", row, error)
            errors++
        }
    }

    console.log("Import completed.")
    console.log(`Created: ${created}`)
    console.log(`Updated: ${updated}`)
    console.log(`Errors: ${errors}`)
}

main()
