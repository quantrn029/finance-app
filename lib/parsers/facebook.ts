import { Order, Expense } from "@prisma/client"

export function mapFacebookInstagramData(rows: any[]): Partial<Order>[] {
    return rows
        .filter(row => row.Date && row['Total Revenue']) // Skip empty rows
        .map((row, index) => {
            const revenue = parseFloat(String(row['Total Revenue']).replace(/,/g, ''))
            const shippingFee = parseFloat(String(row['Shipping Fee'] || 0).replace(/,/g, ''))
            const promotion = parseFloat(String(row['Promotion'] || 0).replace(/,/g, ''))

            return {
                platformOrderId: `${row.Platform}-${Date.now()}-${index}`, // Auto-generate ID
                platform: row.Platform, // "Facebook" or "Instagram"
                date: new Date(row.Date),
                revenue,
                platformFee: 0, // No platform fee for direct sales
                shippingFee,
                promotion,
                netPayout: revenue - shippingFee - promotion,
                status: 'Completed',
                // All detailed fees = 0 for FB/IG
                serviceFee: 0,
                paymentFee: 0,
                fixedFee: 0,
                affiliateFee: 0,
                commissionFee: 0,
                transactionFee: 0,
                affiliateCommission: 0,
                adCommission: 0,
                partnerCommission: 0,
                flashSaleFee: 0,
                taxVAT: 0,
                taxPIT: 0,
                otherFees: 0
            }
        })
}
