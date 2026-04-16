import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decode } from "next-auth/jwt";

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
        const { tradeId } = body;

        if (!tradeId) return NextResponse.json({ message: "Missing tradeId", success: false }, { status: 400 });

        const trade = await prisma.trade.findUnique({
            where: { tradeId },
        });

        if (!trade || trade.userId !== parseInt(decoded.id)) {
            return NextResponse.json({ message: "Trade not found", success: false }, { status: 404 });
        }

        if (trade.status !== "PAID") {
            return NextResponse.json({ message: "Trade must be PAID before confirming", success: false }, { status: 400 });
        }

        await prisma.trade.update({
            where: { id: trade.id },
            data: { status: "COMPLETED" }
        });

        return NextResponse.json({ success: true, message: "Receipt confirmed!" }, { status: 200 });
    } catch (e: any) {
        return NextResponse.json({ message: e.message, success: false }, { status: 500 });
    }
}
