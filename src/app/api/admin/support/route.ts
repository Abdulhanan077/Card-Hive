import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pusherServer } from "@/lib/pusher";

// Fetch all support sessions
export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Group by sessionId to get distinct chat sessions
    const sessions = await prisma.supportMessage.findMany({
        distinct: ['sessionId'],
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { username: true, email: true } } }
    });

    return NextResponse.json({ sessions });
}

// Admin Reply
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId, content } = await request.json();
    if (!sessionId || !content) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const message = await prisma.supportMessage.create({
        data: {
            sessionId,
            content,
            isAdmin: true,
            isRead: true, // Admin's own message is read
        }
    });

    // Notify the user in real-time
    await pusherServer.trigger(`support-${sessionId}`, "new-message", message);

    // Send push notification to the user
    try {
        const user = await prisma.user.findUnique({
            where: { id: parseInt(sessionId) },
            select: { fcmToken: true }
        });

        if (user?.fcmToken) {
            const { sendFcmNotification } = await import("@/lib/fcm");
            await sendFcmNotification(
                user.fcmToken,
                "New Support Message 💬",
                content.length > 50 ? content.substring(0, 47) + "..." : content,
                { type: 'SUPPORT_MESSAGE', sessionId: sessionId.toString() }
            );
        }
    } catch (fcmErr) {
        console.error("FCM Support Message Error:", fcmErr);
    }

    return NextResponse.json({ success: true, message });
}
