const XLSX = require('xlsx');

function scanTikTok() {
    console.log('--- TIKTOK ANALYSIS ---');
    const wb = XLSX.readFile('/Users/quantran/Downloads/data/income_20251121123001(UTC+7).xlsx');
    const sheet = wb.Sheets['Order details'];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0, defval: '' });
    const headers = data[0];

    // Identify fee columns
    const feeCols = headers.map((h, i) => ({ name: h, index: i })).filter(c =>
        c && (
            c.toLowerCase().includes('fee') ||
            c.toLowerCase().includes('commission') ||
            c.toLowerCase().includes('tax') ||
            c.toLowerCase().includes('discount')
        )
    );

    console.log('Fee Columns found:', feeCols.map(c => c.name));

    let nonZeroCount = 0;
    let sampleRows = [];

    // Scan first 100 data rows
    for (let i = 1; i < Math.min(data.length, 101); i++) {
        const row = data[i];
        let hasFee = false;
        let rowFees = {};

        feeCols.forEach(col => {
            const val = parseFloat(row[col.index]);
            if (val !== 0 && !isNaN(val)) {
                hasFee = true;
                rowFees[col.name] = val;
            }
        });

        if (hasFee) {
            nonZeroCount++;
            if (sampleRows.length < 3) {
                sampleRows.push({ row: i + 1, fees: rowFees });
            }
        }
    }

    console.log(`Found ${nonZeroCount} rows with non-zero fees in first 100 rows.`);
    if (sampleRows.length > 0) {
        console.log('Sample Data (Non-zero fees):');
        console.log(JSON.stringify(sampleRows, null, 2));
    } else {
        console.log('WARNING: All fee columns are 0 in the first 100 rows!');
    }
}

function scanShopee() {
    console.log('\n--- SHOPEE ANALYSIS ---');
    const wb = XLSX.readFile('/Users/quantran/Downloads/data/Income.đã phát hành.vn.20251101_20251122.xlsx');
    const sheetName = wb.SheetNames.find(n => n.toLowerCase().includes('doanh thu'));
    const sheet = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0, defval: '' });

    // Find header row
    const headerRowIdx = data.findIndex(row => row && row.includes('Mã đơn hàng'));
    const headers = data[headerRowIdx];

    // Columns of interest
    const targetCols = [
        'Mã ưu đãi do Người Bán chịu',
        'Mã hoàn xu do Người Bán chịu',
        'Phí vận chuyển trả hàng (đơn Trả hàng/hoàn tiền)',
        'Phí cố định',
        'Phí Dịch Vụ',
        'Phí thanh toán'
    ];

    const colIndices = {};
    targetCols.forEach(name => {
        const idx = headers.indexOf(name);
        if (idx !== -1) colIndices[name] = idx;
    });

    console.log('Found columns:', colIndices);

    let sampleRows = [];
    // Scan rows
    for (let i = headerRowIdx + 1; i < Math.min(data.length, headerRowIdx + 101); i++) {
        const row = data[i];
        let rowData = {};
        let hasInterestingData = false;

        for (const [name, idx] of Object.entries(colIndices)) {
            const val = parseFloat(row[idx]);
            if (val !== 0 && !isNaN(val)) {
                rowData[name] = val;
                if (name.includes('Mã ưu đãi') || name.includes('Mã hoàn xu') || name.includes('trả hàng')) {
                    hasInterestingData = true;
                }
            }
        }

        if (hasInterestingData && sampleRows.length < 5) {
            sampleRows.push({ row: i + 1, id: row[headers.indexOf('Mã đơn hàng')], data: rowData });
        }
    }

    console.log('Sample Shopee rows with Voucher/Coin/Return fees:');
    console.log(JSON.stringify(sampleRows, null, 2));
}

scanTikTok();
scanShopee();
