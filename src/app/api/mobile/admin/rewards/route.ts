import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Mobile API for Admins to manage reward redemptions.
 * Requires ADMIN role via session.
 */

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== "ADMIN") {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const redemptions = await prisma.rewardRedemption.findMany({
            include: { user: { select: { username: true, email: true } } },
            orderBy: { createdAt: "desc" }
        });

        // Get reward point value from settings
        const settings = await prisma.settings.findFirst();
        const ptsToGhs = settings?.rewardPointsToGhs || 100.0;

        return NextResponse.json({ 
            success: true, 
            redemptions,
            rate: ptsToGhs 
        });
    } catch (error) {
        console.error("Mobile Admin Rewards GET Error:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== "ADMIN") {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { id, status } = body;

        if (!id || !status) {
            return NextResponse.json({ success: false, message: "ID and Status are required" }, { status: 400 });
        }

        const redemption = await prisma.rewardRedemption.findUnique({ where: { id: parseInt(id) } });
        if (!redemption || redemption.status !== "PENDING") {
            return NextResponse.json({ success: false, message: "Redemption not found or already processed" }, { status: 404 });
        }

        if (status === "REJECTED") {
            // Refund points to user
            await prisma.$transaction([
                prisma.rewardRedemption.update({
                    where: { id: parseInt(id) },
                    data: { status: "REJECTED" }
                }),
                prisma.user.update({
                    where: { id: redemption.userId },
                    data: { rewardBalance: { increment: redemption.pointsRedeemed } }
                })
            ]);
        } else if (status === "PAID") {
            await prisma.rewardRedemption.update({
                where: { id: parseInt(id) },
                data: { status: "PAID" }
            });
        } else {
            return NextResponse.json({ success: false, message: "Invalid status" }, { status: 400 });
        }

        return NextResponse.json({ success: true, message: `Redemption ${status} successfully` });
    } catch (error) {
        console.error("Mobile Admin Rewards POST Error:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
