import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/mobileAuth";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const token = request.headers.get("Authorization")?.split(" ")[1];

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await verifyMobileToken(token);
        if (!user) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        // Mirrors src/app/actions/user-notifications.ts exactly
        const userId = parseInt(user.id);

        // 1. Get ALL unread messages for trades belonging to this user
        const unreadMessages = await prisma.message.findMany({
            where: {
                isRead: false,
                sender: {
                    role: "ADMIN"
                },
                trade: {
                    userId: userId
                }
            },
            include: {
                sender: {
                    select: { username: true }
                },
                trade: {
                    select: { tradeId: true, cardBrand: true, id: true }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 20
        });

        // 2. Get recent trade status changes (last 24h)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        // We fetch the user to check when they last "cleared" their status updates
        const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { lastLoginAt: true, updatedAt: true } // Using updatedAt or a custom field if we had one
        });

        const statusUpdates = await prisma.trade.findMany({
            where: {
                userId: userId,
                updatedAt: { gte: yesterday },
                status: { in: ['PAID', 'REJECTED', 'UNDER_REVIEW'] }
            },
            orderBy: { updatedAt: 'desc' },
            select: {
                id: true,
                tradeId: true,
                status: true,
                cardBrand: true,
                updatedAt: true
            }
        });

        const notifications = [
            ...unreadMessages.map(m => ({
                id: `msg-${m.id}`,
                type: 'MESSAGE',
                title: `Admin: ${m.trade.tradeId}`,
                body: m.content ? (m.content.length > 100 ? m.content.substring(0, 97) + "..." : m.content) : (m.fileType === 'IMAGE' ? "📷 Sent a photo" : "📎 Sent an attachment"),
                time: m.createdAt,
                data: { tradeId: m.trade.id.toString() }
            })),
            ...statusUpdates.map(s => {
                const displayStatus = s.status === 'UNDER_REVIEW' ? 'Processing...' : s.status.replaceAll('_', ' ');
                return ({
                    id: `status-${s.id}-${s.status}`,
                    type: 'STATUS',
                    title: `Trade ${displayStatus}`,
                    body: `Your ${s.cardBrand} trade (${s.tradeId}) is now ${displayStatus}.`,
                    time: s.updatedAt,
                    data: { tradeId: s.id.toString() }
                });
            })
        ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

        return NextResponse.json({ 
            notifications,
            debug: { userId, unreadMsgs: unreadMessages.length }
        });
    } catch (error) {
        console.error("Mobile Notifications Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
