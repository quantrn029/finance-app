const XLSX = require('xlsx');

function checkTikTokReport() {
    console.log('--- TIKTOK REPORT CHECK ---');
    const wb = XLSX.readFile('/Users/quantran/Downloads/data/income_20251121123001(UTC+7).xlsx');

    // Find Reports sheet
    const sheetName = wb.SheetNames.find(n =>
        n.toLowerCase().includes('report') ||
        n.toLowerCase().includes('báo cáo') ||
        n.toLowerCase().includes('tổng quan')
    );

    if (!sheetName) {
        console.log("No Reports sheet found!");
        return;
    }

    console.log(`Found Sheet: ${sheetName}`);
    const sheet = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Look for "Total Fees" or similar
    // Usually in the first few rows
    for (let i = 0; i < 20; i++) {
        const row = data[i];
        if (row) {
            console.log(`Row ${i}:`, row);
        }
    }
}

checkTikTokReport();
