import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/mobileAuth";

export async function GET(request: Request) {
    try {
        const token = request.headers.get("Authorization")?.split(" ")[1];

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const admin = await verifyMobileToken(token);
        if (!admin || admin.role !== 'ADMIN') {
            return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
        }

        // 1. New Pending Trades (Last 48 hours)
        const fortyEightHoursAgo = new Date();
        fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);

        const pendingTrades = await prisma.trade.findMany({
            where: {
                status: 'PENDING',
                createdAt: { gte: fortyEightHoursAgo }
            },
            include: { user: { select: { username: true } } },
            orderBy: { createdAt: 'desc' },
            take: 15
        });

        // 2. Unread Messages from Users
        const unreadMessages = await prisma.message.findMany({
            where: {
                isRead: false,
                sender: { role: 'USER' }
            },
            include: {
                sender: { select: { username: true } },
                trade: { select: { tradeId: true, id: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 15
        });

        // 3. New Redemption Requests (PENDING)
        const pendingRedemptions = await prisma.rewardRedemption.findMany({
            where: { status: 'PENDING' },
            include: { user: { select: { username: true } } },
            orderBy: { createdAt: 'desc' },
            take: 10
        });

        const notifications = [
            ...pendingTrades.map(t => ({
                id: `trade-${t.id}`,
                type: 'TRADE_PENDING',
                title: 'New Trade Submission',
                body: `${t.user.username} submitted a ${t.cardBrand} trade (${t.tradeId}).`,
                time: t.createdAt,
                data: { tradeId: t.id.toString(), route: 'TRADE' }
            })),
            ...unreadMessages.map(m => ({
                id: `msg-${m.id}`,
                type: 'MESSAGE',
                title: `Message: ${m.sender.username}`,
                body: m.content ? (m.content.length > 80 ? m.content.substring(0, 77) + "..." : m.content) : "📷 Sent an attachment",
                time: m.createdAt,
                data: { tradeId: m.trade.id.toString(), route: 'CHAT' }
            })),
            ...pendingRedemptions.map(r => ({
                id: `redemption-${r.id}`,
                type: 'REDEMPTION',
                title: 'Points Redemption Request',
                body: `${r.user.username} requested to redeem ${r.pointsRedeemed} points via ${r.payoutMethod ?? 'MTN'}.`,
                time: r.createdAt,
                data: { redemptionId: r.id.toString(), route: 'REDEMPTION' }
            }))
        ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

        return NextResponse.json({ 
            success: true, 
            notifications,
            unreadCount: notifications.length // In admin case, we count all these "action items"
        });

    } catch (error) {
        console.error("Admin Mobile Notifications Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
