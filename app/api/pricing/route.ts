import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export const dynamic = 'force-dynamic'

// Fallback Platform fee structure (industry averages)
const FALLBACK_FEES = {
    Shopee: {
        serviceFeeRate: 0.065,      // 6.5%
        paymentFeeRate: 0.02,        // 2%
        fixedFee: 1000,              // 1,000đ
        taxRate: 0.015,              // 1.5%
    },
    TikTok: {
        commissionRate: 0.07,        // 7%
        paymentFeeRate: 0.015,       // 1.5%
        taxRate: 0.015,              // 1.5%
    }
}

type PlatformFeeStructure = typeof FALLBACK_FEES.Shopee | typeof FALLBACK_FEES.TikTok

interface ShopeeFees {
    serviceFeeRate: number
    paymentFeeRate: number
    fixedFee: number
    taxRate: number
}

interface TikTokFees {
    commissionRate: number
    paymentFeeRate: number
    taxRate: number
}

// Helper to calculate average rates from orders
const calculateRates = (orders: any[], platform: 'Shopee' | 'TikTok') => {
    const platformOrders = orders.filter(o => o.platform === platform)
    if (platformOrders.length === 0) return null

    const totalRevenue = platformOrders.reduce((sum, o) => sum + o.revenue, 0)
    if (totalRevenue === 0) return null

    if (platform === 'Shopee') {
        const totalService = platformOrders.reduce((sum, o) => sum + (o.serviceFee || 0), 0)
        const totalPayment = platformOrders.reduce((sum, o) => sum + (o.paymentFee || 0), 0)
        const totalFixed = platformOrders.reduce((sum, o) => sum + (o.fixedFee || 0), 0)
        const totalTax = platformOrders.reduce((sum, o) => sum + (o.taxVAT || 0) + (o.taxPIT || 0), 0)

        const totalFees = totalService + totalPayment + totalFixed + totalTax
        if (totalFees === 0) return null

        return {
            serviceFeeRate: totalService / totalRevenue,
            paymentFeeRate: totalPayment / totalRevenue,
            fixedFee: totalFixed / platformOrders.length, // Average fixed amount per order
            taxRate: totalTax / totalRevenue
        }
    } else {
        const totalCommission = platformOrders.reduce((sum, o) => sum + (o.commissionFee || 0), 0)
        const totalPayment = platformOrders.reduce((sum, o) => sum + (o.transactionFee || 0), 0) // TikTok calls it transactionFee usually
        const totalTax = platformOrders.reduce((sum, o) => sum + (o.taxVAT || 0) + (o.taxPIT || 0), 0)

        const totalFees = totalCommission + totalPayment + totalTax
        if (totalFees === 0) return null

        return {
            commissionRate: totalCommission / totalRevenue,
            paymentFeeRate: totalPayment / totalRevenue,
            taxRate: totalTax / totalRevenue
        }
    }
}

// GET: Fetch market intelligence
export async function GET(req: NextRequest) {
    try {
        // Get average platform fees from last 30 days
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const orders = await prisma.order.findMany({
            where: {
                date: {
                    gte: thirtyDaysAgo
                }
            }
        })

        // Calculate average fees by platform
        const calculateEffectiveRate = (orders: any[], platform: string) => {
            const platformOrders = orders.filter(o => o.platform === platform && o.revenue > 0)
            if (platformOrders.length === 0) return null

            const totalRevenue = platformOrders.reduce((sum, o) => sum + o.revenue, 0)
            const totalFee = platformOrders.reduce((sum, o) => sum + o.platformFee, 0)

            return totalFee / totalRevenue
        }

        const avgShopeeFee = calculateEffectiveRate(orders, 'Shopee') || (FALLBACK_FEES.Shopee.serviceFeeRate + FALLBACK_FEES.Shopee.paymentFeeRate + FALLBACK_FEES.Shopee.taxRate + (FALLBACK_FEES.Shopee.fixedFee / 500000))
        const avgTikTokFee = calculateEffectiveRate(orders, 'TikTok') || (FALLBACK_FEES.TikTok.commissionRate + FALLBACK_FEES.TikTok.paymentFeeRate + FALLBACK_FEES.TikTok.taxRate)

        // Calculate average shipping (when seller pays)
        const ordersWithShipping = orders.filter(o => o.shippingFee > 0)
        const avgShipping = ordersWithShipping.length > 0
            ? ordersWithShipping.reduce((sum, o) => sum + o.shippingFee, 0) / ordersWithShipping.length
            : 15000 // Default 15k

        // Get top products by margin
        const productsWithOrders = await prisma.product.findMany({
            include: {
                orderItems: {
                    include: {
                        order: true
                    }
                }
            }
        })

        const topProducts = productsWithOrders
            .filter(p => p.orderItems.length > 0)
            .map(p => {
                const productionCost = p.materialCost + p.laborCost
                const avgRevenue = p.orderItems.reduce((sum: number, item: any) => sum + item.unitPrice, 0) / p.orderItems.length
                const avgPlatformFee = p.orderItems.reduce((sum: number, item: any) => sum + item.order.platformFee, 0) / p.orderItems.length
                const margin = ((avgRevenue - avgPlatformFee - productionCost) / avgRevenue) * 100

                return {
                    name: p.name,
                    margin: margin,
                    avgPrice: avgRevenue,
                    orderCount: p.orderItems.length
                }
            })
            .sort((a, b) => b.margin - a.margin)
            .slice(0, 5)

        return NextResponse.json({
            avgFees: {
                shopee: avgShopeeFee,
                tiktok: avgTikTokFee
            },
            avgShipping,
            topProducts,
            totalOrders: orders.length
        })
    } catch (error: any) {
        console.error("Pricing analysis error:", error)
        return NextResponse.json({ error: error.message || "Failed to analyze pricing" }, { status: 500 })
    }
}

