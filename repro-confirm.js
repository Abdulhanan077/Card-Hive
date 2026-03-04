
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testConfirm() {
    try {
        // 1. Find a PAID trade
        const trade = await prisma.trade.findFirst({
            where: { status: "PAID" },
            include: { user: true }
        });

        if (!trade) {
            console.log("No PAID trades found to test with. Creating one...");
            // Create a dummy trade for testing if none exist
            const user = await prisma.user.findFirst({ where: { role: "USER" } });
            if (!user) {
                console.log("No user found to create a trade for.");
                return;
            }
            const newTrade = await prisma.trade.create({
                data: {
                    tradeId: "TEST-CONFIRM-" + Math.floor(Math.random() * 1000),
                    status: "PAID",
                    userId: user.id,
                    cardBrand: "Test",
                    cardType: "Physical",
                    faceValue: 100,
                    currency: "USD",
                    payoutMethod: "MOBILE_MONEY",
                    payoutPhoneNumber: "123456"
                },
                include: { user: true }
            });
            console.log(`Created test trade: ${newTrade.tradeId}`);
            testConfirmWithTrade(newTrade);
        } else {
            testConfirmWithTrade(trade);
        }
    } catch (err) {
        console.error("FAILURE during initialization:", err);
    }
}

async function testConfirmWithTrade(trade) {
    try {
        console.log(`Testing with trade: ${trade.tradeId} (User: ${trade.user.username})`);

        // Simulate the action logic
        const userId = trade.userId;

        // 3. Mark Trade as COMPLETED
        console.log("Simulating: Mark Trade as COMPLETED");
        await prisma.trade.update({
            where: { id: trade.id },
            data: { status: "COMPLETED" }
        });
        console.log("Marked trade as COMPLETED");

        // 4. Update User stats
        console.log("Simulating: Update User stats");
        const newCompletedCount = (trade.user).completedTradesCount + 1;
        console.log(`New completed count would be: ${newCompletedCount}`);

        await prisma.user.update({
            where: { id: trade.userId },
            data: {
                rewardBalance: { increment: 2 },
                completedTradesCount: { increment: 1 }
            }
        });
        console.log("Updated user stats successfully");

        console.log("SUCCESS: Simulation complete.");
    } catch (err) {
        console.error("FAILURE during simulation:", err);
    } finally {
        await prisma.$disconnect();
    }
}

testConfirm();
