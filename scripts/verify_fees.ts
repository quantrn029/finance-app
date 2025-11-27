
import { PrismaClient } from '@prisma/client'
import { startOfMonth, endOfMonth } from 'date-fns'

const prisma = new PrismaClient()

async function main() {
    try {
        await prisma.$executeRawUnsafe('DEALLOCATE ALL')
    } catch (e) {
        console.log("Could not deallocate, continuing...")
    }
    const startDate = new Date('2025-10-01')
    const endDate = endOfMonth(startDate)

    console.log(`Analyzing Data for October 2025 (${startDate.toISOString()} - ${endDate.toISOString()})`)

    // 1. Aggregated Order Fees
    const orders = await prisma.order.findMany({
        where: {
            date: { gte: startDate, lte: endDate },
            status: { not: 'Cancelled' }
        },
        select: { platform: true, platformFee: true }
    })

    const orderFeesByPlatform = new Map<string, number>()
    let totalOrderFees = 0
    orders.forEach(o => {
        const current = orderFeesByPlatform.get(o.platform) || 0
        orderFeesByPlatform.set(o.platform, current + o.platformFee)
        totalOrderFees += o.platformFee
    })

    console.log("\n--- Calculated from Orders (System) ---")
    orderFeesByPlatform.forEach((val, key) => {
        console.log(`${key}: ${new Intl.NumberFormat('vi-VN').format(val)} đ`)
    })
    console.log(`TOTAL: ${new Intl.NumberFormat('vi-VN').format(totalOrderFees)} đ`)

    // 2. Manual Expenses with Category 'Platform'
    const manualExpenses = await prisma.expense.findMany({
        where: {
            date: { gte: startDate, lte: endDate },
            category: 'Platform',
            isSystem: false
        }
    })

    console.log("\n--- Manual Expenses (Category: Platform, isSystem: false) ---")
    let totalManual = 0
    manualExpenses.forEach(e => {
        console.log(`${e.date.toISOString().split('T')[0]} - ${e.subcategory || e.description}: ${new Intl.NumberFormat('vi-VN').format(e.amount)} đ (Note: ${e.note})`)
        totalManual += e.amount
    })
    console.log(`TOTAL: ${new Intl.NumberFormat('vi-VN').format(totalManual)} đ`)

    // 3. System Expenses (Category: Platform, isSystem: true)
    const systemExpenses = await prisma.expense.findMany({
        where: {
            date: { gte: startDate, lte: endDate },
            category: 'Platform',
            isSystem: true
        }
    })

    console.log("\n--- System Expenses (Category: Platform, isSystem: true) ---")
    let totalSystemExp = 0
    systemExpenses.forEach(e => {
        console.log(`${e.date.toISOString().split('T')[0]} - ${e.subcategory || e.description}: ${new Intl.NumberFormat('vi-VN').format(e.amount)}`)
        totalSystemExp += e.amount
    })
    console.log(`TOTAL: ${new Intl.NumberFormat('vi-VN').format(totalSystemExp)} đ`)

    // 4. Shipping Fees
    const shippingFees = await prisma.order.aggregate({
        where: {
            date: { gte: startDate, lte: endDate },
            status: { not: 'Cancelled' }
        },
        _sum: { shippingFee: true }
    })
    console.log(`\n--- Total Shipping Fees: ${new Intl.NumberFormat('vi-VN').format(shippingFees._sum.shippingFee || 0)} đ`)

    // 5. Comparison
    console.log("\n--- Comparison ---")
    console.log(`Orders Page (Target: 108.238.119)`)
    console.log(`  Order.platformFee (${new Intl.NumberFormat('vi-VN').format(totalOrderFees)}) + SystemExp (${new Intl.NumberFormat('vi-VN').format(totalSystemExp)}) = ${new Intl.NumberFormat('vi-VN').format(totalOrderFees + totalSystemExp)}`)

    console.log(`Expenses Page (Target: 111.044.163)`)
    console.log(`  Order.platformFee (${new Intl.NumberFormat('vi-VN').format(totalOrderFees)}) + ManualExp (${new Intl.NumberFormat('vi-VN').format(totalManual)}) + SystemExp (${new Intl.NumberFormat('vi-VN').format(totalSystemExp)}) = ${new Intl.NumberFormat('vi-VN').format(totalOrderFees + totalManual + totalSystemExp)}`)

}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