// POST: Calculate pricing scenarios
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const {
            productId,
            materialCost,
            laborCost,
            targetMargin,
            platforms,
            shippingPaidBy,
            estimatedShipping
        } = body

        let productionCost = 0

        if (productId) {
            const product = await prisma.product.findUnique({
                where: { id: productId }
            })
            if (product) {
                productionCost = product.materialCost + product.laborCost
            }
        } else {
            productionCost = (parseFloat(materialCost) || 0) + (parseFloat(laborCost) || 0)
        }

        // Calculate recommended price based on target margin
        // Formula: Price = Cost / (1 - Margin%)
        const targetMarginDecimal = (parseFloat(targetMargin) || 40) / 100
        const basePrice = productionCost / (1 - targetMarginDecimal)

        // Round to nearest 1000
        const recommendedPrice = Math.ceil(basePrice / 1000) * 1000

        // Fetch recent orders to calculate dynamic rates
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        const recentOrders = await prisma.order.findMany({
            where: { date: { gte: thirtyDaysAgo } }
        })

        const calculateEffectiveRate = (orders: any[], platform: string) => {
            const platformOrders = orders.filter(o => o.platform === platform && o.revenue > 0)
            if (platformOrders.length === 0) return null

            const totalRevenue = platformOrders.reduce((sum, o) => sum + o.revenue, 0)
            const totalFee = platformOrders.reduce((sum, o) => sum + o.platformFee, 0)

            return totalFee / totalRevenue
        }

        const shopeeRate = calculateEffectiveRate(recentOrders, 'Shopee') || (FALLBACK_FEES.Shopee.serviceFeeRate + FALLBACK_FEES.Shopee.paymentFeeRate + FALLBACK_FEES.Shopee.taxRate + (FALLBACK_FEES.Shopee.fixedFee / 500000))
        const tiktokRate = calculateEffectiveRate(recentOrders, 'TikTok') || (FALLBACK_FEES.TikTok.commissionRate + FALLBACK_FEES.TikTok.paymentFeeRate + FALLBACK_FEES.TikTok.taxRate)

        // Calculate scenarios for each platform
        const scenarios: any = {}
        const shipping = shippingPaidBy === 'seller' ? (parseFloat(estimatedShipping) || 15000) : 0

        for (const platform of platforms || ['Shopee', 'TikTok']) {
            let breakdownItems: any[] = []
            let totalFee = 0
            const feeRate = platform === 'Shopee' ? shopeeRate : tiktokRate

            totalFee = recommendedPrice * feeRate
            breakdownItems = [
                { name: 'Phí sàn trung bình', rate: feeRate, amount: totalFee }
            ]

            const netPayout = recommendedPrice - totalFee - shipping
            const netProfit = netPayout - productionCost
            const netMargin = (netProfit / recommendedPrice) * 100

            scenarios[platform.toLowerCase()] = {
                revenue: recommendedPrice,
                feeBreakdown: breakdownItems,
                totalFee,
                totalFeeRate: feeRate * 100,
                shipping,
                netPayout,
                productionCost,
                netProfit,
                netMargin: recommendedPrice > 0 ? (netProfit / recommendedPrice) * 100 : 0
            }
        }

        // Generate price range scenarios
        const priceRange = [0.8, 0.9, 1.0, 1.1, 1.25].map(multiplier => {
            const price = Math.ceil((recommendedPrice * multiplier) / 1000) * 1000
            const rangeScenarios: any = {}

            for (const platform of platforms || ['Shopee', 'TikTok']) {
                let totalFee = 0

                const feeRate = platform === 'Shopee' ? shopeeRate : tiktokRate
                totalFee = price * feeRate

                const netPayout = price - totalFee - shipping
                const netProfit = netPayout - productionCost
                const netMargin = (netProfit / price) * 100

                rangeScenarios[platform.toLowerCase()] = {
                    netProfit,
                    netMargin
                }
            }

            return {
                price,
                scenarios: rangeScenarios
            }
        })

        return NextResponse.json({
            recommendedPrice,
            productionCost,
            targetMargin: parseFloat(targetMargin) || 40,
            scenarios,
            priceRange
        })
    } catch (error: any) {
        console.error("Pricing calculation error:", error)
        return NextResponse.json({ error: error.message || "Failed to calculate pricing" }, { status: 500 })
    }
}

