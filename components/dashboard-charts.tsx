"use client"

import { RevenueChart } from "@/components/dashboard/RevenueChart"
import { PlatformPieChart } from "@/components/dashboard/PlatformPieChart"
import { Order } from "@prisma/client"

interface DashboardChartsProps {
    orders: Order[]
}

export function DashboardCharts({ orders }: DashboardChartsProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <div className="col-span-4">
                <RevenueChart orders={orders} />
            </div>
            <div className="col-span-3">
                <PlatformPieChart orders={orders} />
            </div>
        </div>
    )
}
