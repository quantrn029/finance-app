const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function importData() {
    try {
        const importPath = path.join(__dirname, '../data-export.json');

        if (!fs.existsSync(importPath)) {
            console.error('❌ No export file found at', importPath);
            process.exit(1);
        }

        console.log('🔄 Starting data import...');
        const data = JSON.parse(fs.readFileSync(importPath, 'utf8'));

        // Import in order of dependencies

        // 1. Products
        if (data.products?.length) {
            console.log(`   Importing ${data.products.length} products...`);
            for (const item of data.products) {
                await prisma.product.upsert({
                    where: { id: item.id },
                    update: item,
                    create: item
                });
            }
        }

        // 2. Product SKUs
        if (data.productSKUs?.length) {
            console.log(`   Importing ${data.productSKUs.length} product SKUs...`);
            for (const item of data.productSKUs) {
                await prisma.productSKU.upsert({
                    where: { id: item.id },
                    update: item,
                    create: item
                });
            }
        }

        // 3. Orders
        if (data.orders?.length) {
            console.log(`   Importing ${data.orders.length} orders...`);
            for (const item of data.orders) {
                await prisma.order.upsert({
                    where: { id: item.id },
                    update: item,
                    create: item
                });
            }
        }

        // 4. Order Items
        if (data.orderItems?.length) {
            console.log(`   Importing ${data.orderItems.length} order items...`);
            for (const item of data.orderItems) {
                await prisma.orderItem.upsert({
                    where: { id: item.id },
                    update: item,
                    create: item
                });
            }
        }

        // 5. Expenses
        if (data.expenses?.length) {
            console.log(`   Importing ${data.expenses.length} expenses...`);
            for (const item of data.expenses) {
                await prisma.expense.upsert({
                    where: { id: item.id },
                    update: item,
                    create: item
                });
            }
        }

        // 6. Cash Flows
        if (data.cashFlows?.length) {
            console.log(`   Importing ${data.cashFlows.length} cash flows...`);
            for (const item of data.cashFlows) {
                await prisma.cashFlow.upsert({
                    where: { id: item.id },
                    update: item,
                    create: item
                });
            }
        }

        // 7. Goals
        if (data.goals?.length) {
            console.log(`   Importing ${data.goals.length} goals...`);
            for (const item of data.goals) {
                await prisma.goal.upsert({
                    where: { id: item.id },
                    update: item,
                    create: item
                });
            }
        }

        // 8. Goal Details
        if (data.goalDetails?.length) {
            console.log(`   Importing ${data.goalDetails.length} goal details...`);
            for (const item of data.goalDetails) {
                await prisma.goalDetail.upsert({
                    where: { id: item.id },
                    update: item,
                    create: item
                });
            }
        }

        console.log('✅ Data imported successfully!');

    } catch (error) {
        console.error('❌ Import failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

importData();
