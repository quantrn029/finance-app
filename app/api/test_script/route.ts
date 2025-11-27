
import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET() {
    const shopeeCount = await prisma.order.count({
        where: { platform: 'Shopee' }
    })
    console.log("DEBUG: Shopee Count:", shopeeCount)

    const shopeeSample = await prisma.order.findMany({
        where: { platform: 'Shopee' },
        take: 5,
        orderBy: { date: 'desc' }
    })
    console.log("DEBUG: Shopee Sample:", JSON.stringify(shopeeSample))

    return NextResponse.json({
        shopeeCount,
        shopeeSample
    })
}
