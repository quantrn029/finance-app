"use client"

import { useState } from "react"
import { Upload, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { parseCSV, parseExcel, mapShopeeData, mapTikTokData, mapFacebookInstagramData } from "@/lib/parsers"

export default function ImportPage() {
    const [platform, setPlatform] = useState<'shopee' | 'tiktok' | 'direct'>('shopee')
    const [file, setFile] = useState<File | null>(null)
    const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle")
    const [message, setMessage] = useState("")
    const [progress, setProgress] = useState(0)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
            setStatus("idle")
            setMessage("")
            setProgress(0)
        }
    }

    const handleUpload = async () => {
        if (!file) return

        setStatus("uploading")
        setMessage("Đang đọc file...")
        setProgress(0)

        try {
            // 1. Read File
            const buffer = await file.arrayBuffer()
            let orders: any[] = []
            let tiktokReportsFees: any = null

            // 2. Parse File (Client-Side)
            if (file.name.endsWith(".csv")) {
                const text = new TextDecoder("utf-8").decode(buffer)
                const rawData = await parseCSV(text)
                if (platform === "shopee") {
                    orders = mapShopeeData(rawData)
                } else if (platform === "direct") {
                    const headers = rawData[0]
                    const rows = rawData.slice(1).map(row => {
                        const obj: any = {}
                        headers.forEach((header: string, i: number) => {
                            obj[header] = row[i]
                        })
                        return obj
                    })
                    orders = mapFacebookInstagramData(rows)
                }
            } else {
                // Excel
                const result = parseExcel(buffer, platform)
                const rawData = result.rawData
                tiktokReportsFees = result.tiktokReportsFees

                if (platform === "shopee") {
                    orders = mapShopeeData(rawData)
                } else if (platform === "tiktok") {
                    orders = mapTikTokData(rawData)
                }
            }

            console.log(`Parsed ${orders.length} orders on client side`)

            if (orders.length === 0) {
                throw new Error("Không tìm thấy đơn hàng nào trong file")
            }

            // 3. Batch Upload
            const BATCH_SIZE = 500
            const totalBatches = Math.ceil(orders.length / BATCH_SIZE)
            let totalSaved = 0

            for (let i = 0; i < totalBatches; i++) {
                const batch = orders.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
                setMessage(`Đang tải lên batch ${i + 1}/${totalBatches}...`)

                // For the first batch, include tiktokReportsFees if available
                // Note: The API currently expects tiktokReportsFees to be handled via file upload logic or passed in JSON?
                // We modified API to accept JSON but we didn't explicitly add tiktokReportsFees to the JSON body schema in the API.
                // However, the API logic for JSON path doesn't seem to use tiktokReportsFees yet?
                // Wait, I fixed the API to declare `tiktokReportsFees` but I didn't add logic to read it from `req.json()`!
                // I need to update the API to read `tiktokReportsFees` from the body if present.
                // For now, let's send it and I'll fix the API in the next step if needed.
                // Actually, let's just send it in the body.

                const payload = {
                    platform,
                    fileName: file.name,
                    orders: batch,
                    tiktokReportsFees: (i === 0 && platform === 'tiktok') ? tiktokReportsFees : null
                }

                const res = await fetch("/api/import", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                })

                if (!res.ok) {
                    const errorData = await res.json()
                    throw new Error(errorData.error || `Upload failed at batch ${i + 1}`)
                }

                const data = await res.json()
                totalSaved += data.count || 0
                setProgress(Math.round(((i + 1) / totalBatches) * 100))
            }

            setStatus("success")
            setMessage(`Đã nhập thành công ${totalSaved} đơn hàng!`)

        } catch (error: any) {
            console.error("Import error:", error)
            setStatus("error")
            setMessage(error.message || "Lỗi khi xử lý file")
        }
    }

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="mb-8">
                <h2 className="text-3xl font-bold tracking-tight">Nhập dữ liệu</h2>
                <p className="text-muted-foreground text-gray-500">
                    Tải lên file đối soát từ sàn để hệ thống tự động tính toán.
                </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
                {/* Left Column: Instructions */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl border shadow-sm">
                        <h3 className="font-semibold mb-4 flex items-center">
                            <span className="bg-emerald-100 text-emerald-700 w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2">1</span>
                            Chọn nguồn đơn hàng
                        </h3>
                        <div className="grid grid-cols-3 gap-3">
                            <button
                                onClick={() => { setPlatform("shopee"); setFile(null); }}
                                className={cn(
                                    "p-4 rounded-lg border-2 transition-all text-center font-medium",
                                    platform === "shopee"
                                        ? "border-orange-500 bg-orange-50 text-orange-700"
                                        : "border-gray-200 hover:border-orange-200"
                                )}
                            >
                                🟠 Shopee
                            </button>
                            <button
                                onClick={() => { setPlatform("tiktok"); setFile(null); }}
                                className={cn(
                                    "p-4 rounded-lg border-2 transition-all text-center font-medium",
                                    platform === "tiktok"
                                        ? "border-black bg-gray-50 text-black"
                                        : "border-gray-200 hover:border-gray-400"
                                )}
                            >
                                ⚫ TikTok Shop
                            </button>
                            <button
                                onClick={() => { setPlatform("direct"); setFile(null); }}
                                className={cn(
                                    "p-4 rounded-lg border-2 transition-all text-center font-medium",
                                    platform === "direct"
                                        ? "border-green-600 bg-green-50 text-green-700"
                                        : "border-gray-200 hover:border-green-200"
                                )}
                            >
                                📝 Đơn trực tiếp
                            </button>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl border shadow-sm">
                        <h3 className="font-semibold mb-4 flex items-center">
                            <span className="bg-emerald-100 text-emerald-700 w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2">2</span>
                            Hướng dẫn xuất file
                        </h3>
                        <div className="text-sm text-gray-600 space-y-2">
                            {platform === "shopee" ? (
                                <>
                                    <p>1. Vào <strong>Kênh Người Bán</strong> &gt; <strong>Doanh thu</strong> &gt; <strong>Quyết toán</strong>.</p>
                                    <p>2. Chọn khoảng thời gian cần đối soát.</p>
                                    <p>3. Bấm <strong>Xuất báo cáo</strong>.</p>
                                </>
                            ) : platform === "tiktok" ? (
                                <>
                                    <p>1. Vào <strong>TikTok Shop Seller Center</strong>.</p>
                                    <p>2. Vào mục <strong>Tài chính</strong> &gt; <strong>Quyết toán</strong>.</p>
                                    <p>3. Chọn <strong>Xuất dữ liệu</strong> (Export).</p>
                                    <p className="text-emerald-600 mt-2 font-medium">Chỉ cần tải lên file Quyết toán (Excel).</p>
                                </>
                            ) : (
                                <>
                                    <p>1. Tải template CSV: <a href="/templates/fb_ig_orders_template.csv" className="text-blue-600 hover:underline" download>direct_orders_template.csv</a></p>
                                    <p>2. Điền thông tin đơn hàng vào template.</p>
                                    <p>3. Trong cột <strong>Platform</strong>, ghi "Facebook" hoặc "Instagram".</p>
                                    <p>4. Tải lên file đã điền.</p>
                                    <p className="text-amber-600 mt-2 font-medium">💡 Nhập thủ công đơn từ Facebook, Instagram, Zalo, hoặc các kênh trực tiếp khác.</p>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Upload Area */}
                <div className="bg-white p-8 rounded-xl border shadow-sm flex flex-col items-center justify-center min-h-[400px]">
                    <div className="w-full max-w-sm space-y-6">

                        {/* Main File Input */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">
                                {platform === "tiktok" ? "File Quyết toán (Excel)" : platform === "shopee" ? "File Báo cáo (CSV/Excel)" : "File Đơn hàng (CSV)"}
                            </label>
                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer relative">
                                <input
                                    type="file"
                                    accept={platform === "tiktok" ? ".xlsx, .xls" : ".csv, .xlsx, .xls"}
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <div className="flex flex-col items-center">
                                    <Upload className="h-8 w-8 text-gray-400 mb-2" />
                                    <p className="font-medium text-sm text-gray-700 truncate max-w-[200px]">
                                        {file ? file.name : (
                                            platform === "tiktok" ? "Chọn file Quyết toán" :
                                                platform === "shopee" ? "Chọn file Báo cáo" :
                                                    "Chọn file CSV đơn hàng"
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {status === "uploading" && (
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                            </div>
                        )}

                        {status === "error" && (
                            <div className="p-4 bg-red-50 text-red-600 rounded-lg flex items-center text-sm">
                                <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                                {message}
                            </div>
                        )}

                        {status === "success" && (
                            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-lg flex items-center text-sm">
                                <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                                {message}
                            </div>
                        )}

                        <button
                            onClick={handleUpload}
                            disabled={!file || status === "uploading"}
                            className="w-full py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {status === "uploading" ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    {message || "Đang xử lý..."}
                                </>
                            ) : (
                                "Tải lên và Phân tích"
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
