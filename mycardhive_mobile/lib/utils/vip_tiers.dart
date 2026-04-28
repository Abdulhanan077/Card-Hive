class VipTier {
  final String name;
  final int level;
  final double multiplier;
  final String colorHex;
  final int minTrades;
  final int? maxTrades; // null means infinite (highest tier)

  const VipTier({
    required this.name,
    required this.level,
    required this.multiplier,
    required this.colorHex,
    required this.minTrades,
    this.maxTrades,
  });
}

class VipTiersConfig {
  static const List<VipTier> tiers = [
    VipTier(name: "Bronze", level: 1, multiplier: 1.0, colorHex: "#D97706", minTrades: 0, maxTrades: 50),
    VipTier(name: "Silver", level: 2, multiplier: 1.5, colorHex: "#64748B", minTrades: 51, maxTrades: 100),
    VipTier(name: "Gold", level: 3, multiplier: 2.0, colorHex: "#CA8A04", minTrades: 101, maxTrades: 250),
    VipTier(name: "Platinum", level: 4, multiplier: 3.0, colorHex: "#0EA5E9", minTrades: 251, maxTrades: null),
  ];

  static VipTier calculateVipTier(int completedTradesCount) {
    for (final tier in tiers) {
      if (tier.maxTrades == null) {
        return tier;
      }
      if (completedTradesCount >= tier.minTrades && completedTradesCount <= tier.maxTrades!) {
        return tier;
      }
    }
    return tiers.first;
  }

  static VipTier? getNextVipTier(int currentLevel) {
    try {
      return tiers.firstWhere((t) => t.level == currentLevel + 1);
    } catch (_) {
      return null;
    }
  }
}
