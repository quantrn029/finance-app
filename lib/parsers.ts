import Papa from "papaparse"
import * as XLSX from "xlsx"
import { parse, isValid } from 'date-fns'
// Debug logger
function logDebug(message: string, data?: any) {
    if (process.env.NODE_ENV === 'development') {
        console.log(`[DEBUG] ${message}`, data || '')
    }
}

export interface ParsedOrder {
    platformOrderId: string
    date: Date
    revenue: number
    platformFee: number
    shippingFee: number
    netPayout: number
    status: string
    sku?: string
    productName?: string
    quantity?: number
    promotion?: number

    // Detailed fees
    serviceFee?: number
    paymentFee?: number
    fixedFee?: number
    affiliateFee?: number
    transactionFee?: number
    commissionFee?: number
    otherFees?: number

    // Shopee specific
    sellerVoucher?: number
    sellerCoinCashback?: number
    returnShippingFee?: number

    // TikTok specific
    orderProcessingFee?: number
    affiliateCommission?: number
    adCommission?: number
    partnerCommission?: number
    affiliatePartnerShopAdsCommission?: number
    flashSaleFee?: number
    otherServiceFees?: number

    // Taxes
    taxVAT?: number
    taxPIT?: number
}

// Helper to find header row
function findHeaderRow(data: any[][], keywords: string[]): number {
    for (let i = 0; i < Math.min(data.length, 20); i++) {
        const row = data[i]
        const rowStr = row.join(' ').toLowerCase()
        if (keywords.some(k => rowStr.includes(k.toLowerCase()))) {
            return i
        }
    }
    return -1
}

// Helper to parse currency string to number
function parseCurrency(value: any): number {
    if (!value) return 0
    if (typeof value === 'number') return value

    // Remove currency symbols and separators
    const cleanStr = String(value)
        .replace(/[₫$€£]/g, '') // Remove symbols
        .replace(/\./g, '')     // Remove thousands separator (VN style)
        .replace(/,/g, '.')     // Replace decimal separator
        .trim()

    const num = parseFloat(cleanStr)
    return isNaN(num) ? 0 : num
}

