import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { parseCSV, mapShopeeData, mapTikTokData } from "@/lib/parsers"
import { mapFacebookInstagramData } from "@/lib/parsers/facebook"
import * as XLSX from "xlsx"

export async function POST(req: NextRequest) {
    try {
        let orders: any[] = []
        let platform = ""
        let fileProcessed = "JSON Batch"
        let tiktokReportsFees: any = null // Store TikTok detailed fees from Reports sheet

        const contentType = req.headers.get("content-type") || ""

        if (contentType.includes("application/json")) {
            // Handle JSON payload (Client-side parsed)
            const body = await req.json()
            orders = body.orders || []
            platform = body.platform || ""
            fileProcessed = body.fileName || "batch_upload"
            tiktokReportsFees = body.tiktokReportsFees || null

            if (!orders.length) {
                return NextResponse.json({ error: "No orders provided" }, { status: 400 })
            }
        } else {
            // Handle FormData (Server-side parsing - Legacy/Small files)
            const formData = await req.formData()
            const file = formData.get("file") as File
            platform = formData.get("platform") as string
            fileProcessed = file?.name || "unknown"

            if (!file) {
                return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
            }

            const buffer = await file.arrayBuffer()
            let rawData: any[] = []
            let workbook: any = null // For Excel files

            // Determine file type and parse to raw 2D array
            if (file.name.endsWith(".csv")) {
                // Try to detect encoding or fallback to UTF-8
                // Shopee files might be UTF-8 with BOM or UTF-16LE
                let text = ""
                try {
                    text = new TextDecoder("utf-8", { fatal: false }).decode(buffer)
                    // Check for common replacement character  which indicates encoding issues
                    if (text.includes("") && text.length < 1000) {
                        console.warn("DEBUG: UTF-8 decoding produced replacement characters, trying UTF-16LE")
                        text = new TextDecoder("utf-16le").decode(buffer)
                    }
                } catch (e) {
                    console.warn("DEBUG: UTF-8 decoding failed, trying UTF-16LE")
                    text = new TextDecoder("utf-16le").decode(buffer)
                }

                // Log first few lines for debugging
                console.log("DEBUG: File Content Preview (First 500 chars):")
                console.log(text.substring(0, 500))

                rawData = await parseCSV(text)
            } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
                workbook = XLSX.read(buffer, { type: "array" })
                console.log("DEBUG: Workbook SheetNames:", workbook.SheetNames)

                let sheetName = workbook.SheetNames[0]
                // Duplicate declaration removed – using outer variable declared at line 20

                // Prefer "Doanh thu" sheet for Shopee Income files
                if (platform === "shopee") {
                    const incomeSheet = workbook.SheetNames.find((n: string) => n.toLowerCase().includes("doanh thu") || n.toLowerCase().includes("income"))
                    if (incomeSheet) {
                        sheetName = incomeSheet
                        console.log("DEBUG: Selected Shopee Income sheet:", sheetName)
                    }
                }
                // Prefer "Order details" sheet for TikTok Income files
                else if (platform === "tiktok") {
                    const orderDetailsSheet = workbook.SheetNames.find((n: string) => n.toLowerCase().includes("order details") || n.toLowerCase().includes("chi tiết đơn hàng"))
                    if (orderDetailsSheet) {
                        sheetName = orderDetailsSheet
                        console.log("DEBUG: Selected TikTok Order Details sheet:", sheetName)

                        // FIX: TikTok files often have incorrect !ref range (e.g. A1:U2)
                        // We force update the range to ensure we read all data
                        const sheet = workbook.Sheets[sheetName]
                        if (sheet['!ref']) {
                            console.log("DEBUG: Original !ref:", sheet['!ref'])
                            // Decode range and force end row to a large number (e.g. 5000) or calculate actual size
                            // Simple fix: just extend the range significantly
                            const range = XLSX.utils.decode_range(sheet['!ref'])
                            range.e.r = Math.max(range.e.r, 5000) // Read up to 5000 rows
                            sheet['!ref'] = XLSX.utils.encode_range(range)
                            console.log("DEBUG: Updated !ref:", sheet['!ref'])
                        }
                    }

                    // Parse Reports sheet for detailed fees
                    console.log("DEBUG TIKTOK: Available sheet names:", workbook.SheetNames)

                    // Robust search for Reports sheet
                    const reportsSheetName = workbook.SheetNames.find((n: string) =>
                        n.toLowerCase().includes('report') ||
                        n.toLowerCase().includes('báo cáo') ||
                        n.toLowerCase().includes('tổng quan')
                    )

                    const reportsSheet = reportsSheetName ? workbook.Sheets[reportsSheetName] : undefined
                    console.log("DEBUG TIKTOK: Reports sheet found?", !!reportsSheet, "Name:", reportsSheetName)

                    if (reportsSheet) {
                        const reportsData = XLSX.utils.sheet_to_json(reportsSheet, { header: 1 }) as any[][]
                        console.log("DEBUG TIKTOK: Reports data rows:", reportsData.length)
                        const { parseTikTokReports } = await import("@/lib/parsers")
                        tiktokReportsFees = parseTikTokReports(reportsData)
                        console.log("DEBUG TIKTOK: Parsed Reports fees:", tiktokReportsFees)
                    } else {
                        console.log("DEBUG TIKTOK: Reports sheet NOT FOUND! Available:", workbook.SheetNames)
                    }
                }

                const worksheet = workbook.Sheets[sheetName]
                rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]
            } else {
                return NextResponse.json({ error: "Unsupported file format. Please upload CSV or Excel." }, { status: 400 })
            }

            console.log("DEBUG: Raw Data Sample (First Row):", rawData[0])
            console.log("DEBUG: Total Rows:", rawData.length)

            // Map raw data to our schema
            if (platform === "shopee") {
                orders = mapShopeeData(rawData)
            } else if (platform === "tiktok") {
                // For TikTok, rawData contains Order details
                orders = mapTikTokData(rawData)
                // tiktokReportsFees already parsed from Reports sheet above
            } else if (platform === "direct" || platform === "facebook" || platform === "instagram") {
                // Direct orders: Facebook/Instagram manual CSV import
                // Convert rawData (2D array) to objects for mapFacebookInstagramData
                const headers = rawData[0]
                const rows = rawData.slice(1).map(row => {
                    const obj: any = {}
                    headers.forEach((header: string, i: number) => {
                        obj[header] = row[i]
                    })
                    return obj
                })
                orders = mapFacebookInstagramData(rows)
            } else {
                return NextResponse.json({ error: "Invalid platform" }, { status: 400 })
            }
        }

        // Save to DB
        // OPTIMIZATION: Read-Check-Write Pattern
        // 1. Group by Order ID
        const ordersMap = new Map<string, any[]>()
        for (const order of orders) {
            if (!order.platformOrderId) continue
            if (!ordersMap.has(order.platformOrderId)) {
                ordersMap.set(order.platformOrderId, [])
            }
            ordersMap.get(order.platformOrderId)!.push(order)
        }

        const uniqueOrderIds = Array.from(ordersMap.keys())
        console.log(`DEBUG: Processing ${uniqueOrderIds.length} unique orders`)
        console.time("DB_PROCESS")

        // 2. Find existing orders to separate CREATE vs UPDATE
        // Process in chunks of 1000 for reading to avoid too large queries
        const existingOrderIds = new Set<string>()
        const CHUNK_SIZE = 1000

        for (let i = 0; i < uniqueOrderIds.length; i += CHUNK_SIZE) {
            const chunk = uniqueOrderIds.slice(i, i + CHUNK_SIZE)
            const found = await prisma.order.findMany({
                where: { platformOrderId: { in: chunk } },
                select: { platformOrderId: true }
            })
            found.forEach(o => existingOrderIds.add(o.platformOrderId))
        }

        const newOrderIds = uniqueOrderIds.filter(id => !existingOrderIds.has(id))
        const updateOrderIds = uniqueOrderIds.filter(id => existingOrderIds.has(id))

        console.log(`DEBUG: New Orders: ${newOrderIds.length}, Update Orders: ${updateOrderIds.length}`)

        let count = 0
        let skipped = 0
        let firstError: string | null = null

        // 3. Bulk Create New Orders
        if (newOrderIds.length > 0) {
            console.time("DB_CREATE_MANY")
            const newOrdersData = newOrderIds.map(id => {
                const orderRows = ordersMap.get(id)!
                const order = orderRows[0]
                return {
                    platformOrderId: id,
                    platform: platform === "shopee" ? "Shopee" : platform === "tiktok" ? "TikTok" : platform === "facebook" ? "Facebook" : "Instagram",
                    promotion: order.promotion || 0,
                    date: order.date || new Date(),
                    revenue: order.revenue || 0,
                    platformFee: order.platformFee || 0,
                    shippingFee: order.shippingFee || 0,
                    netPayout: order.netPayout || 0,
                    status: order.status || "Completed",
                    // Detailed fees
                    serviceFee: order.serviceFee || 0,
                    paymentFee: order.paymentFee || 0,
                    fixedFee: order.fixedFee || 0,
                    affiliateFee: order.affiliateFee || 0,
                    sellerVoucher: order.sellerVoucher || 0,
                    sellerCoinCashback: order.sellerCoinCashback || 0,
                    returnShippingFee: order.returnShippingFee || 0,
                    commissionFee: order.commissionFee || 0,
                    transactionFee: order.transactionFee || 0,
                    affiliateCommission: order.affiliateCommission || 0,
                    adCommission: order.adCommission || 0,
                    partnerCommission: order.partnerCommission || 0,
                    affiliatePartnerShopAdsCommission: order.affiliatePartnerShopAdsCommission || 0,
                    flashSaleFee: order.flashSaleFee || 0,
                    orderProcessingFee: order.orderProcessingFee || 0,
                    taxVAT: order.taxVAT || 0,
                    taxPIT: order.taxPIT || 0,
                    otherFees: order.otherFees || 0,
                }
            })

            // Process createMany in chunks
            for (let i = 0; i < newOrdersData.length; i += CHUNK_SIZE) {
                await prisma.order.createMany({
                    data: newOrdersData.slice(i, i + CHUNK_SIZE),
                    skipDuplicates: true
                })
            }
            console.timeEnd("DB_CREATE_MANY")
        }

        // 4. Update Existing Orders (Parallel Batches)
        if (updateOrderIds.length > 0) {
            console.time("DB_UPDATE_BATCH")
            const UPDATE_BATCH_SIZE = 50
            for (let i = 0; i < updateOrderIds.length; i += UPDATE_BATCH_SIZE) {
                const batchIds = updateOrderIds.slice(i, i + UPDATE_BATCH_SIZE)
                await Promise.all(batchIds.map(async (id) => {
                    const orderRows = ordersMap.get(id)!
                    const order = orderRows[0]
                    try {
                        await prisma.order.update({
                            where: { platformOrderId: id },
                            data: {
                                date: order.date,
                                revenue: order.revenue || 0,
                                platformFee: order.platformFee || 0,
                                netPayout: order.netPayout || 0,
                                // Update other fields as needed...
                                serviceFee: order.serviceFee || 0,
                                paymentFee: order.paymentFee || 0,
                                fixedFee: order.fixedFee || 0,
                                affiliateFee: order.affiliateFee || 0,
                                sellerVoucher: order.sellerVoucher || 0,
                                sellerCoinCashback: order.sellerCoinCashback || 0,
                                returnShippingFee: order.returnShippingFee || 0,
                                commissionFee: order.commissionFee || 0,
                                transactionFee: order.transactionFee || 0,
                                affiliateCommission: order.affiliateCommission || 0,
                                adCommission: order.adCommission || 0,
                                partnerCommission: order.partnerCommission || 0,
                                affiliatePartnerShopAdsCommission: order.affiliatePartnerShopAdsCommission || 0,
                                flashSaleFee: order.flashSaleFee || 0,
                                orderProcessingFee: order.orderProcessingFee || 0,
                                taxVAT: order.taxVAT || 0,
                                taxPIT: order.taxPIT || 0,
                                otherFees: order.otherFees || 0,
                            }
                        })
                    } catch (e: any) {
                        console.error(`Error updating order ${id}:`, e.message)
                    }
                }))
            }
            console.timeEnd("DB_UPDATE_BATCH")
        }

        // 5. Process Items (Need Order IDs)
        // Fetch ALL IDs (new + existing) to get UUIDs
        console.time("DB_FETCH_IDS")
        const allPlatformOrderIds = [...newOrderIds, ...updateOrderIds]
        const platformIdToUuid = new Map<string, string>()

        for (let i = 0; i < allPlatformOrderIds.length; i += CHUNK_SIZE) {
            const chunk = allPlatformOrderIds.slice(i, i + CHUNK_SIZE)
            const orders = await prisma.order.findMany({
                where: { platformOrderId: { in: chunk } },
                select: { id: true, platformOrderId: true }
            })
            orders.forEach(o => platformIdToUuid.set(o.platformOrderId, o.id))
        }
        console.timeEnd("DB_FETCH_IDS")

        // Upsert Items
        console.time("DB_UPSERT_ITEMS")
        const ITEM_BATCH_SIZE = 100
        const allItemsToProcess: any[] = []

        for (const id of allPlatformOrderIds) {
            const orderUuid = platformIdToUuid.get(id)
            if (!orderUuid) continue

            const rows = ordersMap.get(id)!
            for (const row of rows) {
                if (row.productName || row.sku) {
                    allItemsToProcess.push({ ...row, orderUuid })
                }
            }
        }

        for (let i = 0; i < allItemsToProcess.length; i += ITEM_BATCH_SIZE) {
            const batch = allItemsToProcess.slice(i, i + ITEM_BATCH_SIZE)
            await Promise.all(batch.map(async (item) => {
                try {
                    // Try to find existing item
                    // Note: This is still N queries. Optimizing items is harder without unique constraint.
                    // But we can assume if we just created the order, the item is new.
                    // For now, keep upsert logic but batched.

                    const quantity = item.quantity || 1
                    const revenue = item.revenue || 0
                    const unitPrice = quantity > 0 ? revenue / quantity : 0

                    const existingItem = await prisma.orderItem.findFirst({
                        where: {
                            orderId: item.orderUuid,
                            sku: item.sku || undefined,
                            productName: item.productName || undefined
                        }
                    })

                    if (existingItem) {
                        await prisma.orderItem.update({
                            where: { id: existingItem.id },
                            data: { quantity, unitPrice, totalRevenue: revenue }
                        })
                    } else {
                        await prisma.orderItem.create({
                            data: {
                                orderId: item.orderUuid,
                                sku: item.sku,
                                productName: item.productName || "Unknown Product",
                                quantity,
                                unitPrice,
                                totalRevenue: revenue
                            }
                        })
                    }
                } catch (e) {
                    // ignore item error
                }
            }))
        }
        console.timeEnd("DB_UPSERT_ITEMS")
        console.timeEnd("DB_PROCESS")

        count = newOrderIds.length + updateOrderIds.length

        // TikTok Adjustment Logic: Reconcile Reports vs Order Details
        if (platform === "tiktok" && tiktokReportsFees) {
            console.log("DEBUG TIKTOK: Fees object from Reports:", tiktokReportsFees);

            // 1. Get Total Fees from Reports (The Truth)
            const reportTotalFees = tiktokReportsFees.totalFees || (
                (tiktokReportsFees.transactionFee || 0) +
                (tiktokReportsFees.commissionFee || 0) +
                (tiktokReportsFees.orderProcessingFee || 0) +
                (tiktokReportsFees.affiliateCommission || 0) +
                (tiktokReportsFees.adCommission || 0) +
                (tiktokReportsFees.partnerCommission || 0) +
                (tiktokReportsFees.affiliatePartnerShopAdsCommission || 0) +
                (tiktokReportsFees.flashSaleFee || 0) +
                (tiktokReportsFees.otherServiceFees || 0) +
                (tiktokReportsFees.taxVAT || 0) +
                (tiktokReportsFees.taxPIT || 0)
            );

            // 2. Calculate Total Fees from Parsed Orders (Now detailed)
            const orderTotalFees = orders.reduce((sum, order) => sum + (order.platformFee || 0), 0);

            console.log(`DEBUG TIKTOK: Report Total: ${reportTotalFees}, Order Total: ${orderTotalFees}`);

            // 3. Calculate Adjustment
            const adjustmentAmount = reportTotalFees - orderTotalFees;

            // 4. Create Adjustment Expense if difference is significant (> 1000 VND)
            if (Math.abs(adjustmentAmount) > 1000) {
                try {
                    // Determine expense date
                    const firstOrderDate = orders.length > 0 && orders[0].date ? orders[0].date : new Date();
                    const expenseDate = firstOrderDate instanceof Date ? firstOrderDate : new Date(firstOrderDate);

                    // Check for existing adjustment to avoid duplicates
                    const existingExpense = await prisma.expense.findFirst({
                        where: {
                            date: expenseDate,
                            category: "Platform",
                            subcategory: "TikTok Shop",
                            isSystem: true,
                            // We can also check amount, but if the amount changed due to re-import logic, we might want to update it.
                            // For now, let's assume if it exists for this date/category/system, it's the same one.
                        }
                    })

                    if (existingExpense) {
                        // Update existing expense
                        await prisma.expense.update({
                            where: { id: existingExpense.id },
                            data: {
                                amount: adjustmentAmount,
                                description: JSON.stringify({
                                    "Tổng phí theo báo cáo": reportTotalFees,
                                    "Tổng phí theo đơn hàng": orderTotalFees,
                                    "Chênh lệch": adjustmentAmount,
                                    "Ghi chú": "Khoản này bù trừ cho các loại phí không có trong file Order details hoặc chênh lệch làm tròn (Cập nhật)"
                                })
                            }
                        })
                        console.log("DEBUG TIKTOK: Updated existing adjustment expense:", adjustmentAmount);
                    } else {
                        // Create new expense
                        await prisma.expense.create({
                            data: {
                                date: expenseDate,
                                category: "Platform",
                                subcategory: "TikTok Shop",
                                amount: adjustmentAmount,
                                note: "Chi phí chênh lệch TikTok (Thuế, Phí khác chưa có trong đơn hàng)",
                                description: JSON.stringify({
                                    "Tổng phí theo báo cáo": reportTotalFees,
                                    "Tổng phí theo đơn hàng": orderTotalFees,
                                    "Chênh lệch": adjustmentAmount,
                                    "Ghi chú": "Khoản này bù trừ cho các loại phí không có trong file Order details hoặc chênh lệch làm tròn"
                                }),
                                type: "Platform",
                                isSystem: true
                            }
                        });
                        console.log("DEBUG TIKTOK: Created adjustment expense:", adjustmentAmount);
                    }
                } catch (err: any) {
                    console.error("Error creating/updating TikTok adjustment expense:", err.message);
                }
            } else {
                console.log("DEBUG TIKTOK: Adjustment too small, skipping.");
            }
        }


        return NextResponse.json({
            success: true,
            count,
            debug: {
                totalRowsParsed: orders.length,
                saved: count,
                skipped,
                firstError,
                platform,
                fileProcessed: fileProcessed
            }
        })
    } catch (error: any) {
        console.error("Import error:", error)
        return NextResponse.json({
            error: error.message || "Internal Server Error",
            stack: error.stack?.split('\n').slice(0, 5).join('\n') // First 5 lines of stack
        }, { status: 500 })
    }
}

