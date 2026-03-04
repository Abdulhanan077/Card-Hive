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

    console.log(`[ConfirmReceipt] Trade ID: ${tradeId}, Found Trade:`, trade?.id);

    if (!trade || trade.userId !== userId) {
        console.error(`[ConfirmReceipt] Unauthorized or not found. Trade userId: ${trade?.userId}, Session userId: ${userId}`);
        return { success: false, error: "Trade not found or unauthorized" };
    }

    if (trade.status !== "PAID") {
        console.error(`[ConfirmReceipt] Invalid status. Current status: ${trade.status}`);
        return { success: false, error: "Trade must be marked as PAID by admin before confirmation." };
    }

    console.log(`[ConfirmReceipt] Validation passed. Proceeding with update for trade ${trade.id}.`);

    // 1. Mark Trade as COMPLETED
    await prisma.trade.update({
        where: { id: trade.id },
        data: { status: "COMPLETED" }
    });

    revalidatePath("/user");
    revalidatePath("/user/trades");
    revalidatePath(`/user/trades/${tradeId}`);

    return { success: true };
}
