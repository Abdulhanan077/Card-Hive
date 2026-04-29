import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/mobileAuth";
import { sendFcmToAllUsers } from "@/lib/fcm";

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
        const { title, message } = body;

        if (!message) {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        // 1. Fetch all users who have an FCM token, EXCLUDING the current admin
        const users = await prisma.user.findMany({
            where: {
                fcmToken: {
                    not: null
                },
                status: 'ACTIVE',
                id: {
                    not: admin.id // Exclude the person sending the broadcast
                }
            },
            select: {
                fcmToken: true
            }
        });

        const tokens = users.map(u => u.fcmToken as string);

        if (tokens.length === 0) {
            return NextResponse.json({ 
                success: false, 
                error: "No active users with registered devices found." 
            });
        }

        // 2. Send the multicast notification
        const fcmTitle = title || "Notification from Admin";
        await sendFcmToAllUsers(tokens, fcmTitle, message);

        return NextResponse.json({ 
            success: true, 
            message: `Successfully sent broadcast to ${tokens.length} users.` 
        });

    } catch (error) {
        console.error("Admin Broadcast Notification API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
