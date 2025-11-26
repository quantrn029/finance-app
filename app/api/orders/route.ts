import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export const dynamic = 'force-dynamic'

// GET: Fetch all orders
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')

        const where: any = {}
        if (startDate && endDate) {
            where.date = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            }
        }

        const orders = await prisma.order.findMany({
            where,
            orderBy: { date: 'desc' },
            include: {
                items: {
                    include: {
                        product: true
                    }
                }
            }
        })

        return NextResponse.json({ orders })
    } catch (error: any) {
        console.error("Fetch orders error:", error)
        return NextResponse.json({ error: error.message || "Failed to fetch orders" }, { status: 500 })
    }
}
