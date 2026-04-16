import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pusherServer } from "@/lib/pusher";
import { sendFcmNotification } from "@/lib/fcm";

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const tradeId = parseInt((await props.params).id);

        const messages = await prisma.message.findMany({
            where: { tradeId },
            include: {
                sender: {
                    select: { id: true, username: true, role: true }
                }
            },
            orderBy: { createdAt: "asc" }
        });

        return NextResponse.json({ success: true, messages });
    } catch (error) {
        console.error("Mobile Chat Fetch Error:", error);
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const senderId = parseInt(session.user.id);
        const { content, fileUrl, fileType } = await request.json();
        const tradeId = parseInt((await props.params).id);

        if ((!content || content.trim() === "") && !fileUrl) {
            return NextResponse.json({ success: false, error: "Message content or file is required" }, { status: 400 });
        }

        // Use raw SQL to handle potential schema mismatches with Prisma Client
        const newMessageResult = await prisma.$queryRaw<any[]>`
            INSERT INTO "Message" ("tradeId", "senderId", "content", "fileUrl", "fileType", "isRead", "createdAt")
            VALUES (${tradeId}, ${senderId}, ${content || ""}, ${fileUrl || null}, ${fileType || null}, false, NOW())
            RETURNING id AS id, "tradeId" AS "tradeId", "senderId" AS "senderId", content AS content, "isRead" AS "isRead", "readAt" AS "readAt", "fileUrl" AS "fileUrl", "fileType" AS "fileType", "createdAt" AS "createdAt"
        `;

        if (!newMessageResult || newMessageResult.length === 0) {
            throw new Error("Failed to create message via raw SQL");
        }

        const rawMsg = newMessageResult[0];
        const message: any = {
            id: rawMsg.id,
            tradeId: rawMsg.tradeId,
            senderId: rawMsg.senderId,
            content: rawMsg.content || "",
            isRead: Boolean(rawMsg.isRead),
            readAt: rawMsg.readAt ? new Date(rawMsg.readAt) : null,
            fileUrl: rawMsg.fileUrl || null,
            fileType: rawMsg.fileType || null,
            createdAt: new Date(rawMsg.createdAt)
        };

        // Fetch sender separately
        message.sender = await prisma.user.findUnique({
            where: { id: senderId },
            select: { id: true, username: true, role: true }
        });

        // Trigger Pusher for real-time
        await pusherServer.trigger(`trade-${tradeId}`, "new-message", message);

        // --- FCM Push Notification ---
        try {
            const trade = await prisma.trade.findUnique({
                where: { id: tradeId },
                include: { user: true }
            });

            if (trade) {
                const isFromAdmin = message.sender.role === 'ADMIN';
                if (isFromAdmin) {
                    // Send notification to the user
                    if (trade.user.fcmToken) {
                        await sendFcmNotification(
                            trade.user.fcmToken,
                            "New Message",
                            `${message.sender.username}: ${message.content || 'Sent a file'}`,
                            { type: 'CHAT_MESSAGE', tradeId: tradeId.toString() }
                        );
                    }
                } else {
                    // Send notification to all admins with tokens
                    const admins = await prisma.user.findMany({
                        where: { role: 'ADMIN', fcmToken: { not: null } },
                        select: { fcmToken: true }
                    });
                    
                    for (const admin of admins) {
                        if (admin.fcmToken) {
                            await sendFcmNotification(
                                admin.fcmToken,
                                "User Message",
                                `${message.sender.username} (${trade.tradeId}): ${message.content || 'Sent a file'}`,
                                { type: 'CHAT_MESSAGE', tradeId: tradeId.toString() }
                            );
                        }
                    }
                }
            }
        } catch (fcmErr) {
            console.error("FCM Send Error (Chat):", fcmErr);
        }

        return NextResponse.json({ success: true, message });
    } catch (error) {
        console.error("Mobile Chat Send Error:", error);
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
}