export function mapShopeeData(data: any[][], _unused?: string): ParsedOrder[] {
    logDebug("START SHOPEE PARSING")
    const headerIndex = findHeaderRow(data, ["Mã đơn hàng", "Order ID", "Mã giao dịch"])

    if (headerIndex === -1) {
        logDebug("SHOPEE: Header row not found!")
        return []
    }

    const headers = data[headerIndex] as string[]
    const rows = data.slice(headerIndex + 1)

    logDebug("SHOPEE HEADERS:", headers)
    if (rows.length > 0) {
        logDebug("SHOPEE FIRST ROW:", rows[0])
    }

    // Detect Shopee Income File (Sheet "Doanh thu")
    const isIncomeFile = headers.some(h => h && String(h).toLowerCase().includes("tổng tiền đã thanh toán"))
    logDebug("SHOPEE: Is Income File: " + isIncomeFile)

    // Detect file type based on headers
    const hasTransactionType = headers.some(h => h && String(h).toLowerCase().includes("loại giao dịch"))

    let firstOrderLogged = false
    const orders: ParsedOrder[] = rows
        .map((row: any[]): ParsedOrder | null => {
            // Helper to get value by column name
            const getCol = (name: string) => {
                const index = headers.findIndex(h => h && String(h).toLowerCase().includes(name.toLowerCase()))
                return index !== -1 ? row[index] : undefined
            }

            // Try multiple order ID formats
            const orderId = getCol("Mã đơn hàng") || getCol("Order ID") || getCol("Mã giao dịch")
            if (!orderId) return null

            // Filter for Income File: Only process "Order" rows (skip Sku rows)
            if (isIncomeFile) {
                const type = String(getCol("Đơn hàng / Sản phẩm") || "").toLowerCase()
                if (type !== "order" && type !== "đơn hàng") {
                    return null
                }
            }

            // Check Status (for info only, we trust the file's financial data)
            const status = String(getCol("Trạng thái đơn hàng") || getCol("Order Status") || getCol("Trạng thái") || "Completed").trim()

            // STRATEGY 1: Shopee Income File (Doanh thu sheet)
            // Columns: Mã đơn hàng, Tổng tiền đã thanh toán (Net Payout), Giá sản phẩm (Revenue), etc.
            let revenue = 0
            let netPayout = 0
            let shippingFee = 0

            if (isIncomeFile) {
                const refundAmount = parseCurrency(getCol("Số tiền hoàn lại"))
                // Revenue should be adjusted by refund amount (which is usually negative)
                // If full refund, Revenue + Refund = 0
                let baseRevenue = parseCurrency(getCol("Tổng số tiền đơn hàng (sản phẩm)") || getCol("Giá sản phẩm") || getCol("Product Price"))
                if (refundAmount < 0) {
                    revenue = Math.max(0, baseRevenue + refundAmount)
                } else {
                    revenue = baseRevenue
                }
                netPayout = parseCurrency(getCol("Tổng tiền đã thanh toán") || getCol("Total Amount"))
            } else {
                // STRATEGY 2: Standard Order Export (Order.all file)
                revenue = parseCurrency(
                    getCol("Tổng tiền người mua trả") ||
                    getCol("Total Amount") ||
                    getCol("Tổng tiền sản phẩm") ||
                    getCol("Doanh thu đơn hàng") ||
                    getCol("Giá bán") ||
                    getCol("Deal Price")
                )

                netPayout = parseCurrency(
                    getCol("Số tiền nhận được") ||
                    getCol("Net Amount") ||
                    getCol("Thực nhận") ||
                    getCol("Số tiền quyết toán")
                )
            }

            // STRATEGY 3: Balance Transaction Report (my_balance_transaction_report file)
            // Columns: Loại giao dịch, Chi tiết, Mã đơn hàng, Đơn vị, Số tiền
            // This file has NEGATIVE amounts for fees, POSITIVE for revenue
            if (hasTransactionType) {
                const transactionType = String(getCol("Loại giao dịch") || getCol("Transaction Type") || "").toLowerCase()
                const amount = parseCurrency(getCol("Số tiền") || getCol("Amount"))

                // For "Doanh thu Đơn Hàng" (Order Revenue) - amount is POSITIVE
                if (transactionType.includes("doanh thu") || transactionType.includes("revenue")) {
                    revenue = Math.abs(amount)
                    netPayout = 0 // Will be calculated later
                }
                // For fees/adjustments - amount is NEGATIVE
                else if (amount < 0) {
                    // This row is a fee deduction, skip for now
                    // We'll aggregate fees separately
                    return null
                }
            }

            // Shipping Fee Logic - STRICT MODE
            // We prioritize "Actual Shipping Fee" (Phí vận chuyển thực tế) which is the amount deducted from the seller.
            // We AVOID "Buyer Paid Shipping Fee" (Phí vận chuyển người mua trả) which is revenue.

            // 1. Get Actual Shipping Fee (usually negative in Income file)
            const rawActualShipping = parseCurrency(
                getCol("Phí vận chuyển thực tế") ||
                getCol("Actual Shipping Fee")
            )

            // 2. Get Shipping Subsidy (usually positive)
            const rawShippingSubsidy = parseCurrency(
                getCol("Phí vận chuyển được trợ giá từ Shopee") ||
                getCol("Shipping Fee Rebate")
            )

            // 3. Calculate Net Shipping Cost
            // Example: Actual (-32800) + Subsidy (0) = -32800 -> Cost 32800
            // Example: Actual (-32800) + Subsidy (15000) = -17800 -> Cost 17800
            let netShipping = rawActualShipping + rawShippingSubsidy

            // If net is negative, it's a cost. If positive, it's a gain (unlikely for shipping, but possible)
            shippingFee = 0
            if (netShipping < 0) {
                shippingFee = Math.abs(netShipping)
            }

            // Fallback for Income Files only: "Phí vận chuyển" usually means the deduction
            if (shippingFee === 0 && isIncomeFile) {
                // Only use if NEGATIVE
                const rawShipping = parseCurrency(getCol("Phí vận chuyển"))
                if (rawShipping < 0) {
                    shippingFee = Math.abs(rawShipping)
                }
            }

            // Extract detailed Shopee fees (works for both Order Export and Income Report)
            const serviceFee = Math.abs(parseCurrency(getCol("Phí Dịch Vụ") || getCol("Service Fee")))
            const paymentFee = Math.abs(parseCurrency(getCol("Phí thanh toán") || getCol("Payment Fee")))
            const fixedFee = Math.abs(parseCurrency(getCol("Phí cố định") || getCol("Fixed Fee")))
            const affiliateFee = Math.abs(parseCurrency(getCol("Phí hoa hồng Tiếp thị liên kết") || getCol("Affiliate Fee") || getCol("Phí Hạ Tầng")))

            // NEW: Additional Shopee Fees (Vouchers, Coins, Return Shipping)
            const sellerVoucher = Math.abs(parseCurrency(getCol("Mã ưu đãi do Người Bán chịu") || getCol("Voucher Code")))
            const sellerCoinCashback = Math.abs(parseCurrency(getCol("Mã hoàn xu do Người Bán chịu") || getCol("Seller Absorbed Coin Cashback")))

            // Return Shipping: Sum of potential return fee columns
            const returnShipping1 = Math.abs(parseCurrency(getCol("Phí vận chuyển trả hàng (đơn Trả hàng/hoàn tiền)")))
            const returnShipping2 = Math.abs(parseCurrency(getCol("Phí vận chuyển trả hàng (đơn giao không thành công)")))
            const returnShippingFee = returnShipping1 + returnShipping2

            const taxVAT = Math.abs(parseCurrency(getCol("Thuế GTGT") || getCol("VAT")))
            const taxPIT = Math.abs(parseCurrency(getCol("Thuế TNCN") || getCol("PIT")))
            const voucherFee = Math.abs(parseCurrency(getCol("Voucher Xtra") || getCol("Voucher")))

            // Calculate total from components for comparison
            // IMPORTANT: Must include shippingFee (seller-paid shipping) in the component sum
            const totalComponents = serviceFee + paymentFee + fixedFee + affiliateFee + sellerVoucher + sellerCoinCashback + returnShippingFee + taxVAT + taxPIT + voucherFee + shippingFee

            // PRIMARY TRUTH: Calculate Platform Fee from Financials
            // Platform Fee = Revenue - Net Payout
            // This includes ALL deductions: Commission, Transaction Fee, AND Seller-Paid Shipping
            let platformFee = 0
            if (revenue > 0 && netPayout > 0) {
                platformFee = revenue - netPayout
            } else {
                // Fallback if revenue/payout missing (rare)
                platformFee = totalComponents
            }

            // Calculate "Other Fees" as the difference
            // This captures any fee not explicitly parsed (e.g. adjustments, penalties)
            // or corrects for parsing errors
            let otherFees = 0
            if (platformFee > totalComponents) {
                otherFees = platformFee - totalComponents
            }

            // Parse date with multiple formats
            const dateStr = getCol("Thời gian Đơn hàng hoàn tất") || getCol("Order Complete Time") ||
                getCol("Ngày tạo đơn") || getCol("Create Time") ||
                getCol("Ngày") || getCol("Date") || getCol("Thời gian thanh toán đã chuyển") ||
                getCol("Ngày đặt hàng") // Income file

            let orderDate = new Date() // Default to today

            if (dateStr) {
                // Try multiple date parsing strategies
                let parsedDate: Date | null = null

                // Strategy 1: Direct parsing (works for ISO dates like "2025-11-21 12:30:00")
                parsedDate = new Date(String(dateStr))

                // Strategy 2: If Excel serial number (number > 40000 is likely Excel date)
                if (!parsedDate || isNaN(parsedDate.getTime())) {
                    const num = Number(dateStr)
                    if (!isNaN(num) && num > 40000 && num < 60000) {
                        // Excel date serial: days since 1900-01-01
                        parsedDate = new Date((num - 25569) * 86400 * 1000)
                    }
                }

                // If we got a valid date, use it. Otherwise keep default (today)
                if (parsedDate && !isNaN(parsedDate.getTime())) {
                    orderDate = parsedDate
                }
            }

            // Extract SKU and Product Name
            const sku = getCol("SKU") || getCol("Mã sản phẩm") || getCol("Product SKU")
            const productName = getCol("Tên sản phẩm") || getCol("Product Name") || getCol("Tên phiên bản") || getCol("Variation Name") || getCol("Chi tiết") || getCol("Tên hàng") || getCol("Item Name")
            // FIX: Do NOT use "Amount" or "Doanh thu" as fallback for quantity
            const quantity = parseCurrency(getCol("Số lượng") || getCol("Quantity") || 1)

            // Log for debugging (only first order)
            if (!firstOrderLogged) {
                firstOrderLogged = true
                logDebug("SHOPEE PARSED ORDER EXAMPLE:", {
                    orderId,
                    revenue,
                    netPayout,
                    productName, // Log this
                    quantity,    // Log this
                    headers: headers.filter(h => h && h.toLowerCase().includes("tên")), // Log relevant headers
                    platformFee,
                    shippingFee,
                    serviceFee,
                    paymentFee,
                    fixedFee,
                    affiliateFee,
                    otherFees,
                    dateStr,
                    orderDate
                })
            }

            return {
                platformOrderId: String(orderId),
                date: orderDate,
                revenue: revenue,
                platformFee: platformFee,
                shippingFee: shippingFee,
                netPayout: netPayout,
                status: status,
                sku: sku ? String(sku) : undefined,
                productName: productName ? String(productName) : undefined,
                quantity: quantity > 0 ? quantity : 1,

                // Shopee detailed fees
                serviceFee: serviceFee || undefined,
                paymentFee: paymentFee || undefined,
                fixedFee: fixedFee || undefined,
                affiliateFee: affiliateFee || undefined,
                sellerVoucher: sellerVoucher || undefined,
                sellerCoinCashback: sellerCoinCashback || undefined,
                returnShippingFee: returnShippingFee || undefined,

                // The following are not directly available in Shopee exports as separate columns
                // or are covered by other fees.
                transactionFee: undefined, // Shopee uses paymentFee
                commissionFee: undefined, // Shopee uses fixedFee/serviceFee
                taxVAT: undefined, // Not typically broken down per order in these reports
                taxPIT: undefined, // Not typically broken down per order in these reports

                // Store the extra fees in otherFees for now
                otherFees: otherFees > 0 ? otherFees : undefined
            }
        })
        .filter((o): o is ParsedOrder => o !== null)

    console.log(`DEBUG SHOPEE: Parsed ${orders.length} orders total`)
    return orders
}

