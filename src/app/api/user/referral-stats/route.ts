import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const userId = parseInt(session.user.id);

        const userData = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                username: true,
                referralCode: true,
                rewardBalance: true,
                referralPointsEarned: true,
                _count: {
                    select: { referrals: true }
                },
                referrals: {
                    select: {
                        username: true,
                        createdAt: true,
                        completedTradesCount: true,
                        referralPointsEarned: true,
                        status: true
                    },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (!userData) {
            return NextResponse.json({
                success: true,
                userData: { username: "Guest", referralCode: "" },
                stats: { invitesSent: 0, registrations: 0, activeReferrals: 0, totalEarnings: 0 }
            });
        }

        // Calculate Active Referrals (those with at least one trade)
        const activeReferralsCount = await prisma.user.count({
            where: {
                referredBy: userId,
                completedTradesCount: { gt: 0 }
            }
        });

        let settings = null;
        try {
            settings = await prisma.settings.findFirst();
        } catch (e) {
            console.error("Referral Stats API: Could not fetch settings", e);
        }

        const rewardPointsToGhs = settings?.rewardPointsToGhs || 100.0;
        const referralBonusPercentage = settings?.referralBonusPercentage || 1.5;
        const totalEarningsGhs = ((userData.rewardBalance || 0) / 100) * rewardPointsToGhs;

        return NextResponse.json({
            success: true,
            userData: {
                username: userData.username,
                referralCode: userData.referralCode,
            },
            stats: {
                invitesSent: userData._count.referrals, // Setting to registrations for now as proxy
                registrations: userData._count.referrals,
                activeReferrals: activeReferralsCount,
                totalEarnings: parseFloat(totalEarningsGhs.toFixed(2)),
                referralBonusPercentage: referralBonusPercentage,
            },
            referralsList: userData.referrals.map(r => ({
                username: r.username,
                joinedAt: r.createdAt,
                isActive: r.completedTradesCount > 0,
                pointsEarned: r.referralPointsEarned || 0,
                status: r.status
            }))
        });

    } catch (error: any) {
        console.error("Referral Stats API Error:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
