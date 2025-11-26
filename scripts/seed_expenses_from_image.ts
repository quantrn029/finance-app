import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const expenses = [
        {
            date: new Date('2025-11-15'),
            type: 'Ads',
            category: 'Ads',
            subcategory: 'Quảng cáo TikTok',
            amount: 22000000,
            note: 'Chi phí quảng cáo TikTok tháng 11'
        },
        {
            date: new Date('2025-11-15'),
            type: 'Materials',
            category: 'Materials',
            subcategory: 'Vật liệu đóng gói',
            amount: 7322700,
            note: 'Mua vật liệu đóng gói'
        },
        {
            date: new Date('2025-11-15'),
            type: 'Materials',
            category: 'Materials',
            subcategory: 'Kim loại bạc',
            amount: 6490514,
            note: 'Nhập kim loại bạc'
        },
        {
            date: new Date('2025-11-15'),
            type: 'Materials',
            category: 'Materials',
            subcategory: 'Charm mắt',
            amount: 1649000,
            note: 'Nhập Charm mắt'
        },
        {
            date: new Date('2025-11-15'),
            type: 'Operating',
            category: 'Operating',
            subcategory: 'Phí ship',
            amount: 267398,
            note: 'Phí vận chuyển ngoài'
        },
        {
            date: new Date('2025-11-15'),
            type: 'Operating',
            category: 'Operating',
            subcategory: 'Phát sinh khác',
            amount: 7000,
            note: 'Chi phí phát sinh nhỏ'
        }
    ];

    console.log('Seeding expenses...');

    for (const expense of expenses) {
        await prisma.expense.create({
            data: expense
        });
        console.log(`Created expense: ${expense.subcategory} - ${expense.amount}`);
    }

    console.log('Done!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
