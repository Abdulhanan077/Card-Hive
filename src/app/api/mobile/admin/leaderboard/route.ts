import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/mobileAuth";
import { distributeBoardRewards } from "@/lib/leaderboard-actions";

export async function GET(request: Request) {
    try {
        const token = request.headers.get("Authorization")?.split(" ")[1];

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const admin = await verifyMobileToken(token);
        if (!admin || admin.role !== 'ADMIN') {
            return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
        }

        // 1. Fetch Board Data
        const leaderboardRes = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/user/leaderboard`);
        const leaderboardData = await leaderboardRes.json();

        // 2. Fetch Configs
        const configs = await (prisma as any).leaderboardRewardConfig.findMany({
            orderBy: [{ type: 'asc' }, { boardType: 'asc' }]
        });

        return NextResponse.json({ 
            success: true, 
            boards: leaderboardData.data,
            configs: configs
        });

    } catch (error) {
        console.error("Admin Mobile Leaderboard API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const token = request.headers.get("Authorization")?.split(" ")[1];
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const admin = await verifyMobileToken(token);
        if (!admin || admin.role !== 'ADMIN') return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

        const body = await request.json();
        const { action, boardType, basePoints, config } = body;

        if (action === 'CONFIG') {
            const { id, type, boardType, key, points, isActive, description } = config;

            if (id && id !== 0) {
                const updated = await (prisma as any).leaderboardRewardConfig.update({
                    where: { id: Number(id) },
                    data: { type, boardType, key, points: Number(points), isActive, description }
                });
                return NextResponse.json({ success: true, data: updated });
            } else {
                const existing = await (prisma as any).leaderboardRewardConfig.findFirst({
                    where: { type, boardType, key }
                });

                if (existing) {
                    const updated = await (prisma as any).leaderboardRewardConfig.update({
                        where: { id: existing.id },
                        data: { points: Number(points), isActive, description }
                    });
                    return NextResponse.json({ success: true, data: updated });
                }

                const created = await (prisma as any).leaderboardRewardConfig.create({
                    data: { type, boardType, key, points: Number(points), isActive, description }
                });
                return NextResponse.json({ success: true, data: created });
            }
        } 
        
        if (action === 'DISTRIBUTE') {
            if (!boardType || !basePoints) {
                return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
            }
            const result = await distributeBoardRewards(boardType, Number(basePoints));
            return NextResponse.json(result);
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    } catch (error) {
        console.error("Admin Mobile Leaderboard Action Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
