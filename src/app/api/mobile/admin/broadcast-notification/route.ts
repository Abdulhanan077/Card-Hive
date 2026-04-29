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
        const allUsers = await prisma.user.findMany({
            where: {
                fcmToken: { not: null },
                status: 'ACTIVE',
                id: { not: Number(admin.id) }
            },
            select: {
                id: true,
                username: true,
                fcmToken: true
            }
        });

        // Deduplicate tokens (keep only one user per unique token)
        const uniqueTokensMap = new Map();
        for (const u of allUsers) {
            if (u.fcmToken) {
                uniqueTokensMap.set(u.fcmToken, u);
            }
        }
        
        const tokens = Array.from(uniqueTokensMap.keys());
        const targetUsers = Array.from(uniqueTokensMap.values());

        console.log(`FCM: Unique tokens found: ${tokens.length} (Total in DB: ${allUsers.length})`);
        console.log(`FCM: Target Usernames:`, targetUsers.map(u => u.username));

        if (tokens.length === 0) {
            return NextResponse.json({ 
                success: false, 
                error: "No active users with registered devices found." 
            });
        }

        // 2. Send the multicast notification
        const fcmTitle = title || "Notification from Admin";
        console.log(`Broadcasting to ${tokens.length} tokens:`, tokens);
        
        const response = await sendFcmToAllUsers(tokens, fcmTitle, message, {
            type: 'broadcast',
            senderId: String(admin.id)
        });

        const successUsernames = [];
        const failUsernames = [];
        
        if (response && response.responses) {
            for (let i = 0; i < response.responses.length; i++) {
                const res = response.responses[i];
                const username = targetUsers[i].username;
                
                if (res.success) {
                    successUsernames.push(username);
                } else {
                    failUsernames.push(username);
                    const errorCode = res.error?.code || 'unknown';
                    const errorMessage = res.error?.message || '';
                    
                    // Cleanup any "not found" or invalid token errors
                    if (errorCode.includes('not-registered') || 
                        errorCode.includes('invalid-registration-token') ||
                        errorMessage.toLowerCase().includes('not found')) {
                        await prisma.user.updateMany({
                            where: { fcmToken: tokens[i] },
                            data: { fcmToken: null }
                        });
                    }
                }
            }
        }

        console.log(`FCM Successes for:`, successUsernames);
        console.log(`FCM Failures for:`, failUsernames);

        return NextResponse.json({ 
            success: true, 
            message: `Success: ${response?.successCount || 0}, Fail: ${response?.failureCount || 0}`,
            debug: {
                total: tokens.length,
                success: response?.successCount,
                failure: response?.failureCount,
                successUsers: successUsernames,
                failUsers: failUsernames
            }
        });

    } catch (error) {
        console.error("Admin Broadcast Notification API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
