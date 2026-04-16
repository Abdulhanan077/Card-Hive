import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/mobileAuth";

export async function POST(request: Request) {
    try {
        const token = request.headers.get("Authorization")?.split(" ")[1];

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await verifyMobileToken(token);
        if (!user) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        const userId = typeof user.id === 'string' ? parseInt(user.id) : user.id;

        // Mark all unread messages for this user's trades (where they are not the sender)
        await prisma.message.updateMany({
            where: {
                trade: { userId: userId },
                senderId: { not: userId },
                isRead: false
            },
            data: {
                isRead: true,
                readAt: new Date()
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Mobile Notifications Read All Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
