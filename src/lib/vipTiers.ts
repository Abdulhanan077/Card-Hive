export type VipTier = {
    name: string;
    level: number;
    multiplier: number;
    color: string;
    minTrades: number;
    maxTrades: number | null; // null means infinite (highest tier)
};

export const VIP_TIERS: VipTier[] = [
    { name: "Bronze", level: 1, multiplier: 1.0, color: "#cd7f32", minTrades: 0, maxTrades: 50 },
    { name: "Silver", level: 2, multiplier: 1.5, color: "#c0c0c0", minTrades: 51, maxTrades: 100 },
    { name: "Gold", level: 3, multiplier: 2.0, color: "#ffd700", minTrades: 101, maxTrades: 250 },
    { name: "Platinum", level: 4, multiplier: 3.0, color: "#e5e4e2", minTrades: 251, maxTrades: null },
];

export function calculateVipTier(completedTradesCount: number): VipTier {
    for (const tier of VIP_TIERS) {
        if (tier.maxTrades === null) {
            return tier;
        }
        if (completedTradesCount >= tier.minTrades && completedTradesCount <= tier.maxTrades) {
            return tier;
        }
    }
    return VIP_TIERS[0]; // Fallback to lowest tier
}

export function getNextVipTier(currentLevel: number): VipTier | null {
    const nextTier = VIP_TIERS.find(t => t.level === currentLevel + 1);
    return nextTier || null;
}
