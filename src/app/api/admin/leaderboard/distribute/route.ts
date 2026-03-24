import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { distributeBoardRewards } from "@/lib/leaderboard-actions";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'ADMIN') {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { boardType, basePoints } = body;

        if (!boardType || !basePoints) {
            return NextResponse.json({ success: false, message: "Missing boardType or basePoints" }, { status: 400 });
        }

        const result = await distributeBoardRewards(boardType, basePoints);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Distribution API Error:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
