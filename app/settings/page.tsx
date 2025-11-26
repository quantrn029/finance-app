"use client"

import { Database, Monitor, RefreshCw, Clock } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export default function SettingsPage() {
    const router = useRouter()
    const [defaultPeriod, setDefaultPeriod] = useState("month")
    const [isRestarting, setIsRestarting] = useState(false)

    useEffect(() => {
        const saved = localStorage.getItem("defaultTimePeriod")
        if (saved) setDefaultPeriod(saved)
    }, [])

    const handlePeriodChange = (value: string) => {
        setDefaultPeriod(value)
        localStorage.setItem("defaultTimePeriod", value)
    }

    const handleRestart = async () => {
        if (!confirm("Bạn có chắc chắn muốn khởi động lại server?")) return

        setIsRestarting(true)
        try {
            await fetch("/api/system/restart", { method: "POST" })
            // Wait a bit then reload
            setTimeout(() => {
                window.location.reload()
            }, 2000)
        } catch (error) {
            console.error("Failed to restart", error)
            setIsRestarting(false)
        }
    }


    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-8 text-gray-900 dark:text-white">Cài đặt</h1>

            <div className="space-y-6">
                {/* Default Display Settings */}
                <section className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold mb-4 text-gray-900 flex items-center gap-2">
                        <Monitor className="w-5 h-5" />
                        Hiển thị mặc định
                    </h2>

                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-gray-900">Khoảng thời gian mặc định</p>
                            <p className="text-sm text-gray-500">Chọn dữ liệu hiển thị khi mở Dashboard/Chi phí</p>
                        </div>
                        <select
                            value={defaultPeriod}
                            onChange={(e) => handlePeriodChange(e.target.value)}
                            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                        >
                            <option value="today">Hôm nay</option>
                            <option value="month">Tháng này</option>
                            <option value="year">Năm nay</option>
                            <option value="all">Toàn bộ (All time)</option>
                        </select>
                    </div>
                </section>

                {/* System Settings */}
                <section className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold mb-4 text-gray-900 flex items-center gap-2">
                        <RefreshCw className="w-5 h-5" />
                        Hệ thống
                    </h2>

                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-gray-900">Khởi động lại Server</p>
                            <p className="text-sm text-gray-500">Sử dụng khi cập nhật code hoặc gặp lỗi</p>
                        </div>
                        <button
                            onClick={handleRestart}
                            disabled={isRestarting}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                        >
                            {isRestarting ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    Đang khởi động...
                                </>
                            ) : (
                                "Restart Server"
                            )}
                        </button>
                    </div>
                </section>


                {/* Data Settings */}
                <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                        <Database className="w-5 h-5" />
                        Dữ liệu
                    </h2>

                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-gray-900 dark:text-white">Sao lưu & Khôi phục</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Quản lý dữ liệu hệ thống</p>
                        </div>
                        <Link
                            href="/backup"
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                            Quản lý Backup
                        </Link>
                    </div>
                </section>

                {/* App Info */}
                <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Thông tin ứng dụng</h2>
                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                        <p>Phiên bản: <span className="font-medium text-gray-900 dark:text-white">1.0.0</span></p>
                        <p>Phát triển bởi: <span className="font-medium text-gray-900 dark:text-white">FinAdvisor Team</span></p>
                    </div>
                </section>
            </div>
        </div>
    )
}
