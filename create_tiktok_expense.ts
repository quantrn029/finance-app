import prisma from '@/lib/prisma';
import * as XLSX from 'xlsx';
import { parseTikTokReports } from '@/lib/parsers';

const filePath = '/Users/quantran/Downloads/data/income_20251121123001(UTC+7).xlsx'; // adjust path if needed

async function main() {
    const buffer = require('fs').readFileSync(filePath);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const reportsSheet = workbook.Sheets['Reports'];
    if (!reportsSheet) {
        console.log('Reports sheet not found');
        return;
    }
    const reportsData = XLSX.utils.sheet_to_json(reportsSheet, { header: 1 }) as any[][];
    const fees = parseTikTokReports(reportsData);
    console.log('Parsed fees:', fees);
    const total = fees.orderProcessingFee + fees.affiliateCommission + fees.adCommission + fees.partnerCommission + fees.affiliatePartnerShopAdsCommission + fees.flashSaleFee + fees.otherServiceFees;
    console.log('Total detailed fees:', total);
    if (total > 0) {
        await prisma.expense.create({
            data: {
                date: new Date(),
                category: 'Platform',
                subcategory: 'TikTok - Phí bổ sung (test)',
                amount: total,
                note: 'Test expense from script',
                description: JSON.stringify(fees),
                type: 'Platform',
            },
        });
        console.log('Expense created');
    }
    await prisma.$disconnect();
}

main().catch(console.error);
