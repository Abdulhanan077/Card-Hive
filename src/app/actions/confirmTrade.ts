"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { calculateVipTier } from "@/lib/vipTiers";

export async function confirmTradePayment(tradeId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return { success: false, error: "Unauthorized" };
    }

    const userId = parseInt(session.user.id);

    const trade = await prisma.trade.findUnique({
        where: { tradeId },
        include: { user: true }
    });

    if (!trade || trade.userId !== userId) {
        return { success: false, error: "Trade not found or unauthorized" };
    }

    if (trade.status !== "PAID") {
        return { success: false, error: "Trade must be marked as PAID by admin before confirmation." };
    }

    // 1. Mark Trade as COMPLETED
    await prisma.trade.update({
        where: { id: trade.id },
        data: { status: "COMPLETED" }
    });

    /* --- REWARD SYSTEM LOGIC TRIGGERED ON CONFIRMATION --- */

    // 2. VIP Tier Points
    const newCompletedCount = (trade.user as any).completedTradesCount + 1;
    const vipTier = calculateVipTier(newCompletedCount);
    const earnedPoints = 1 * vipTier.multiplier;

    await prisma.user.update({
        where: { id: trade.userId },
        data: {
            rewardBalance: { increment: earnedPoints },
            completedTradesCount: { increment: 1 }
        }
    });

    // 3. Referral Bonus (First successful trade check)
    const completedTradesCount = await prisma.trade.count({
        where: { userId: trade.userId, status: "COMPLETED", id: { not: trade.id } }
    });

    if (completedTradesCount === 0 && (trade.user as any).referredBy) {
        const settings = await prisma.settings.findFirst();
        const percentage = settings?.referralBonusPercentage || 1.5;
        const bonusPoints = (trade.calculatedPayout || trade.faceValue) * (percentage / 100);

        await prisma.user.update({
            where: { id: (trade.user as any).referredBy },
            data: { rewardBalance: { increment: bonusPoints } }
        });
    }

    revalidatePath("/user");
    revalidatePath("/user/trades");
    revalidatePath(`/user/trades/${tradeId}`);

    return { success: true };
}
