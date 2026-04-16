import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const userId = parseInt(session.user.id);

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