export function mapTikTokData(data: any[][], _unused?: string): ParsedOrder[] {
    logDebug("START TIKTOK PARSING")
    const headerIndex = findHeaderRow(data, ["Order/adjustment ID", "Order ID", "Mã đơn hàng"])
    if (headerIndex === -1) {
        logDebug("TIKTOK: Header row not found!")
        return []
    }

    const headers = data[headerIndex] as string[]
    const rows = data.slice(headerIndex + 1)

    // DEBUG: Print all headers with indices
    logDebug("TIKTOK HEADERS:", headers)
    if (rows.length > 0) {
        logDebug("TIKTOK FIRST ROW:", rows[0])
    }

    let firstOrderLogged = false
    const orders: ParsedOrder[] = rows
        .map((row: any[]): ParsedOrder | null => {
            const getCol = (name: string) => {
                const index = headers.findIndex(h => h && String(h).toLowerCase().includes(name.toLowerCase()))
                return index !== -1 ? row[index] : undefined
            }

            const orderId = getCol("Order ID") || getCol("Order/adjustment ID") || getCol("Mã đơn hàng")
            if (!orderId) return null

            // Filter for "Order" type only if "Type" column exists
            const type = String(getCol("Type") || "").trim()
            if (type && type.toLowerCase() !== "order" && type.toLowerCase() !== "đơn hàng") {
                return null
            }

            // Status: Assume Completed/Settled for Income file
            const status = "Completed"

            // TikTok Income File Columns
            const revenue = parseCurrency(
                getCol("Total Revenue") ||
                getCol("Order Amount") ||
                getCol("Doanh thu")
            )

            const netPayout = parseCurrency(
                getCol("Total settlement amount") ||
                getCol("Số tiền quyết toán")
            )

            const shippingFee = Math.abs(parseCurrency(
                getCol("Seller shipping fee") ||
                getCol("Shipping Fee After Discount") ||
                getCol("Phí vận chuyển")
            ))

            // Extract detailed TikTok fees
            const commissionFee = Math.abs(parseCurrency(
                getCol("TikTok Shop commission fee") ||
                getCol("Phí hoa hồng của TikTok Shop")
            ))

            const transactionFee = Math.abs(parseCurrency(
                getCol("Transaction fee") ||
                getCol("Phí giao dịch")
            ))

            // Affiliate & Ads
            const affiliateCommission = Math.abs(parseCurrency(getCol("Affiliate commission") || getCol("Hoa hồng liên kết")))
            const adCommission = Math.abs(parseCurrency(
                getCol("Affiliate Shop Ads commission") ||
                getCol("Hoa hồng Quảng cáo cửa hàng") ||
                getCol("Hoa hồng Quảng cáo")
            ))
            const partnerCommission = Math.abs(parseCurrency(getCol("Affiliate partner commission") || getCol("Hoa hồng đối tác liên kết")))
            const affiliatePartnerShopAdsCommission = Math.abs(parseCurrency(getCol("Affiliate Partner shop ads commission") || getCol("Hoa hồng Đối tác - Quảng cáo cửa hàng")))

            // Service Fees
            const orderProcessingFee = Math.abs(parseCurrency(
                getCol("Order processing fee") ||
                getCol("Phí xử lý đơn hàng")
            ))
            const flashSaleFee = Math.abs(parseCurrency(
                getCol("Flash Sale service fee") ||
                getCol("Phí dịch vụ Flash Sale")
            ))
            const serviceFee = Math.abs(parseCurrency(getCol("Service fee") || getCol("Phí dịch vụ") || getCol("SFP service fee")))
            const otherServiceFees = Math.abs(parseCurrency(getCol("Bonus cashback service fee"))) +
                Math.abs(parseCurrency(getCol("LIVE Specials service fee"))) +
                Math.abs(parseCurrency(getCol("Voucher Xtra service fee"))) +
                Math.abs(parseCurrency(getCol("EAMS Program service fee"))) +
                Math.abs(parseCurrency(getCol("Campaign resource fee"))) +
                Math.abs(parseCurrency(getCol("SFR service fee"))) +
                Math.abs(parseCurrency(getCol("TikTok PayLater program fee")))

            // Taxes
            const taxVAT = Math.abs(parseCurrency(getCol("VAT withheld by TikTok Shop") || getCol("Thuế GTGT")))
            const taxPIT = Math.abs(parseCurrency(getCol("PIT withheld by TikTok Shop") || getCol("Thuế TNCN")))

            // Extract Seller Shipping Fee
            const sellerShippingFee = Math.abs(parseCurrency(getCol("Seller shipping fee")))

            // Calculate Platform Fee from components
            // Must include ALL fees that reduce the payout
            const componentsSum = commissionFee + transactionFee + orderProcessingFee +
                affiliateCommission + adCommission + partnerCommission +
                affiliatePartnerShopAdsCommission + flashSaleFee +
                serviceFee + otherServiceFees + taxVAT + taxPIT + sellerShippingFee

            // PRIMARY TRUTH: Calculate Platform Fee from Financials
            // Platform Fee = Revenue - Net Payout
            let platformFee = componentsSum
            let otherFees = 0

            // Only override if we have valid revenue and payout
            // And if the difference is significant (to avoid rounding errors)
            if (revenue !== 0 || netPayout !== 0) {
                const calculatedFee = revenue - netPayout
                // If calculated fee is different from components sum by more than 100 VND (rounding)
                if (Math.abs(calculatedFee - componentsSum) > 100) {
                    platformFee = calculatedFee
                    // The difference is "Other Fees" (or missing fees)
                    // If calculated > components, we missed some fees
                    if (platformFee > componentsSum) {
                        otherFees = platformFee - componentsSum
                    }
                    // If calculated < components, something is wrong with our parsing or the file
                    // But we trust Net Payout, so we adjust. 
                    // However, we can't easily reduce specific components. 
                    // We'll just trust the calculated platformFee.
                }
            }

            // Parse date - "Order created time" in Income file (YYYY/MM/DD)
            const dateStr = getCol("Order created time") || getCol("Created Time") || getCol("Ngày tạo đơn")
            let orderDate = new Date() // Default to today

            if (dateStr) {
                const str = String(dateStr).trim()
                // Try YYYY/MM/DD format (TikTok Income: "2025/11/20")
                const yyyymmddMatch = str.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/)
                if (yyyymmddMatch) {
                    const [_, year, month, day] = yyyymmddMatch
                    const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
                    const parsedDate = new Date(isoDate)
                    if (!isNaN(parsedDate.getTime())) {
                        orderDate = parsedDate
                    }
                } else {
                    // Fallback: Try standard Date parsing
                    const parsedDate = new Date(str)
                    if (!isNaN(parsedDate.getTime())) {
                        orderDate = parsedDate
                    }
                }
            }

            // SKU/Product Name might not be in Income file "Order details" sheet
            // We leave them undefined if not found
            // SKU/Product Name might not be in Income file "Order details" sheet
            // We leave them undefined if not found
            const sku = getCol("Seller SKU") || getCol("SKU ID")
            const productName = getCol("Product Name")
            const quantity = parseCurrency(getCol("Quantity") || getCol("Số lượng") || 1)

            // DEBUG: Log first parsed order
            if (!firstOrderLogged && orderId) {
                firstOrderLogged = true
                console.log("DEBUG TIKTOK: First parsed order:", {
                    orderId,
                    status,
                    revenue,
                    netPayout,
                    productName, // Log this
                    quantity,    // Log this
                    platformFee,
                    shippingFee,
                    dateStr,
                    orderDate
                })
            }

            return {
                platformOrderId: String(orderId),
                date: orderDate,
                revenue: revenue,
                platformFee: platformFee, // Always 0 - fees come from Reports
                shippingFee: shippingFee,
                netPayout: netPayout,
                status: status,
                sku: sku ? String(sku) : undefined,
                productName: productName ? String(productName) : undefined,
                quantity: quantity > 0 ? quantity : 1,

                // TikTok detailed fees
                commissionFee: commissionFee || undefined,
                transactionFee: transactionFee || undefined,
                paymentFee: undefined, // Not used in new schema
                serviceFee: serviceFee || undefined,
                affiliateCommission: affiliateCommission || undefined,
                adCommission: adCommission || undefined,
                partnerCommission: partnerCommission || undefined,
                affiliatePartnerShopAdsCommission: affiliatePartnerShopAdsCommission || undefined,
                flashSaleFee: flashSaleFee || undefined,
                orderProcessingFee: orderProcessingFee || undefined,
                taxVAT: taxVAT || undefined,
                taxPIT: taxPIT || undefined,
                otherFees: otherFees > 0 ? otherFees : undefined
            }
        })
        .filter((o): o is ParsedOrder => o !== null)

    console.log(`DEBUG TIKTOK: Parsed ${orders.length} orders total`)
    return orders
}

