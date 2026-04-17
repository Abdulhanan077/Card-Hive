import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/mobileAuth";
import { calculateVipTier } from "@/lib/vipTiers";
import { sendTradeStatusUpdateEmail, sendPaymentSentEmail } from "@/lib/email";
import { sendFcmNotification } from "@/lib/fcm";

export async function POST(request: Request) {
    try {
        const token = request.headers.get("Authorization")?.split(" ")[1];

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const admin = await verifyMobileToken(token);
        if (!admin || admin.role !== 'ADMIN') {
            return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
        }

        const body = await request.json();
        const { tradeId, status, adminNotes, paymentReference, paymentReceiptUrl } = body;

        if (!tradeId || !status) {
            return NextResponse.json({ error: "Trade ID and Status are required" }, { status: 400 });
        }

        // Fetch the trade first to handle batch and user data
        const targetTrade = await prisma.trade.findUnique({
            where: { tradeId: tradeId },
            include: { user: true }
        });

        if (!targetTrade) {
            return NextResponse.json({ error: "Trade not found" }, { status: 404 });
        }

        const isBatch = targetTrade.fullName && targetTrade.fullName.startsWith('BATCH-');
        const updateData: any = { 
            status, 
            adminNotes: adminNotes !== undefined ? adminNotes : targetTrade.adminNotes
        };

        // Only update paymentReceiptUrl if provided, otherwise keep existing
        if (paymentReceiptUrl) {
            updateData.paymentReceiptUrl = paymentReceiptUrl;
        }

        if (status === "PAID") {
            updateData.paymentReference = paymentReference || targetTrade.paymentReference || `MOB-${Date.now()}`;
            updateData.paidAt = targetTrade.paidAt || new Date();
        }

        // Perform the update on all related trades (the batch)
        const tradesToUpdate = await prisma.trade.findMany({
            where: {
                fullName: isBatch ? targetTrade.fullName : undefined,
                tradeId: isBatch ? undefined : tradeId,
            } as any,
            include: { user: true }
        });

        if (tradesToUpdate.length === 0) {
            return NextResponse.json({ error: "No trades found for this ID/Batch" }, { status: 404 });
        }

        await prisma.trade.updateMany({
            where: {
                fullName: isBatch ? targetTrade.fullName : undefined,
                tradeId: isBatch ? undefined : tradeId,
            } as any,
            data: updateData
        });

        // Rewards logic (mirrors AdminTradeActions)
        if (status === "PAID") {
            const user = targetTrade.user;
            const alreadyPaid = targetTrade.status === "PAID";

            if (!alreadyPaid) {
                const countIncrement = tradesToUpdate.length;
                let bonusSum = 0;
                
                for (let i = 1; i <= countIncrement; i++) {
                    const projectedCount = user.completedTradesCount + i;
                    const vipTier = calculateVipTier(projectedCount);
                    bonusSum += (2 * vipTier.multiplier);
                }

                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        rewardBalance: { increment: bonusSum },
                        completedTradesCount: { increment: countIncrement }
                    }
                });

                // Referrer rewards
                if (user.referredBy) {
                    await prisma.user.update({
                        where: { id: user.referredBy },
                        data: { rewardBalance: { increment: 2 * countIncrement } }
                    });
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { referralPointsEarned: { increment: 2 * countIncrement } }
                    });
                }
                
                const { checkAndAwardMilestones } = await import("@/lib/leaderboard-actions");
                await checkAndAwardMilestones(user.id);
            }
        }

        // --- FCM Push Notification ---
        if (targetTrade.user.fcmToken) {
            try {
                const title = `Trade ${status}`;
                const body = `Your ${targetTrade.cardBrand} trade (${targetTrade.tradeId}) is now ${status}.`;
                await sendFcmNotification(targetTrade.user.fcmToken, title, body, {
                    type: 'STATUS_UPDATE',
                    tradeId: targetTrade.id.toString(),
                });
            } catch (fcmErr) {
                console.error("FCM Send Error (Admin Status):", fcmErr);
            }
        }

        // Email Notifications
        try {
            if (targetTrade.user.emailNotificationsEnabled) {
                await sendTradeStatusUpdateEmail({ email: targetTrade.user.email, username: targetTrade.user.username }, tradesToUpdate, "UNKNOWN", status);
                if (status === "PAID") {
                    await sendPaymentSentEmail({ email: targetTrade.user.email, username: targetTrade.user.username }, tradesToUpdate);
                }
            }
        } catch (emailErr) {
            console.error("Admin Mobile API: Post-update email failed", emailErr);
        }

        return NextResponse.json({ success: true, message: `Trade ${tradeId} updated to ${status}` });

    } catch (error) {
        console.error("Admin Mobile Status Update Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
