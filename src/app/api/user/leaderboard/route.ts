import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchAllLeaderboardData } from "@/lib/leaderboard";

export async function GET() {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    try {
        const { topTraders, topReferrers, speedKings, recentTrades } = await fetchAllLeaderboardData();

        let myReferrals: any[] = [];
        if (userId) {
            myReferrals = await prisma.user.findMany({
                where: { referredBy: Number(userId) },
                select: { id: true, username: true, createdAt: true },
                orderBy: { createdAt: 'desc' }
            });
        }

        return NextResponse.json({
            success: true,
            data: {
                topTraders,
                topReferrers,
                speedKings,
                recentTrades,
                myReferrals
            }
        });
    } catch (error) {
        console.error("Leaderboard API Error:", error);
        return NextResponse.json(
            { success: false, message: "Failed to fetch leaderboard data", error: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
