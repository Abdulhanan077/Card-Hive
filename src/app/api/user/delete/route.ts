import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { decode } from "next-auth/jwt";

/**
 * Universal Account Deletion API
 * Supports Web (Sessions) and Mobile (JWT Cookie)
 */
export async function POST(req: Request) {
    try {
        let userId: number | null = null;

        // 1. Try Session-based Auth (Web)
        const session = await getServerSession(authOptions);
        if (session?.user?.id) {
            userId = parseInt(session.user.id);
        }

        // 2. Try Cookie-based Auth (Mobile Fallback)
        if (!userId) {
            const authHeader = req.headers.get("Cookie");
            const tokenStr = authHeader?.split("next-auth.session-token=")[1]?.split(";")[0];
            
            if (tokenStr) {
                const decoded = await decode({ token: tokenStr, secret: process.env.NEXTAUTH_SECRET! });
                if (decoded?.id) {
                    userId = parseInt(decoded.id as string);
                }
            }
        }

        if (!userId) {
            return NextResponse.json({ message: "Unauthorized", success: false }, { status: 401 });
        }

        // Find the user
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return NextResponse.json({ message: "User not found", success: false }, { status: 404 });
        }

        if (user.status === "DELETED") {
            return NextResponse.json({ message: "Account already deleted", success: false }, { status: 400 });
        }

        // Perform Soft Delete
        // Anonymize PII to comply with privacy laws while keeping trade history for audits
        await prisma.user.update({
            where: { id: userId },
            data: {
                status: "DELETED",
                deletedAt: new Date(),
                email: `${user.email}.deleted.${Date.now()}`,
                phoneNumber: "DELETED",
                password: `DELETED_${Math.random().toString(36).substring(7)}`,
                lastIp: null,
                lastDevice: null,
                fcmToken: null
            }
        });

        // Clear all session tokens from database if using persistent sessions
        await prisma.session.deleteMany({
            where: { userId: userId }
        });

        return NextResponse.json({ 
            success: true, 
            message: "Account deleted successfully." 
        });
    } catch (e: any) {
        console.error("Account Deletion Error:", e);
        return NextResponse.json({ message: e.message, success: false }, { status: 500 });
    }
}
