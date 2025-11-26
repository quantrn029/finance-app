import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { parseCSV, mapShopeeData, mapTikTokData } from "@/lib/parsers"
import { mapFacebookInstagramData } from "@/lib/parsers/facebook"
import * as XLSX from "xlsx"

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData()
        const file = formData.get("file") as File
        const platform = formData.get("platform") as string

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
        }

        const buffer = await file.arrayBuffer()
        let rawData: any[] = []
        let workbook: any = null // For Excel files
        let tiktokReportsFees: any = null // Store TikTok detailed fees from Reports sheet

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
        let orders = []

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

        // Save to DB
        let count = 0
        let skipped = 0
        let firstError: string | null = null

        for (const order of orders) {
            if (!order.platformOrderId) {
                skipped++
                continue
            }

            try {
                const upsertedOrder = await prisma.order.upsert({
                    where: { platformOrderId: order.platformOrderId },
                    update: {
                        date: order.date,
                        promotion: order.promotion || 0,
                        revenue: order.revenue || 0,
                        platformFee: order.platformFee || 0,
                        shippingFee: order.shippingFee || 0,
                        netPayout: order.netPayout || 0,
                        status: order.status || "Completed",
                        // Detailed fees - Shopee
                        serviceFee: order.serviceFee || 0,
                        paymentFee: order.paymentFee || 0,
                        fixedFee: order.fixedFee || 0,
                        affiliateFee: order.affiliateFee || 0,
                        sellerVoucher: order.sellerVoucher || 0,
                        sellerCoinCashback: order.sellerCoinCashback || 0,
                        returnShippingFee: order.returnShippingFee || 0,
                        // Detailed fees - TikTok
                        commissionFee: order.commissionFee || 0,
                        transactionFee: order.transactionFee || 0,
                        affiliateCommission: order.affiliateCommission || 0,
                        adCommission: order.adCommission || 0,
                        partnerCommission: order.partnerCommission || 0,
                        affiliatePartnerShopAdsCommission: order.affiliatePartnerShopAdsCommission || 0,
                        flashSaleFee: order.flashSaleFee || 0,
                        orderProcessingFee: order.orderProcessingFee || 0,
                        // Taxes
                        taxVAT: order.taxVAT || 0,
                        taxPIT: order.taxPIT || 0,
                        // Other
                        otherFees: order.otherFees || 0,
                    },
                    create: {
                        platformOrderId: order.platformOrderId,
                        platform: platform === "shopee" ? "Shopee" : platform === "tiktok" ? "TikTok" : platform === "facebook" ? "Facebook" : "Instagram",
                        promotion: order.promotion || 0,
                        date: order.date || new Date(),
                        revenue: order.revenue || 0,
                        platformFee: order.platformFee || 0,
                        shippingFee: order.shippingFee || 0,
                        netPayout: order.netPayout || 0,
                        status: order.status || "Completed",
                        // Detailed fees - Shopee
                        serviceFee: order.serviceFee || 0,
                        paymentFee: order.paymentFee || 0,
                        fixedFee: order.fixedFee || 0,
                        affiliateFee: order.affiliateFee || 0,
                        sellerVoucher: order.sellerVoucher || 0,
                        sellerCoinCashback: order.sellerCoinCashback || 0,
                        returnShippingFee: order.returnShippingFee || 0,
                        // Detailed fees - TikTok
                        commissionFee: order.commissionFee || 0,
                        transactionFee: order.transactionFee || 0,
                        affiliateCommission: order.affiliateCommission || 0,
                        adCommission: order.adCommission || 0,
                        partnerCommission: order.partnerCommission || 0,
                        affiliatePartnerShopAdsCommission: order.affiliatePartnerShopAdsCommission || 0,
                        flashSaleFee: order.flashSaleFee || 0,
                        orderProcessingFee: order.orderProcessingFee || 0,
                        // Taxes
                        taxVAT: order.taxVAT || 0,
                        taxPIT: order.taxPIT || 0,
                        // Other
                        otherFees: order.otherFees || 0,
                    },
                })

                // Create/Update Order Item
                const orderAny = order as any
                if (orderAny.productName || orderAny.sku) {
                    const quantity = orderAny.quantity || 1
                    const revenue = orderAny.revenue || 0
                    const unitPrice = quantity > 0 ? revenue / quantity : 0

                    // Try to find existing item to avoid duplicates on re-import
                    const existingItem = await prisma.orderItem.findFirst({
                        where: {
                            orderId: upsertedOrder.id,
                            sku: orderAny.sku || undefined,
                            productName: orderAny.productName || undefined
                        }
                    })

                    if (existingItem) {
                        await prisma.orderItem.update({
                            where: { id: existingItem.id },
                            data: {
                                quantity,
                                unitPrice,
                                totalRevenue: revenue
                            }
                        })
                    } else {
                        await prisma.orderItem.create({
                            data: {
                                orderId: upsertedOrder.id,
                                sku: orderAny.sku,
                                productName: orderAny.productName || "Unknown Product",
                                quantity,
                                unitPrice,
                                totalRevenue: revenue
                            }
                        })
                    }
                }
                count++
            } catch (err: any) {
                console.error(`Error upserting order ${order.platformOrderId}:`, err.message)
                if (!firstError) {
                    firstError = `${order.platformOrderId}: ${err.message}`
                }
                skipped++
                // Continue with next order instead of failing entire import
            }
        }

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
                fileProcessed: file.name
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

