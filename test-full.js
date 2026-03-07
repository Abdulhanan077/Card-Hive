const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    const trades = await prisma.trade.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5
    });
    trades.forEach(t => {
        console.log(`ID: ${t.id}, TradeID: ${t.tradeId}, fullName: ${t.fullName}`);
    });
}

test().catch(console.error).finally(() => prisma.$disconnect());
