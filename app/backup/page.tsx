"use client"

import { useState } from "react"
import { Download, Upload, Database, AlertTriangle } from "lucide-react"

export default function BackupPage() {
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    const handleExport = async () => {
        setLoading(true)
        setMessage(null)

        try {
            const response = await fetch('/api/backup')
            if (!response.ok) throw new Error('Export failed')

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `finadvisor-backup-${new Date().toISOString().slice(0, 10)}.json`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            window.URL.revokeObjectURL(url)

            setMessage({ type: 'success', text: '✅ Đã xuất backup thành công!' })
        } catch (error) {
            setMessage({ type: 'error', text: '❌ Lỗi khi xuất backup' })
        } finally {
            setLoading(false)
        }
    }

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!confirm('⚠️ CẢNH BÁO: Import sẽ XÓA toàn bộ dữ liệu hiện tại và thay thế bằng backup!\n\nBạn có chắc chắn muốn tiếp tục?')) {
            e.target.value = '' // Reset input
            return
        }

        setLoading(true)
        setMessage(null)

        try {
            const text = await file.text()
            const backup = JSON.parse(text)

            const response = await fetch('/api/backup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(backup)
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Import failed')
            }

            const result = await response.json()
            setMessage({
                type: 'success',
                text: `✅ Đã khôi phục thành công!\n${JSON.stringify(result.stats, null, 2)}`
            })

            // Reload page after 2 seconds
            setTimeout(() => window.location.reload(), 2000)
        } catch (error: any) {
            setMessage({ type: 'error', text: `❌ Lỗi: ${error.message}` })
        } finally {
            setLoading(false)
            e.target.value = '' // Reset input
        }
    }

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <Database className="h-8 w-8" />
                    Backup & Restore
                </h2>
                <p className="text-muted-foreground text-gray-500 mt-1">
                    Sao lưu và khôi phục dữ liệu của bạn một cách an toàn.
                </p>
            </div>

            {/* Warning Banner */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                    <p className="font-semibold mb-1">Quan trọng:</p>
                    <ul className="list-disc list-inside space-y-1">
                        <li>Backup database định kỳ (khuyến nghị hàng tuần)</li>
                        <li>Backup tự động chạy trước mỗi migration</li>
                        <li>Import sẽ XÓA toàn bộ dữ liệu hiện tại</li>
                        <li>Lưu file backup ở nơi an toàn (Google Drive, Dropbox...)</li>
                    </ul>
                </div>
            </div>

            {/* Message */}
            {message && (
                <div className={`p-4 rounded-xl border ${message.type === 'success'
                        ? 'bg-green-50 border-green-200 text-green-800'
                        : 'bg-red-50 border-red-200 text-red-800'
                    }`}>
                    <pre className="whitespace-pre-wrap font-sans">{message.text}</pre>
                </div>
            )}

            {/* Actions */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Export */}
                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <Download className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold mb-2">Xuất Backup</h3>
                            <p className="text-sm text-gray-600 mb-4">
                                Tải xuống toàn bộ dữ liệu dưới dạng file JSON. Bạn có thể lưu trữ file này ở bất kỳ đâu.
                            </p>
                            <button
                                onClick={handleExport}
                                disabled={loading}
                                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <Download className="h-4 w-4" />
                                {loading ? 'Đang xuất...' : 'Xuất Backup'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Import */}
                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-red-100 rounded-lg">
                            <Upload className="h-6 w-6 text-red-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold mb-2">Nhập Backup</h3>
                            <p className="text-sm text-gray-600 mb-4">
                                Khôi phục dữ liệu từ file backup. <span className="font-bold text-red-600">Cảnh báo:</span> Toàn bộ dữ liệu hiện tại sẽ bị xóa!
                            </p>
                            <label className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition cursor-pointer flex items-center justify-center gap-2">
                                <Upload className="h-4 w-4" />
                                {loading ? 'Đang nhập...' : 'Chọn file Backup'}
                                <input
                                    type="file"
                                    accept=".json"
                                    onChange={handleImport}
                                    disabled={loading}
                                    className="hidden"
                                />
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            {/* CLI Instructions */}
            <div className="bg-gray-50 rounded-xl p-6 border">
                <h3 className="text-lg font-semibold mb-3">📟 Backup từ Command Line</h3>
                <div className="space-y-3 text-sm">
                    <div>
                        <p className="text-gray-600 mb-1">Tạo backup database (SQLite):</p>
                        <code className="block bg-gray-800 text-gray-100 p-2 rounded font-mono">
                            npm run backup
                        </code>
                    </div>
                    <div>
                        <p className="text-gray-600 mb-1">Khôi phục từ backup:</p>
                        <code className="block bg-gray-800 text-gray-100 p-2 rounded font-mono">
                            npm run restore
                        </code>
                    </div>
                    <div>
                        <p className="text-gray-600 mb-1">Migration an toàn (tự động backup):</p>
                        <code className="block bg-gray-800 text-gray-100 p-2 rounded font-mono">
                            npm run migrate
                        </code>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        💡 Backup SQLite lưu tại: <code>backups/dev-backup-*.db</code> (giữ 10 bản gần nhất)
                    </p>
                </div>
            </div>
        </div>
    )
}
