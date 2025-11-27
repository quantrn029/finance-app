import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export const dynamic = 'force-dynamic'

// GET: Fetch all products with SKU mappings
export async function GET(req: NextRequest) {
    try {
        const products = await prisma.product.findMany({
            include: {
                skus: true, // Include all SKU mappings
                _count: {
                    select: {
                        orderItems: true // Count linked order items
                    }
                }
            },
            orderBy: { name: 'asc' }
        })

        return NextResponse.json({ products })
    } catch (error: any) {
        console.error("Fetch products error:", error)
        return NextResponse.json({ error: error.message || "Failed to fetch products" }, { status: 500 })
    }
}

// POST: Create or update product
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { id, name, sku, category, sellingPrice, materialCost, laborCost, description, tags, skus, costBreakdown } = body

        if (!name) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        let product

        if (id) {
            // Update existing product
            product = await prisma.product.update({
                where: { id },
                data: {
                    name,
                    sku: sku || null,
                    category: category || null,
                    sellingPrice: parseFloat(sellingPrice) || 0,
                    materialCost: parseFloat(materialCost),
                    laborCost: parseFloat(laborCost),
                    description,
                    tags, // Save tags
                    costBreakdown: costBreakdown ? JSON.stringify(costBreakdown) : null,
                    skus: {
                        deleteMany: {},
                        create: skus.map((s: any) => ({
                            platform: s.platform,
                            sku: s.sku,
                            platformProductName: s.platformProductName
                        }))
                    }
                },
                include: {
                    skus: true
                }
            })
        } else {
            // Create new product
            product = await prisma.product.create({
                data: {
                    name,
                    sku: sku || null,
                    category: category || null,
                    sellingPrice: parseFloat(sellingPrice) || 0,
                    materialCost: parseFloat(materialCost) || 0,
                    laborCost: parseFloat(laborCost) || 0,
                    description: description || null,
                    tags, // Save tags
                    costBreakdown: costBreakdown ? JSON.stringify(costBreakdown) : null,
                    skus: {
                        create: skus && skus.length > 0 ? skus.map((sku: any) => ({
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
        }

        // Fetch updated product with SKUs
        const updatedProduct = await prisma.product.findUnique({
            where: { id: product.id },
            include: { skus: true }
        })

        return NextResponse.json({ success: true, product: updatedProduct })
    } catch (error: any) {
        console.error("Create/update product error:", error)

        // Handle Unique Constraint Violation
        if (error.code === 'P2002') {
            if (error.meta?.target?.includes('name')) {
                return NextResponse.json({ error: "Tên sản phẩm đã tồn tại. Vui lòng chọn tên khác." }, { status: 409 })
            }
            if (error.meta?.target?.includes('sku')) {
                return NextResponse.json({ error: "Mã SKU đã tồn tại. Vui lòng chọn mã khác." }, { status: 409 })
            }
        }

        return NextResponse.json({ error: error.message || "Failed to save product" }, { status: 500 })
    }
}

// DELETE: Remove product
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: "Missing product ID" }, { status: 400 })
        }

        await prisma.product.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error("Delete product error:", error)
        return NextResponse.json({ error: error.message || "Failed to delete product" }, { status: 500 })
    }
}
