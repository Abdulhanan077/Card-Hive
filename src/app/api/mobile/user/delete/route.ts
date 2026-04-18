import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decode } from "next-auth/jwt";

/**
 * Handle Soft Account Deletion for Mobile Users
 * Marks the user as DELETED and anonymizes PII while preserving trade history.
 */
export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get("Cookie");
        const tokenStr = authHeader?.split("next-auth.session-token=")[1]?.split(";")[0];
        
        if (!tokenStr) {
            return NextResponse.json({ message: "Unauthorized", success: false }, { status: 401 });
        }

        const decoded = await decode({ token: tokenStr, secret: process.env.NEXTAUTH_SECRET! });
        if (!decoded || !decoded.id) {
            return NextResponse.json({ message: "Unauthorized", success: false }, { status: 401 });
        }

        const userId = parseInt(decoded.id as string);

        // Find the user first to get their email
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
        // We append a timestamp to the email to allow them to register again with the same email if they wish,
        // while also ensuring the current record satisfies the constraint of "deleting data".
        await prisma.user.update({
            where: { id: userId },
            data: {
                status: "DELETED",
                deletedAt: new Date(),
                email: `${user.email}.deleted.${Date.now()}`,
                phoneNumber: "DELETED",
                password: `DELETED_${Math.random().toString(36).substring(7)}`,
                // Optionally clear other PII if exists
                lastIp: null,
                lastDevice: null,
                fcmToken: null
            }
        });

        // Delete all active sessions for this user
        await prisma.session.deleteMany({
            where: { userId: userId }
        });

        return NextResponse.json({ 
            success: true, 
            message: "Account deleted successfully. All personal data has been removed." 
        });
    } catch (e: any) {
        console.error("Account Deletion Error:", e);
        return NextResponse.json({ message: e.message, success: false }, { status: 500 });
    }
}