// Parse TikTok Reports sheet to extract detailed monthly fees
export function parseTikTokReports(data: any[][]): {
    transactionFee: number
    commissionFee: number
    orderProcessingFee: number
    affiliateCommission: number
    adCommission: number
    partnerCommission: number
    affiliatePartnerShopAdsCommission: number
    flashSaleFee: number
    otherServiceFees: number
    taxVAT: number
    taxPIT: number
    totalFees: number
} {
    const fees = {
        transactionFee: 0,
        commissionFee: 0,
        orderProcessingFee: 0,
        affiliateCommission: 0,
        adCommission: 0,
        partnerCommission: 0,
        affiliatePartnerShopAdsCommission: 0,
        flashSaleFee: 0,
        otherServiceFees: 0,
        taxVAT: 0,
        taxPIT: 0,
        totalFees: 0
    }

    // Find fee rows by searching for specific fee names
    for (let i = 0; i < data.length; i++) {
        const row = data[i]
        if (!row || row.length < 2) continue

        // Find first non-empty cell as fee name (skip empty cells at beginning)
        let feeName = ''
        for (let j = 0; j < row.length - 1; j++) {
            if (row[j] && String(row[j]).trim()) {
                feeName = String(row[j]).trim().toLowerCase()
                break
            }
        }

        if (!feeName) continue

        const feeValue = Math.abs(parseCurrency(row[row.length - 1])) // Last column usually has the value

        // Transaction Fee
        if (feeName === 'transaction fee' || feeName.includes('phí giao dịch')) {
            fees.transactionFee = feeValue
        }
        // TikTok Shop Commission Fee
        else if (feeName === 'tiktok shop commission fee' || feeName.includes('phí hoa hồng của tiktok shop')) {
            fees.commissionFee = feeValue
        }
        // Order processing fee
        else if (feeName.includes('order processing fee') || feeName.includes('phí xử lý đơn hàng')) {
            fees.orderProcessingFee = feeValue
        }
        // Affiliate Commission (KOL/KOC)
        else if (feeName === 'affiliate commission' || feeName.includes('affiliate commission before pit')) {
            fees.affiliateCommission = feeValue
        }
        // Affiliate Shop Ads commission
        else if (feeName.includes('affiliate shop ads commission before pit')) {
            fees.adCommission = feeValue
        }
        // Affiliate partner commission
        else if (feeName.includes('affiliate partner commission') && !feeName.includes('shop ads')) {
            fees.partnerCommission = feeValue
        }
        // Affiliate Partner shop ads commission
        else if (feeName.includes('affiliate partner shop ads commission')) {
            fees.affiliatePartnerShopAdsCommission = feeValue
        }
        // Flash Sale service fee
        else if (feeName.includes('flash sale service fee') || feeName.includes('phí flash sale')) {
            fees.flashSaleFee = feeValue
        }
        // Other service fees (combine multiple)
        else if (feeName.includes('bonus cashback service fee') ||
            feeName.includes('live specials service fee') ||
            feeName.includes('voucher xtra service fee') ||
            feeName.includes('eams program service fee') ||
            feeName.includes('sfp service fee')) {
            fees.otherServiceFees += feeValue
        }
        // VAT
        else if (feeName.includes('vat withheld by tiktok shop')) {
            fees.taxVAT = feeValue
        }
        // PIT
        else if (feeName.includes('pit withheld by tiktok shop')) {
            fees.taxPIT = feeValue
        }
        // Total Fees
        else if (feeName === 'total fees') {
            fees.totalFees = feeValue
        }
    }

    console.log('DEBUG TIKTOK REPORTS: Parsed fees:', fees)
    return fees
}

