const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    const trade = await prisma.trade.findFirst({
        orderBy: { createdAt: 'desc' }
    });
    console.log("Latest trade id:", trade.id, "batchId:", trade.batchId, "fullName:", trade.fullName);
}

test().catch(console.error).finally(() => prisma.$disconnect());
