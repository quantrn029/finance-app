
import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET() {
    const startDate = new Date('2025-11-01')
    const endDate = new Date('2025-12-01')

    // 1. Sum Platform Fees from Orders
    const ordersAgg = await prisma.order.aggregate({
        where: {
            date: { gte: startDate, lt: endDate }
        },
        _sum: {
            platformFee: true
        }
    })
    const orderFees = ordersAgg._sum.platformFee || 0

    // 2. Sum Platform Expenses from Expense Table
    const expenses = await prisma.expense.findMany({
        where: {
            date: { gte: startDate, lt: endDate },
            category: 'Platform'
        }
    })

    const expenseTotal = expenses.reduce((sum, e) => sum + e.amount, 0)

    return NextResponse.json({
        orderFees,
        expenseTotal,
        expenses,
        totalExpected: orderFees + expenseTotal,
        discrepancy: expenseTotal
    })
}
