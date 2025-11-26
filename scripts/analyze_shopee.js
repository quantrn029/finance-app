const XLSX = require('xlsx');

function analyzeShopeeCalculation() {
    console.log('--- SHOPEE CALCULATION ANALYSIS ---');
    const wb = XLSX.readFile('/Users/quantran/Downloads/data/Income.đã phát hành.vn.20251101_20251122.xlsx');
    const sheetName = wb.SheetNames.find(n => n.toLowerCase().includes('doanh thu'));
    const sheet = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0, defval: '' });

    // Find header row
    const headerRowIdx = data.findIndex(row => row && row.includes('Mã đơn hàng'));
    const headers = data[headerRowIdx];

    // Helper to get col index
    const getIdx = (name) => headers.indexOf(name);

    const idxRevenue = getIdx("Tổng số tiền đơn hàng (sản phẩm)"); // Gross Revenue?
    const idxPayout = getIdx("Số tiền đã chuyển khoản"); // Net Payout
    const idxShipping = getIdx("Phí vận chuyển trả bởi người mua"); // Shipping paid by buyer
    const idxShippingFee = getIdx("Phí vận chuyển thực tế"); // Actual shipping fee
    const idxShippingRebate = getIdx("Mã miễn phí vận chuyển"); // Shipping rebate

    // Fee columns
    const idxService = getIdx("Phí Dịch Vụ");
    const idxPayment = getIdx("Phí thanh toán");
    const idxFixed = getIdx("Phí cố định");
    const idxVoucher = getIdx("Mã ưu đãi do Người Bán chịu");

    console.log('Indices:', { idxRevenue, idxPayout, idxShipping, idxShippingFee, idxShippingRebate });

    let sampleRows = [];
    // Scan rows
    for (let i = headerRowIdx + 1; i < Math.min(data.length, headerRowIdx + 20); i++) {
        const row = data[i];

        const revenue = parseFloat(row[idxRevenue]) || 0;
        const payout = parseFloat(row[idxPayout]) || 0;
        // Shipping logic in parser: 
        // const shippingFee = Math.abs(parseCurrency(getCol("Phí vận chuyển thực tế"))) 
        //                   - Math.abs(parseCurrency(getCol("Phí vận chuyển trả bởi người mua")))
        const actualShip = parseFloat(row[idxShippingFee]) || 0;
        const buyerShip = parseFloat(row[idxShipping]) || 0;
        const shippingCalc = Math.abs(actualShip) - Math.abs(buyerShip);

        const calculatedFee = revenue - payout - shippingCalc;

        const explicitFee = (parseFloat(row[idxService]) || 0) +
            (parseFloat(row[idxPayment]) || 0) +
            (parseFloat(row[idxFixed]) || 0) +
            (parseFloat(row[idxVoucher]) || 0);

        sampleRows.push({
            id: row[getIdx('Mã đơn hàng')],
            revenue,
            payout,
            actualShip,
            buyerShip,
            shippingCalc,
            calculatedFee,
            explicitFee,
            diff: calculatedFee - explicitFee
        });
    }

    console.log('Sample Shopee Calculation Check:');
    console.log(JSON.stringify(sampleRows, null, 2));
}

analyzeShopeeCalculation();
