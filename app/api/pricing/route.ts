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
        // Calculate average fees by platform using the helper and fallback
        const shopeeRates = calculateRates(orders, 'Shopee') || FALLBACK_FEES.Shopee
        const tiktokRates = calculateRates(orders, 'TikTok') || FALLBACK_FEES.TikTok

        // Calculate total fee rate from the rates object
        const avgShopeeFee = (shopeeRates as ShopeeFees).serviceFeeRate +
            (shopeeRates as ShopeeFees).paymentFeeRate +
            (shopeeRates as ShopeeFees).taxRate +
            ((shopeeRates as ShopeeFees).fixedFee / 500000) // Estimate fixed fee % based on 500k AOV

        const avgTikTokFee = (tiktokRates as TikTokFees).commissionRate +
            (tiktokRates as TikTokFees).paymentFeeRate +
            (tiktokRates as TikTokFees).taxRate

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

        const shopeeRates = calculateRates(recentOrders, 'Shopee') || FALLBACK_FEES.Shopee
        const tiktokRates = calculateRates(recentOrders, 'TikTok') || FALLBACK_FEES.TikTok

        // Calculate scenarios for each platform
        const scenarios: any = {}
        const shipping = shippingPaidBy === 'seller' ? (parseFloat(estimatedShipping) || 15000) : 0

        for (const platform of platforms || ['Shopee', 'TikTok']) {
            let breakdownItems: any[] = []
            let totalFee = 0

            if (platform === 'Shopee') {
                const fees = shopeeRates as ShopeeFees
                const serviceFee = recommendedPrice * fees.serviceFeeRate
                const paymentFee = recommendedPrice * fees.paymentFeeRate
                const fixedFee = fees.fixedFee
                const taxFee = recommendedPrice * fees.taxRate

                breakdownItems = [
                    { name: 'Phí dịch vụ', rate: fees.serviceFeeRate, amount: serviceFee },
                    { name: 'Phí thanh toán', rate: fees.paymentFeeRate, amount: paymentFee },
                    { name: 'Phí cố định', rate: null, amount: fixedFee },
                    { name: 'Thuế', rate: fees.taxRate, amount: taxFee }
                ]
                totalFee = serviceFee + paymentFee + fixedFee + taxFee
            } else {
                const fees = tiktokRates as TikTokFees
                const commissionFee = recommendedPrice * fees.commissionRate
                const paymentFee = recommendedPrice * fees.paymentFeeRate
                const taxFee = recommendedPrice * fees.taxRate

                breakdownItems = [
                    { name: 'Commission', rate: fees.commissionRate, amount: commissionFee },
                    { name: 'Phí thanh toán', rate: fees.paymentFeeRate, amount: paymentFee },
                    { name: 'Thuế', rate: fees.taxRate, amount: taxFee }
                ]
                totalFee = commissionFee + paymentFee + taxFee
            }

            const netPayout = recommendedPrice - totalFee - shipping
            const netProfit = netPayout - productionCost
            const netMargin = (netProfit / recommendedPrice) * 100

            scenarios[platform.toLowerCase()] = {
                revenue: recommendedPrice,
                feeBreakdown: breakdownItems,
                totalFee,
                totalFeeRate: recommendedPrice > 0 ? (totalFee / recommendedPrice) * 100 : 0,
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

                if (platform === 'Shopee') {
                    const fees = shopeeRates as ShopeeFees
                    totalFee = (price * fees.serviceFeeRate) + (price * fees.paymentFeeRate) +
                        fees.fixedFee + (price * fees.taxRate)
                } else {
                    const fees = tiktokRates as TikTokFees
                    totalFee = (price * fees.commissionRate) + (price * fees.paymentFeeRate) +
                        (price * fees.taxRate)
                }

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

