import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'ADMIN') {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const { userId, adjustment, boardType = 'ALL', reason } = await req.json();

        if (!userId || typeof adjustment !== 'number') {
            return NextResponse.json({ success: false, message: "Invalid parameters" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
        }

        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();

        // 1. Create adjustment record
        await (prisma as any).leaderboardAdjustment.create({
            data: {
                userId,
                points: adjustment,
                boardType,
                reason: reason || `Admin adjustment for ${boardType}`,
                month,
                year
            }
        });

        // 2. Add to user's real reward balance
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                rewardBalance: {
                    increment: adjustment
                }
            }
        });

        return NextResponse.json({ 
            success: true, 
            message: `Added ${adjustment} points to @${user.username} for ${boardType}`,
            newBalance: updatedUser.rewardBalance
        });

    } catch (error: any) {
        console.error("Admin Point Adjustment Error:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
