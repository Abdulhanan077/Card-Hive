"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { sendTradeStatusUpdateEmail, sendPaymentSentEmail, sendItemRejectionEmail } from "@/lib/email";
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
        console.log(`[toggleCardStatusAction] tradeId=${tradeId}, currentStatus=${currentStatus}, pageTradeId=${pageTradeId}`);
        const newStatus = currentStatus === "REJECTED" ? "PENDING" : "REJECTED";

        const trade = await prisma.trade.update({
            where: { id: tradeId },
            data: { 
                status: newStatus,
                adminNotes: newStatus === "REJECTED" ? (reason || null) : null
            },
            include: { user: true }
        });
        console.log(`[toggleCardStatusAction] status updated to ${newStatus}`);

        // If newly rejected, post proof to chat
        if (newStatus === "REJECTED" && proofUrl) {
            console.log(`[toggleCardStatusAction] posting rejection proof to chat...`);
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
            console.log(`[toggleCardStatusAction] message posted`);
        }

        // Automatic Rejection Email
        if (newStatus === "REJECTED" && trade.user.emailNotificationsEnabled) {
            console.log(`[toggleCardStatusAction] sending rejection email...`);
            const isBatch = trade.fullName && trade.fullName.startsWith('BATCH-');
            
            const batchTrades = await prisma.trade.findMany({
                where: {
                    fullName: isBatch ? trade.fullName : undefined,
                    tradeId: isBatch ? undefined : trade.tradeId,
                } as any
            });

            await sendItemRejectionEmail(trade.user, trade, batchTrades);
        }

        revalidatePath(`/admin/trades/${pageTradeId}`);
        revalidatePath(`/admin/trades`);
        return { success: true };
    } catch (error: any) {
        console.error("Toggle card status failed details:", error);
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

        // NEW: FCM Notification for Status Change
        try {
            const { sendFcmNotification } = await import("@/lib/fcm");
            // Group by user since a batch update usually affects one user
            const distinctUsers = Array.from(new Set(tradesToUpdate.map(t => t.user)));
            for (const user of distinctUsers) {
                if (user.fcmToken) {
                    const title = `Trade ${status.replaceAll('_', ' ')}`;
                    const body = `Your trade (${firstTrade.tradeId}${tradesToUpdate.length > 1 ? ' and others' : ''}) is now ${status.replaceAll('_', ' ')}.`;
                    await sendFcmNotification(user.fcmToken, title, body, {
                        type: 'STATUS_UPDATE',
                        tradeId: firstTrade.id.toString(),
                    });
                }
            }
        } catch (fcmErr) {
            console.error("FCM Status Update Error:", fcmErr);
        }

        // 4. Special Handling for PAID status (Rewards + Extra Email)
        if (status === "PAID") {
            // Group newly paid trades by user to update each user once
            const usersToUpdate = new Map<number, { 
                bonusSum: number, 
                countIncrement: number, 
                referrerId: number | null, 
                userObj: any 
            }>();

            for (const t of tradesToUpdate) {
                // IMPORTANT: Only reward if the trade wasn't already PAID
                if (t.status === "PAID") continue;

                const userId = t.userId;
                if (!usersToUpdate.has(userId)) {
                    usersToUpdate.set(userId, { 
                        bonusSum: 0, 
                        countIncrement: 0, 
                        referrerId: (t.user as any).referredBy || null,
                        userObj: t.user 
                    });
                }
                
                const stats = usersToUpdate.get(userId)!;
                stats.countIncrement += 1;
                
                // Calculate bonus based on projected tier for this specific trade in the sequence
                const projectedCount = stats.userObj.completedTradesCount + stats.countIncrement;
                const vipTier = calculateVipTier(projectedCount);
                stats.bonusSum += (2 * vipTier.multiplier);
            }

            // Execute batched updates
            for (const [userId, stats] of usersToUpdate) {
                if (stats.countIncrement > 0) {
                    await prisma.user.update({
                        where: { id: userId },
                        data: {
                            rewardBalance: { increment: stats.bonusSum },
                            completedTradesCount: { increment: stats.countIncrement }
                        }
                    });

                    // Reward Referrer (if applicable) - Fixed 2 points per trade for now
                    if (stats.referrerId) {
                        await prisma.user.update({
                            where: { id: stats.referrerId },
                            data: { rewardBalance: { increment: 2 * stats.countIncrement } }
                        });
                        await prisma.user.update({
                            where: { id: userId }, // The Referee (trader)
                            data: { referralPointsEarned: { increment: 2 * stats.countIncrement } }
                        });
                    }

                    // 5. Check for Leaderboard Milestones (Automatic Payout)
                    const { checkAndAwardMilestones } = await import("@/lib/leaderboard-actions");
                    await checkAndAwardMilestones(userId);
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
