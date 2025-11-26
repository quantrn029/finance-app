"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
    LayoutDashboard,
    ShoppingCart,
    Receipt,
    Package,
    Settings,
    TrendingUp,
    Upload,
    Target,
    Calculator,
    BarChart3,
    Database,
    PieChart
} from "lucide-react"


const routes = [
    {
        label: "Dashboard",
        icon: LayoutDashboard,
        href: "/",
        color: "text-sky-500",
    },
    {
        label: "Tài chính",
        icon: PieChart,
        href: "/finance",
        color: "text-indigo-500",
    },
    {
        label: "Đơn hàng",
        icon: ShoppingCart,
        href: "/orders",
        color: "text-blue-600",
    },
    {
        label: "Chi phí",
        icon: Receipt,
        href: "/expenses",
        color: "text-pink-700",
    },
    {
        label: "Nhập dữ liệu",
        icon: Upload,
        href: "/import",
        color: "text-green-500",
    },
    {
        label: "Mục tiêu",
        icon: Target,
        href: "/goals",
        color: "text-blue-500",
    },
    {
        label: "Sản phẩm & Giá vốn",
        icon: Package,
        href: "/products",
        color: "text-orange-700",
    },
    {
        label: "Tính giá bán",
        icon: Calculator,
        href: "/pricing",
        color: "text-green-600",
    },
    {
        label: "Backup & Restore",
        icon: Database,
        href: "/backup",
        color: "text-gray-500",
    },
    {
        label: "Cài đặt",
        icon: Settings,
        href: "/settings",
    },
]

export function Sidebar() {
    const pathname = usePathname()

    return (
        <div className="space-y-4 py-4 flex flex-col h-full bg-[#111827] dark:bg-gray-950 text-white">
            <div className="px-3 py-2 flex-1">
                <div className="flex items-center justify-between pl-3 mb-14">
                    <Link href="/" className="flex items-center">
                        <h1 className="text-2xl font-bold">
                            Fin<span className="text-emerald-500">Advisor</span>
                        </h1>
                    </Link>

                </div>
                <div className="space-y-1">
                    {routes.map((route) => (
                        <Link
                            key={route.href}
                            href={route.href}
                            className={cn(
                                "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition",
                                pathname === route.href ? "text-white bg-white/10" : "text-zinc-400"
                            )}
                        >
                            <div className="flex items-center flex-1">
                                <route.icon className={cn("h-5 w-5 mr-3", route.color)} />
                                {route.label}
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    )
}
