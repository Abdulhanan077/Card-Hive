import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return new NextResponse(
                JSON.stringify({ error: "Unauthorized" }),
                { status: 401 }
            );
        }

        const user = await prisma.user.findUnique({
            where: { id: parseInt(session.user.id) },
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                status: true,
                rewardBalance: true,
                completedTradesCount: true,
                theme: true,
            }
        });

        if (!user) {
            return new NextResponse(
                JSON.stringify({ error: "User not found" }),
                { status: 404 }
            );
        }

        if (user.status === "BLOCKED") {
            return new NextResponse(
                JSON.stringify({ error: "Your account is deactivated." }),
                { status: 403 }
            );
        }

        const trades = await prisma.trade.findMany({
            where: { userId: user.id },
            select: {
                status: true,
                faceValue: true,
                calculatedPayout: true,
            }
        });

        const stats = {
            totalTrades: trades.length,
            pending: trades.filter(t => ['PENDING', 'UNDER_REVIEW', 'REVIEWING'].includes(t.status)).length,
            successful: trades.filter(t => ['PAID', 'COMPLETED'].includes(t.status)).length,
            rejected: trades.filter(t => t.status === 'REJECTED').length,
            totalReceivedGHS: trades.filter(t => ['PAID', 'COMPLETED'].includes(t.status)).reduce((sum, t) => sum + (t.calculatedPayout || 0), 0),
            totalVolumeUSD: trades.filter(t => ['PAID', 'COMPLETED'].includes(t.status)).reduce((sum, t) => sum + (t.faceValue || 0), 0),
        };

        const settings = await prisma.settings.findFirst({
            select: {
                siteName: true,
                contactEmail: true,
                whatsappNumber: true,
                referralBonusPercentage: true,
                rewardPointsToGhs: true,
                usdtExchangeRate: true,
                isReviewMode: true,
            }
        });

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                rewardBalance: user.rewardBalance,
                completedTradesCount: user.completedTradesCount,
                theme: user.theme,
                stats,
            },
            siteSettings: settings || {
                siteName: "MyCardHive",
                contactEmail: "support@mycardhive.com",
                whatsappNumber: "",
                referralBonusPercentage: 1.5,
                rewardPointsToGhs: 100.0,
                usdtExchangeRate: 15.0,
                isReviewMode: false,
            }
        });

    } catch (error) {
        console.error("Mobile Validation Error:", error);
        return new NextResponse(
            JSON.stringify({ error: "Internal server error" }),
            { status: 500 }
        );
    }
}
