const XLSX = require('xlsx');

function scanTikTok() {
    console.log('--- TIKTOK ANALYSIS ---');
    try {
        console.log('Reading TikTok file...');
        const wb = XLSX.readFile('/Users/quantran/Downloads/data/income_20251121123001(UTC+7).xlsx');
        console.log('File read. Sheets:', wb.SheetNames);

        const sheet = wb.Sheets['Order details'];
        if (!sheet) {
            console.log('ERROR: "Order details" sheet not found!');
            return;
        }

        console.log('Parsing Order details...');
        // Limit to 200 rows to avoid memory issues
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0, defval: '', limit: 200 });
        console.log(`Parsed ${data.length} rows.`);

        const headers = data[0];

        // Identify fee columns
        const feeCols = headers.map((h, i) => ({ name: h, index: i })).filter(c =>
            c && (
                c.name.toLowerCase().includes('fee') ||
                c.name.toLowerCase().includes('commission') ||
                c.name.toLowerCase().includes('tax') ||
                c.name.toLowerCase().includes('discount')
            )
        );

        console.log('Fee Columns found:', feeCols.map(c => c.name));

        let nonZeroCount = 0;
        let sampleRows = [];

        // Scan rows
        for (let i = 1; i < data.length; i++) {
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
                if (sampleRows.length < 5) {
                    sampleRows.push({ row: i + 1, fees: rowFees });
                }
            }
        }

        console.log(`Found ${nonZeroCount} rows with non-zero fees in scanned rows.`);
        if (sampleRows.length > 0) {
            console.log('Sample Data (Non-zero fees):');
            console.log(JSON.stringify(sampleRows, null, 2));
        } else {
            console.log('WARNING: All fee columns are 0 in the scanned rows!');
        }
    } catch (e) {
        console.error('Error scanning TikTok:', e.message);
    }
}

function scanShopee() {
    console.log('\n--- SHOPEE ANALYSIS ---');
    try {
        console.log('Reading Shopee file...');
        const wb = XLSX.readFile('/Users/quantran/Downloads/data/Income.đã phát hành.vn.20251101_20251122.xlsx');
        console.log('File read. Sheets:', wb.SheetNames);

        const sheetName = wb.SheetNames.find(n => n.toLowerCase().includes('doanh thu'));
        if (!sheetName) {
            console.log('ERROR: "Doanh thu" sheet not found!');
            return;
        }

        const sheet = wb.Sheets[sheetName];
        console.log('Parsing Doanh thu sheet...');
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0, defval: '', limit: 200 });
        console.log(`Parsed ${data.length} rows.`);

        // Find header row
        const headerRowIdx = data.findIndex(row => row && row.includes('Mã đơn hàng'));
        if (headerRowIdx === -1) {
            console.log('ERROR: Header row not found!');
            return;
        }

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
        for (let i = headerRowIdx + 1; i < data.length; i++) {
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
    } catch (e) {
        console.error('Error scanning Shopee:', e.message);
    }
}

scanTikTok();
scanShopee();
