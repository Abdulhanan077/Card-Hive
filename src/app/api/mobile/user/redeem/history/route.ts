import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/mobileAuth";

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get("Authorization");
        const token = authHeader?.split(" ")[1];
        if (!token) {
            return NextResponse.json({ success: false, error: "No token provided" }, { status: 401 });
        }

        const decodedUser = await verifyMobileToken(token);
        if (!decodedUser) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const userId = parseInt(decodedUser.id);

        const history = await prisma.rewardRedemption.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" }
        });

        return NextResponse.json({ success: true, history });
    } catch (error) {
        console.error("Mobile Reward History Error:", error);
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
}
