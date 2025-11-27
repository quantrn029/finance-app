import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export const dynamic = 'force-dynamic'

// GET: Fetch orders with pagination and filtering
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')

        // Pagination params
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '50')
        const skip = (page - 1) * limit

        // Filter params
        const search = searchParams.get('search')
        const platform = searchParams.get('platform')
        const abnormal = searchParams.get('abnormal') === 'true'

        // Build where clause
        const where: any = {}

        // Date Filter
        if (startDate && endDate) {
            where.date = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            }
        }

        // Search Filter (ID or Product Name)
        if (search) {
            where.OR = [
                { id: { contains: search, mode: 'insensitive' } },
                {
                    items: {
                        some: {
                            productName: { contains: search, mode: 'insensitive' }
                        }
                    }
                }
            ]
        }

        // Platform Filter
        if (platform && platform !== 'all') {
            where.platform = platform
        }

        // Abnormal Filter (Revenue or NetPayout <= 0)
        if (abnormal) {
            where.OR = [
                ...(where.OR || []), // Preserve existing OR if any (from search) - wait, this might be tricky if search also uses OR.
                // Prisma doesn't support multiple top-level ORs easily without AND.
                // Let's restructure.
            ]
            // If we have search OR and abnormal OR, we need AND(OR, OR).
            // Let's use AND for top level combination.
        }

        // Refined Where Construction
        const andConditions: any[] = []

        if (startDate && endDate) {
            andConditions.push({
                date: {
                    gte: new Date(startDate),
                    lte: new Date(endDate)
                }
            })
        }

        if (search) {
            andConditions.push({
                OR: [
                    { id: { contains: search, mode: 'insensitive' } },
                    { items: { some: { productName: { contains: search, mode: 'insensitive' } } } }
                ]
            })
        }

        if (platform && platform !== 'all') {
            andConditions.push({ platform })
        }

        if (abnormal) {
            andConditions.push({
                OR: [
                    { revenue: { lte: 0 } },
                    { netPayout: { lte: 0 } }
                ]
            })
        }

        const finalWhere = andConditions.length > 0 ? { AND: andConditions } : {}

        // Execute queries (Count, Data, Aggregations, and Adjustments) in parallel
        const [total, orders, aggregations, adjustments] = await prisma.$transaction([
            prisma.order.count({ where: finalWhere }),
            prisma.order.findMany({
                where: finalWhere,
                orderBy: { date: 'desc' },
                skip,
                take: limit,
                include: {
                    items: {
                        include: {
                            product: true
                        }
                    }
                }
            }),
            prisma.order.aggregate({
                where: finalWhere,
                _sum: {
                    revenue: true,
                    netPayout: true,
                    platformFee: true
                }
            }),
            // Fetch adjustment expenses (Platform category, System generated)
            prisma.expense.aggregate({
                where: {
                    date: (startDate && endDate) ? {
                        gte: new Date(startDate),
                        lte: new Date(endDate)
                    } : undefined,
                    category: 'Platform',
                    // Include both System and Manual expenses for Platform category
                    // isSystem: true, // REMOVED to include manual adjustments
                    // If platform filter is active, we should try to filter adjustments too
                    // But adjustments store platform in 'subcategory'
                    subcategory: platform && platform !== 'all' ? (platform === 'shopee' ? 'Shopee' : platform === 'tiktok' ? 'TikTok Shop' : undefined) : undefined
                },
                _sum: {
                    amount: true
                }
            })
        ])

        const adjustmentTotal = (!abnormal) ? (adjustments._sum.amount || 0) : 0

        return NextResponse.json({
            orders,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            },
            summary: {
                totalRevenue: aggregations._sum.revenue || 0,
                totalNet: aggregations._sum.netPayout || 0,
                totalFees: (aggregations._sum.platformFee || 0) + adjustmentTotal
            }
        })

    } catch (error: any) {
        console.error("Fetch orders error:", error)
        return NextResponse.json({ error: error.message || "Failed to fetch orders" }, { status: 500 })
    }
}
