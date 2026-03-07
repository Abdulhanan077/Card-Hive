"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { sendTradeStatusUpdateEmail, sendPaymentSentEmail } from "@/lib/email";
import { calculateVipTier } from "@/lib/vipTiers";

import { postMessage } from "./chat";

export async function toggleCardStatusAction(
    tradeId: number,
    currentStatus: string,
    pageTradeId: string,
    proofUrl?: string,
    reason?: string
) {
    try {
        const newStatus = currentStatus === "REJECTED" ? "PENDING" : "REJECTED";

        const trade = await prisma.trade.update({
            where: { id: tradeId },
            data: { status: newStatus }
        });

        // If newly rejected, post proof to chat
        if (newStatus === "REJECTED" && proofUrl) {
            const messageContent = `🚫 CARD REJECTED\n-------------------\nCard: ${trade.cardBrand}\nValue: ${trade.faceValue} ${trade.currency}\nCode: ${trade.cardCode}\n${reason ? `Reason: ${reason}` : ""}`;

            // Fetch the parent workspace trade to attach the message there
            const workspaceTrade = await prisma.trade.findUnique({
                where: { tradeId: pageTradeId },
                select: { id: true }
            });

            if (workspaceTrade) {
                await postMessage(
                    workspaceTrade.id,
                    messageContent,
                    `/admin/trades/${pageTradeId}`,
                    proofUrl,
                    'IMAGE'
                );
            } else {
                await postMessage(
                    trade.id,
                    messageContent,
                    `/admin/trades/${pageTradeId}`,
                    proofUrl,
                    'IMAGE'
                );
            }
        }

        revalidatePath(`/admin/trades/${pageTradeId}`);
        revalidatePath(`/admin/trades`);
        return { success: true };
    } catch (error: any) {
        console.error("Toggle card status failed:", error);
        throw new Error(error.message || "Failed to toggle card status");
    }
}

export async function updateBatchStatusAction(formData: FormData, pageTradeId: string, fullName: string | null, tradeId: string) {
    try {
        const status = formData.get("status") as string;
        const paymentReference = formData.get("paymentReference") as string;
        const adminNotes = formData.get("adminNotes") as string;

        const data: any = { status, adminNotes };

        if (status === "PAID") {
            data.paymentReference = paymentReference;
            data.paidAt = new Date();
        }

        // 1. First, fetch the trades that WILL be updated (non-rejected ones)
        const isBatch = fullName && fullName.startsWith('BATCH-');

        const tradesToUpdate = await prisma.trade.findMany({
            where: {
                fullName: isBatch ? fullName : undefined,
                tradeId: isBatch ? undefined : tradeId,
                status: { not: "REJECTED" }
            } as any,
            include: { user: true }
        });

        if (tradesToUpdate.length === 0) {
            return { success: false, message: "No active trades to update (all may be rejected)." };
        }

        // 2. Perform the update
        await prisma.trade.updateMany({
            where: {
                fullName: isBatch ? fullName : undefined,
                tradeId: isBatch ? undefined : tradeId,
                status: { not: "REJECTED" }
            } as any,
            data
        });

        // 3. Status Email Notification
        const firstTrade = tradesToUpdate[0];
        if (firstTrade.user.emailNotificationsEnabled) {
            await sendTradeStatusUpdateEmail({ email: firstTrade.user.email, username: firstTrade.user.username }, tradesToUpdate, "UNKNOWN", status);
        }

        // 4. Special Handling for PAID status (Rewards + Extra Email)
        if (status === "PAID") {
            for (const t of tradesToUpdate) {
                const newCompletedCount = (t.user as any).completedTradesCount + 1;
                const vipTier = calculateVipTier(newCompletedCount);
                const traderBonus = 2 * vipTier.multiplier;

                await prisma.user.update({
                    where: { id: t.userId },
                    data: {
                        rewardBalance: { increment: traderBonus },
                        completedTradesCount: { increment: 1 }
                    }
                });

                if ((t.user as any).referredBy) {
                    await prisma.user.update({
                        where: { id: (t.user as any).referredBy },
                        data: { rewardBalance: { increment: 2 } }
                    });
                }
            }

            if (firstTrade.user.emailNotificationsEnabled) {
                await sendPaymentSentEmail({ email: firstTrade.user.email, username: firstTrade.user.username }, tradesToUpdate);
            }
        }

        revalidatePath(`/admin/trades/${pageTradeId}`);
        revalidatePath(`/admin/trades`);
        return { success: true };
    } catch (error: any) {
        console.error("Batch update failed:", error);
        throw new Error(error.message || "Failed to update batch status");
    }
}
