import { prisma } from "@/lib/prisma";

export type LeaderboardEntry = {
    userId: number;
    username: string;
    monthlyValue: number;
    lifetimeValue: number;
    pointsEarned: number;
    rank: number;
};

// Simple In-Memory Cache
let cachedLeaderboard: {
    data: {
        topTraders: LeaderboardEntry[],
        topReferrers: LeaderboardEntry[],
        speedKings: LeaderboardEntry[],
        recentTrades: any[]
    } | null,
    lastUpdate: number
} = {
    data: null,
    lastUpdate: 0
};

const CACHE_TTL = 30 * 1000; // 30 seconds

export async function fetchAllLeaderboardData() {
    const now = Date.now();
    if (cachedLeaderboard.data && (now - cachedLeaderboard.lastUpdate < CACHE_TTL)) {
        return cachedLeaderboard.data;
    }

    const [topTraders, topReferrers, speedKings, recentTrades] = await Promise.all([
        getTopTraders(10),
        getTopReferrers(10),
        getSpeedKings(10),
        getRecentTrades(10)
    ]);

    const data = { topTraders, topReferrers, speedKings, recentTrades };
    cachedLeaderboard = {
        data,
        lastUpdate: now
    };

    return data;
}

/**
 * Optimized common point calculation logic using pre-fetched data
 */
function calculatePointsBatch(
    userId: number, 
    monthlyValue: number, 
    currentRank: number, 
    boardType: 'WHALE' | 'SPEED' | 'REFERRAL',
    allConfigs: any[],
    allAdjustments: any[]
): number {
    // 1. Rank Rewards (Tiered: P, P-5, P-10, P-15, Min 10)
    let rankPoints = 0;
    if (currentRank <= 10) {
        const basePointsConfig = allConfigs.find((c: any) => c.type === 'BOARD_SETTING' && c.boardType === boardType && c.key === 'BASE_POINTS' && c.isActive);
        const p = basePointsConfig?.points || (boardType === 'WHALE' ? 150 : 100);
        
        let offset = (currentRank - 1) * 5;
        
        rankPoints = Math.max(10, p - offset);
    }

    // 2. Milestone Rewards
    let milestonePoints = 0;
    const milestoneConfigs = allConfigs.filter((c: any) => c.type === 'MILESTONE' && c.boardType === boardType && c.isActive);
    
    const sortedMilestones = milestoneConfigs
        .map((c: any) => ({ threshold: parseFloat(c.key.split('_')[0]), points: c.points }))
        .sort((a: any, b: any) => b.threshold - a.threshold);

    const achievedMilestone = sortedMilestones.find((m: any) => monthlyValue >= m.threshold);
    if (achievedMilestone) {
        milestonePoints = achievedMilestone.points;
    } else {
        // Fallback defaults
        if (boardType === 'WHALE') {
            if (monthlyValue >= 500000) milestonePoints = 500;
            else if (monthlyValue >= 300000) milestonePoints = 200;
            else if (monthlyValue >= 200000) milestonePoints = 100;
            else if (monthlyValue >= 100000) milestonePoints = 50;
            else if (monthlyValue >= 30000) milestonePoints = 10;
        } else if (boardType === 'SPEED') {
            if (monthlyValue >= 100) milestonePoints = 120;
            else if (monthlyValue >= 50) milestonePoints = 50;
            else if (monthlyValue >= 10) milestonePoints = 10;
        } else if (boardType === 'REFERRAL') {
            if (monthlyValue >= 20) milestonePoints = 150;
            else if (monthlyValue >= 10) milestonePoints = 50;
            else if (monthlyValue >= 5) milestonePoints = 20;
        }
    }

    // 3. Admin Adjustments (Removed from competition display to keep ranks strict)
    // const userAdjustments = allAdjustments.filter((adj: any) => adj.userId === userId && (adj.boardType === boardType || adj.boardType === 'ALL'));
    // const adjustmentPoints = userAdjustments.reduce((sum: number, adj: any) => sum + adj.points, 0);

    return rankPoints; // Strictly tiered rank points for competition display
}

/**
 * Top traders by Monthly Volume (₵)
 */
