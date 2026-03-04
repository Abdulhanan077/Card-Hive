const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Mock dependencies and calculateVipTier logic exactly as in confirmTrade.ts
function calculateVipTier(completedTrades) {
    if (completedTrades >= 50) return { name: "Diamond", multiplier: 2.0 };
    if (completedTrades >= 20) return { name: "Platinum", multiplier: 1.5 };
    if (completedTrades >= 5) return { name: "Gold", multiplier: 1.25 };
    return { name: "Bronze", multiplier: 1.0 };
}

async function runTest() {
    console.log("Starting DB isolation test...");
    try {
        const tradeId = "GC-2026-000002";
        const trade = await prisma.trade.findUnique({
            where: { tradeId },
            include: { user: true }
        });

        console.log(`[ConfirmReceipt DB Test] Trade ID: ${tradeId}, Found Trade:`, trade?.id);

        if (!trade) {
            console.error(`[ConfirmReceipt DB Test] Trade not found`);
            return;
        }

        if (trade.status !== "PAID") {
            console.error(`[ConfirmReceipt DB Test] Invalid status. Current status: ${trade.status}`);
            return;
        }

        console.log(`[ConfirmReceipt DB Test] Validation passed. Proceeding with update...`);

        // 1. Mark Trade as COMPLETED
        await prisma.trade.update({
            where: { id: trade.id },
            data: { status: "COMPLETED" }
        });
        console.log(`[ConfirmReceipt DB Test] Marked trade as COMPLETED`);

        // 2. VIP Tier Points & Trader Bonus
        const newCompletedCount = (trade.user).completedTradesCount + 1;
        const vipTier = calculateVipTier(newCompletedCount);
        const traderBonus = 2 * vipTier.multiplier;

        await prisma.user.update({
            where: { id: trade.userId },
            data: {
                rewardBalance: { increment: traderBonus },
                completedTradesCount: { increment: 1 }
            }
        });
        console.log(`[ConfirmReceipt DB Test] User stats updated (Bonus: ${traderBonus}, Count: ${newCompletedCount})`);

        // 3. Referrer Bonus (+2 points)
        if ((trade.user).referredBy) {
            await prisma.user.update({
                where: { id: (trade.user).referredBy },
                data: { rewardBalance: { increment: 2 } }
            });
            console.log(`[ConfirmReceipt DB Test] Referrer bonus awarded.`);
        }

        console.log("[ConfirmReceipt DB Test] SUCCESS!");
    } catch (err) {
        console.error("Caught error:", err);
    } finally {
        await prisma.$disconnect();
    }
}

runTest();
