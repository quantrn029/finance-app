const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function exportData() {
    try {
        console.log('🔄 Starting data export...');

        const data = {
            products: await prisma.product.findMany(),
            productSKUs: await prisma.productSKU.findMany(),
            orders: await prisma.order.findMany(),
            orderItems: await prisma.orderItem.findMany(),
            expenses: await prisma.expense.findMany(),
            cashFlows: await prisma.cashFlow.findMany(),
            goals: await prisma.goal.findMany(),
            goalDetails: await prisma.goalDetail.findMany(),
        };

        const exportPath = path.join(__dirname, '../data-export.json');
        fs.writeFileSync(exportPath, JSON.stringify(data, null, 2));

        console.log(`✅ Data exported successfully to ${exportPath}`);

        // Log counts
        Object.entries(data).forEach(([model, items]) => {
            console.log(`   - ${model}: ${items.length} records`);
        });

    } catch (error) {
        console.error('❌ Export failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

exportData();