async function getTopTraders(limit: number = 10): Promise<LeaderboardEntry[]> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // 1. Volume Data
    const [monthlyTrades, lifetimeTrades, allConfigs] = await Promise.all([
        (prisma.trade as any).groupBy({
            by: ['userId'],
            where: { status: { in: ['PAID', 'COMPLETED'] }, createdAt: { gte: startOfMonth } },
            _sum: { calculatedPayout: true }
        }),
        (prisma.trade as any).groupBy({
            by: ['userId'],
            where: { status: { in: ['PAID', 'COMPLETED'] } },
            _sum: { calculatedPayout: true }
        }),
        (prisma as any).leaderboardRewardConfig.findMany({ where: { isActive: true } })
    ]);

    // 2. Build ranked user list
    const userIds = Array.from(new Set([
        ...monthlyTrades.map((t: any) => t.userId),
        ...lifetimeTrades.map((t: any) => t.userId)
    ]));

    const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, username: true }
    });

    const entries: LeaderboardEntry[] = users.map(user => {
        const m = monthlyTrades.find((t: any) => t.userId === user.id);
        const l = lifetimeTrades.find((t: any) => t.userId === user.id);
        return {
            userId: user.id,
            username: user.username,
            monthlyValue: m?._sum?.calculatedPayout || 0,
            lifetimeValue: l?._sum?.calculatedPayout || 0,
            pointsEarned: 0,
            rank: 0
        };
    });

    const ranked = entries
        .sort((a, b) => b.monthlyValue - a.monthlyValue)
        .slice(0, limit)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));

    // 3. Batch fetch adjustments for ranked users only
    const rankedUserIds = ranked.map(r => r.userId);
    const allAdjustments = await (prisma as any).leaderboardAdjustment.findMany({
        where: { userId: { in: rankedUserIds }, month, year }
    });

    // 4. In-memory points calculation
    for (let entry of ranked) {
        entry.pointsEarned = calculatePointsBatch(entry.userId, entry.monthlyValue, entry.rank, 'WHALE', allConfigs, allAdjustments);
    }

    return ranked;
}

/**
 * Speed Kings by Monthly Trades count
 */
async function getSpeedKings(limit: number = 10): Promise<LeaderboardEntry[]> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // 1. Volume Data
    const [monthlyTrades, lifetimeTrades, allConfigs] = await Promise.all([
        (prisma.trade as any).groupBy({
            by: ['userId'],
            where: { status: { in: ['PAID', 'COMPLETED'] }, createdAt: { gte: startOfMonth } },
            _count: { id: true }
        }),
        (prisma.trade as any).groupBy({
            by: ['userId'],
            where: { status: { in: ['PAID', 'COMPLETED'] } },
            _count: { id: true }
        }),
        (prisma as any).leaderboardRewardConfig.findMany({ where: { isActive: true } })
    ]);

    const userIds = Array.from(new Set([
        ...monthlyTrades.map((t: any) => t.userId),
        ...lifetimeTrades.map((t: any) => t.userId)
    ]));

    const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, username: true }
    });

    const entries: LeaderboardEntry[] = users.map(user => {
        const m = monthlyTrades.find((t: any) => t.userId === user.id);
        const l = lifetimeTrades.find((t: any) => t.userId === user.id);
        return {
            userId: user.id,
            username: user.username,
            monthlyValue: m?._count?.id || 0,
            lifetimeValue: l?._count?.id || 0,
            pointsEarned: 0,
            rank: 0
        };
    });

    const ranked = entries
        .sort((a, b) => b.monthlyValue - a.monthlyValue)
        .slice(0, limit)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));

    const rankedUserIds = ranked.map(r => r.userId);
    const allAdjustments = await (prisma as any).leaderboardAdjustment.findMany({
        where: { userId: { in: rankedUserIds }, month, year }
    });

    for (let entry of ranked) {
        entry.pointsEarned = calculatePointsBatch(entry.userId, entry.monthlyValue, entry.rank, 'SPEED', allConfigs, allAdjustments);
    }

    return ranked;
}

/**
 * Top Referrers by Monthly referrals
 */
async function getTopReferrers(limit: number = 10): Promise<LeaderboardEntry[]> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // 1. Referral Data
    const [usersMonthly, usersLifetime, allConfigs] = await Promise.all([
        prisma.user.findMany({
            select: {
                id: true,
                username: true,
                _count: {
                    select: { referrals: { where: { createdAt: { gte: startOfMonth } } } }
                }
            } as any
        }),
        prisma.user.findMany({
            select: {
                id: true,
                _count: { select: { referrals: true } }
            } as any
        }),
        (prisma as any).leaderboardRewardConfig.findMany({ where: { isActive: true } })
    ]);

    const entries: LeaderboardEntry[] = (usersMonthly as any[]).map(u => {
        const uM = u as any;
        const uL = (usersLifetime as any[]).find(l => l.id === u.id);
        return {
            userId: u.id,
            username: u.username,
            monthlyValue: uM._count?.referrals || 0,
            lifetimeValue: uL?._count?.referrals || 0,
            pointsEarned: 0,
            rank: 0
        };
    }).filter(e => e.lifetimeValue > 0);

    const ranked = entries
        .sort((a, b) => b.monthlyValue - a.monthlyValue)
        .slice(0, limit)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));

    const rankedUserIds = ranked.map(r => r.userId);
    const allAdjustments = await (prisma as any).leaderboardAdjustment.findMany({
        where: { userId: { in: rankedUserIds }, month, year }
    });

    for (let entry of ranked) {
        entry.pointsEarned = calculatePointsBatch(entry.userId, entry.monthlyValue, entry.rank, 'REFERRAL', allConfigs, allAdjustments);
    }

    return ranked;
}

/**
 * Recent trades for ticker
 */
async function getRecentTrades(limit: number = 10) {
    return prisma.trade.findMany({
        where: { status: { in: ['PAID', 'COMPLETED'] } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
            id: true,
            user: { select: { username: true } },
            cardBrand: true,
            faceValue: true,
            currency: true,
            createdAt: true
        } as any
    });
}
