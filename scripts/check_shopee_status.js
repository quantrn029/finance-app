const XLSX = require('xlsx');

function checkShopeeStatus() {
    console.log('--- SHOPEE STATUS CHECK ---');
    const wb = XLSX.readFile('/Users/quantran/Downloads/data/Income.đã phát hành.vn.20251101_20251122.xlsx');
    const sheetName = wb.SheetNames.find(n => n.toLowerCase().includes('doanh thu'));
    const sheet = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0, defval: '' });

    const headerRowIdx = data.findIndex(row => row && row.includes('Mã đơn hàng'));
    const headers = data[headerRowIdx];

    const getIdx = (name) => headers.indexOf(name);
    const idxId = getIdx("Mã đơn hàng");
    const idxType = getIdx("Loại đơn hàng"); // Order Type
    const idxRefund = getIdx("Số tiền hoàn lại"); // Refund Amount
    const idxRevenue = getIdx("Tổng số tiền đơn hàng (sản phẩm)");
    const idxPayout = getIdx("Số tiền đã chuyển khoản");

    console.log("Headers found:", { idxId, idxType, idxRefund, idxRevenue, idxPayout });

    const targetIds = ['2511170X23P7T5', '251113NM37US5P', '251113M21BUFQN'];

    for (let i = headerRowIdx + 1; i < data.length; i++) {
        const row = data[i];
        const id = row[idxId];

        if (targetIds.includes(id)) {
            console.log(`Order ${id}: Type="${row[idxType]}", Refund=${row[idxRefund]}, Rev=${row[idxRevenue]}, Payout=${row[idxPayout]}`);
        }
    }
}

checkShopeeStatus();
