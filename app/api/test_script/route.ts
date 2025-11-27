import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('id')

    if (!orderId) return NextResponse.json({ error: 'Missing id' })

    const order = await prisma.order.findUnique({
        where: { platformOrderId: orderId }
    })

    return NextResponse.json(order)
}
