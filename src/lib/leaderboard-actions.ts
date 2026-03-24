import { prisma } from "./prisma";
import { fetchAllLeaderboardData } from "./leaderboard";

/**
 * Tiered point logic: 1st=P, 2nd=P-5, 3rd=P-10, 4-10=P-15. Min 10.
 */
function calculateTieredPoints(rank: number, basePoints: number): number {
    let points = basePoints;
    if (rank === 2) points = basePoints - 5;
    else if (rank === 3) points = basePoints - 10;
    else if (rank >= 4) points = basePoints - 15;
    
    return Math.max(10, points);
}

export async function distributeBoardRewards(boardType: string, basePoints: number) {
    const data = await fetchAllLeaderboardData();
    let entries: any[] = [];
    
    if (boardType === 'WHALE') entries = data.topTraders;
    else if (boardType === 'SPEED') entries = data.speedKings;
    else if (boardType === 'REFERRAL') entries = data.topReferrers;

    const results = [];
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();

    for (const entry of entries) {
        if (entry.rank > 10) break; // Only top 10

        const pointsToAward = calculateTieredPoints(entry.rank, basePoints);

        // Update user balance
        await prisma.user.update({
            where: { id: entry.userId },
            data: { rewardBalance: { increment: pointsToAward } }
        });

        // Create history record
        await (prisma as any).leaderboardHistory.create({
            data: {
                userId: entry.userId,
                boardType: boardType,
                rank: entry.rank,
                value: entry.monthlyValue,
                pointsAwarded: pointsToAward,
                month,
                year
            }
        });

        results.push({ username: entry.username, rank: entry.rank, points: pointsToAward });
    }

    return { success: true, awarded: results };
}

export async function distributeRewards() {
    // Legacy global distribution - keeping for compatibility but focusing on per-board confirm
    const configs = await (prisma as any).leaderboardRewardConfig.findMany({
        where: { type: 'BASE_POINTS', isActive: true }
    });

    for (const config of configs) {
        await distributeBoardRewards(config.boardType, config.points);
    }

    return { success: true };
}

/**
 * Check if the user reached any new milestones and award points immediately
 * This ensures the "My Wallet" balance is always up to date with milestone achievements.
 */
export async function checkAndAwardMilestones(userId: number) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // 1. Get user statistics for the current month
    const [monthlyVolumeRes, monthlyCountRes] = await Promise.all([
        prisma.trade.aggregate({
            where: { userId, status: 'PAID', createdAt: { gte: startOfMonth } },
            _sum: { calculatedPayout: true }
        }),
        prisma.trade.count({
            where: { userId, status: 'PAID', createdAt: { gte: startOfMonth } }
        })
    ]);

    const monthlyVolume = monthlyVolumeRes._sum.calculatedPayout || 0;
    const monthlyCount = monthlyCountRes;

    // 2. Fetch all milestone configs
    const milestoneConfigs = await (prisma as any).leaderboardRewardConfig.findMany({
        where: { type: 'MILESTONE', isActive: true }
    });

    // 3. Fetch already awarded milestones for this month to avoid double-payout
    const awardedAdjustments = await (prisma as any).leaderboardAdjustment.findMany({
        where: { userId, month, year, reason: { startsWith: 'Milestone Awarded:' } }
    });

    const awardedReasons = awardedAdjustments.map((a: any) => a.reason);

    for (const config of milestoneConfigs) {
        const threshold = parseFloat(config.key.split('_')[0]);
        const milestoneKey = `Milestone Awarded: ${config.boardType} - ${config.key}`;

        if (awardedReasons.includes(milestoneKey)) continue;

        let achieved = false;
        if (config.boardType === 'WHALE' && monthlyVolume >= threshold) achieved = true;
        if (config.boardType === 'SPEED' && monthlyCount >= threshold) achieved = true;
        // Referrals are handled during registration, but we can check here too if needed
        
        if (achieved) {
            // Award points!
            await prisma.user.update({
                where: { id: userId },
                data: { rewardBalance: { increment: config.points } }
            });

            await (prisma as any).leaderboardAdjustment.create({
                data: {
                    userId,
                    points: config.points,
                    boardType: config.boardType,
                    reason: milestoneKey,
                    month,
                    year
                }
            });
            console.log(`[Milestone] Awarded ${config.points} to user ${userId} for ${milestoneKey}`);
        }
    }
}

export async function resetMonthlyLeaderboard() {
    // Clear all manual adjustments to start a fresh month
    await (prisma as any).leaderboardAdjustment.deleteMany({
        where: { createdAt: { lt: new Date() } } 
    });

    return { success: true };
}
