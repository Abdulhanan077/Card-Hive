import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const sessionId = searchParams.get("sessionId");

        if (!sessionId) {
            return NextResponse.json({ error: "Session ID required" }, { status: 400 });
        }

        const messages = await prisma.supportMessage.findMany({
            where: { sessionId },
            orderBy: { createdAt: "asc" }
        });

        return NextResponse.json({ success: true, messages });
    } catch (e: any) {
        console.error("SUPPORT_GET_ERROR:", e);
        return NextResponse.json({ error: "Failed to fetch messages", details: e.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { sessionId, content, senderName, userId } = body;

        if (!sessionId || !content) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        const message = await prisma.supportMessage.create({
            data: {
                sessionId,
                content,
                senderName: senderName || "Visitor",
                userId: userId ? parseInt(userId.toString()) : null,
                isAdmin: false
            }
        });

        // Notify Pusher for Admin Real-time view
        await pusherServer.trigger("admin-support", "new-message", {
            sessionId,
            message
        });

        // --- 🔔 RELIABLE ADMIN NOTIFICATIONS ---
        try {
            const admins = await prisma.user.findMany({
                where: { role: "ADMIN" },
                select: { id: true, fcmToken: true }
            });

            const notificationTitle = `New Support Message`;
            const notificationBody = senderName ? `From ${senderName}: ${content.substring(0, 50)}...` : `New message from a Guest: ${content.substring(0, 50)}...`;

            const { sendFcmNotification } = await import("@/lib/fcm");
            
            for (const admin of admins) {
                // 1. Send FCM Push Notification (if token exists)
                if (admin.fcmToken) {
                    await sendFcmNotification(admin.fcmToken, notificationTitle, notificationBody, {
                        type: 'SUPPORT_MESSAGE',
                        sessionId: sessionId
                    });
                }
            }
        } catch (notifErr) {
            console.error("Admin Notification Error (Support):", notifErr);
        }

        // Trigger for the specific session
        await pusherServer.trigger(`support-${sessionId}`, "new-message", message);

        return NextResponse.json({ success: true, message });
    } catch (e: any) {
        console.error("SUPPORT_POST_ERROR:", e);
        return NextResponse.json({ error: "Failed to send message", details: e.message }, { status: 500 });
    }
}
