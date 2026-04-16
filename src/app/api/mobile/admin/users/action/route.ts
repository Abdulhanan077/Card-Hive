import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/mobileAuth";

export async function POST(request: Request) {
    try {
        const token = request.headers.get("Authorization")?.split(" ")[1];

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const admin = await verifyMobileToken(token);
        if (!admin || admin.role !== 'ADMIN') {
            return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
        }

        const body = await request.json();
        const { userId, action, value } = body;

        if (!userId || !action) {
            return NextResponse.json({ error: "User ID and action are required" }, { status: 400 });
        }

        const targetUser = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!targetUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        let updateData: any = {};
        let message = "";

        switch (action) {
            case "REWARD_POINTS":
                const pointsToAdd = parseFloat(value);
                if (isNaN(pointsToAdd)) return NextResponse.json({ error: "Invalid points value" }, { status: 400 });
                updateData.rewardBalance = { increment: pointsToAdd };
                message = `Successfully rewarded ${pointsToAdd} points to @${targetUser.username}`;
                break;
            case "DEDUCT_POINTS":
                const pointsToSub = parseFloat(value);
                if (isNaN(pointsToSub)) return NextResponse.json({ error: "Invalid points value" }, { status: 400 });
                updateData.rewardBalance = { decrement: pointsToSub };
                message = `Successfully deducted ${pointsToSub} points from @${targetUser.username}`;
                break;
            case "SET_VIP_TRADES":
                const tradesCount = parseInt(value);
                if (isNaN(tradesCount)) return NextResponse.json({ error: "Invalid trades count" }, { status: 400 });
                updateData.completedTradesCount = tradesCount;
                message = `Successfully set VIP trades to ${tradesCount} for @${targetUser.username}`;
                break;
            case "TOGGLE_STATUS":
                const newStatus = targetUser.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
                updateData.status = newStatus;
                message = `Account @${targetUser.username} is now ${newStatus}`;
                break;
            default:
                return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData
        });

        return NextResponse.json({ success: true, message, user: updatedUser });

    } catch (error) {
        console.error("Admin Mobile User Action API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
