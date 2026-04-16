import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export async function POST(request: Request) {
    try {
        const token = await getToken({ req: request as any });
        if (!token || !token.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { fcmToken } = body;

        if (!fcmToken) {
            return NextResponse.json({ error: "fcmToken is required" }, { status: 400 });
        }

        await prisma.user.update({
            where: { id: parseInt(token.id as string) },
            data: { fcmToken }
        });

        return NextResponse.json({ success: true, message: "FCM token updated" }, { status: 200 });

    } catch (err: any) {
        console.error("FCM_TOKEN_UPDATE_ERROR:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
