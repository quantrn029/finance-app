import * as XLSX from "xlsx";
import * as fs from "fs";
import { parseTikTokReports } from "./lib/parsers";

const filePath = "/Users/quantran/Downloads/data/income_20251121123001(UTC+7).xlsx";

try {
    const buffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(buffer, { type: "buffer" });

    console.log("=== AVAILABLE SHEETS ===");
    console.log(workbook.SheetNames);

    // Try to find Reports sheet
    const reportsSheet = workbook.Sheets['Reports'];
    console.log("\n=== REPORTS SHEET FOUND? ===");
    console.log(!!reportsSheet);

    if (reportsSheet) {
        console.log("\n=== PARSING REPORTS SHEET ===");
        const reportsData = XLSX.utils.sheet_to_json(reportsSheet, { header: 1 }) as any[][];
        console.log("Total rows in Reports:", reportsData.length);

        console.log("\n=== CALLING parseTikTokReports ===");
        const fees = parseTikTokReports(reportsData);

        console.log("\n=== PARSED FEES ===");
        console.log(JSON.stringify(fees, null, 2));

        const total = fees.orderProcessingFee + fees.affiliateCommission + fees.adCommission +
            fees.partnerCommission + fees.affiliatePartnerShopAdsCommission +
            fees.flashSaleFee + fees.otherServiceFees;
        console.log("\n=== TOTAL DETAILED FEES ===");
        console.log(total);
    } else {
        console.log("ERROR: Reports sheet not found!");
    }

} catch (error) {
    console.error("Error:", error);
}
