import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const userId = parseInt(session.user.id);
        const { points, payoutMethod, payoutDetails } = await request.json();

        if (!points || isNaN(points) || points <= 0) {
            return NextResponse.json({ success: false, error: "Invalid points amount" }, { status: 400 });
        }

        // Verify withdrawal constraints
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
        }

        if (points < 100) {
            return NextResponse.json({ success: false, error: "Minimum withdrawal amount is 100 points." }, { status: 400 });
        }

        if (user.rewardBalance < points) {
            return NextResponse.json({ success: false, error: "Insufficient reward balance." }, { status: 400 });
        }

        if (user.completedTradesCount < 5) {
            return NextResponse.json({ success: false, error: "You must complete at least 5 successful trades before withdrawing rewards." }, { status: 400 });
        }

        // Wrap in a transaction to deduct points and create request
        await prisma.$transaction([
            prisma.user.update({
                where: { id: userId },
                data: { rewardBalance: { decrement: points } }
            }),
            prisma.rewardRedemption.create({
                data: {
                    userId,
                    pointsRedeemed: points,
                    payoutMethod,
                    payoutDetails,
                    status: "PENDING"
                }
            })
        ]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Mobile Reward Redeem Error:", error);
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
}