export async function parseCSV(csvText: string): Promise<any[][]> {
    return new Promise((resolve, reject) => {
        Papa.parse(csvText, {
            header: false, // Read as array of arrays
            skipEmptyLines: true,
            complete: (results: any) => resolve(results.data as any[][]),
            error: (error: any) => reject(error),
        })
    })
}

export function parseExcel(buffer: ArrayBuffer, platform: string): { rawData: any[][], tiktokReportsFees: any | null } {
    const workbook = XLSX.read(buffer, { type: "array" })
    console.log("DEBUG: Workbook SheetNames:", workbook.SheetNames)

    let sheetName = workbook.SheetNames[0]
    let tiktokReportsFees: any = null

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
                // Decode range and force end row to a large number (e.g. 5000) or calculate actual size
                // Simple fix: just extend the range significantly
                const range = XLSX.utils.decode_range(sheet['!ref'])
                range.e.r = Math.max(range.e.r, 5000) // Read up to 5000 rows
                sheet['!ref'] = XLSX.utils.encode_range(range)
            }
        }

        // Parse Reports sheet for detailed fees
        // Robust search for Reports sheet
        const reportsSheetName = workbook.SheetNames.find((n: string) =>
            n.toLowerCase().includes('report') ||
            n.toLowerCase().includes('báo cáo') ||
            n.toLowerCase().includes('tổng quan')
        )

        const reportsSheet = reportsSheetName ? workbook.Sheets[reportsSheetName] : undefined

        if (reportsSheet) {
            const reportsData = XLSX.utils.sheet_to_json(reportsSheet, { header: 1 }) as any[][]
            tiktokReportsFees = parseTikTokReports(reportsData)
            console.log("DEBUG TIKTOK: Parsed Reports fees:", tiktokReportsFees)
        }
    }

    const worksheet = workbook.Sheets[sheetName]
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

    return { rawData, tiktokReportsFees }
}
export function mapFacebookInstagramData(data: any[]): ParsedOrder[] {
    return data.map((row: any) => {
        const revenue = parseCurrency(row["Revenue"] || row["Amount"] || row["Total"] || 0)
        const shippingFee = parseCurrency(row["Shipping Fee"] || row["Shipping"] || 0)
        const netPayout = revenue - shippingFee // Simplified assumption

        return {
            platformOrderId: String(row["Order ID"] || row["ID"] || Date.now().toString()),
            date: row["Date"] ? new Date(row["Date"]) : new Date(),
            revenue: revenue,
            platformFee: 0, // Manual orders usually have no platform fee unless specified
            shippingFee: shippingFee,
            netPayout: netPayout,
            status: "Completed",
            sku: row["SKU"] || undefined,
            productName: row["Product Name"] || row["Item"] || undefined,
            quantity: Number(row["Quantity"] || 1)
        }
    })
}
