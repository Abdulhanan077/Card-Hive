import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decode } from "next-auth/jwt";

export async function GET(req: Request) {
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

        const user = await prisma.user.findUnique({
            where: { id: parseInt(decoded.id as string) },
            select: {
                username: true,
                email: true,
                createdAt: true,
                referralCode: true,
                emailNotificationsEnabled: true
            }
        });

        if (!user) {
            return NextResponse.json({ message: "User not found", success: false }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            user: {
                ...user,
                memberSince: new Date(user.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    year: 'numeric'
                })
            }
        });
    } catch (e: any) {
        return NextResponse.json({ message: e.message, success: false }, { status: 500 });
    }
}

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

        const body = await req.json();
        const { emailNotificationsEnabled, username } = body;

        const updateData: any = {};
        if (emailNotificationsEnabled !== undefined) updateData.emailNotificationsEnabled = emailNotificationsEnabled;
        if (username !== undefined) updateData.username = username;

        const user = await prisma.user.update({
            where: { id: parseInt(decoded.id as string) },
            data: updateData
        });

        return NextResponse.json({ success: true, message: "Settings updated successfully" });
    } catch (e: any) {
        return NextResponse.json({ message: e.message, success: false }, { status: 500 });
    }
}
