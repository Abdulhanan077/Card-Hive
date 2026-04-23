import 'dart:math';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:mycardhive_mobile/services/leaderboard_service.dart';
import 'package:mycardhive_mobile/services/cache_service.dart';
import 'package:mycardhive_mobile/utils/error_utils.dart';

class LeaderboardScreen extends StatefulWidget {
  const LeaderboardScreen({super.key});

  @override
  State<LeaderboardScreen> createState() => _LeaderboardScreenState();
}

class _LeaderboardScreenState extends State<LeaderboardScreen> {
  final LeaderboardService _leaderboardService = LeaderboardService();
  bool _isLoading = true;
  String _activeTab = 'WHALE'; // WHALE, SPEED, REFERRAL

  List<dynamic> _topTraders = [];
  List<dynamic> _speedKings = [];
  List<dynamic> _topReferrers = [];

  @override
  void initState() {
    super.initState();
    _fetchLeaderboard();
  }

  Future<void> _fetchLeaderboard() async {
    try {
      final data = await _leaderboardService.getLeaderboardData();
      if (!mounted) return;
      
      setState(() {
        _topTraders = data['topTraders'] ?? [];
        _speedKings = data['speedKings'] ?? [];
        _topReferrers = data['topReferrers'] ?? [];
        _isLoading = false;
      });
      
      // Cache for offline use
      CacheService.cacheLeaderboardData(data);
    } catch (e) {
      if (!mounted) return;
      
      // Try to load from cache
      final cachedData = CacheService.getCachedLeaderboardData();
      if (cachedData != null) {
        setState(() {
          _topTraders = cachedData['topTraders'] ?? [];
          _speedKings = cachedData['speedKings'] ?? [];
          _topReferrers = cachedData['topReferrers'] ?? [];
          _isLoading = false;
        });
      } else {
        setState(() => _isLoading = false);
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(ErrorUtils.getFriendlyErrorMessage(e)), 
          backgroundColor: Colors.orangeAccent,
          behavior: SnackBarBehavior.floating,
        )
      );
    }
  }

  String _formatK(num value) {
    if (value >= 1000) {
      return '${(value / 1000).toStringAsFixed(1)}k';
    }
    return NumberFormat('#,##0').format(value);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text("MyCardHive Champions", style: TextStyle(color: theme.colorScheme.onSurface, fontWeight: FontWeight.bold)),
        backgroundColor: theme.cardColor,
        elevation: 1,
        centerTitle: true,
        leading: IconButton(icon: Icon(Icons.arrow_back_ios_new, color: theme.colorScheme.onSurface), onPressed: () => Navigator.pop(context)),
      ),
      body: _isLoading 
        ? const Center(child: CircularProgressIndicator()) 
        : RefreshIndicator(
            onRefresh: _fetchLeaderboard,
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text("Earn points based on monthly performance. Lifetime glory remains!", style: TextStyle(color: isDark ? Colors.white70 : const Color(0xFF64748B), fontSize: 13), textAlign: TextAlign.center),
                  const SizedBox(height: 24),

                  // Tabs
                  Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(color: theme.cardColor, borderRadius: BorderRadius.circular(12), border: Border.all(color: theme.dividerColor)),
                    child: Row(
                      children: [
                        _buildTabButton("WHALE", "Whale Board", Icons.star),
                        _buildTabButton("SPEED", "Speed Kings", Icons.flash_on),
                        _buildTabButton("REFERRAL", "Referrals", Icons.people),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Board Title
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: theme.cardColor,
                      borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                      border: Border(bottom: BorderSide(color: theme.dividerColor)),
                    ),
                    child: Text(
                      _activeTab == 'WHALE' ? "Top traders ranked by their total monthly trading volume (GHS)." :
                      _activeTab == 'SPEED' ? "Top traders ranked by total number of successful trades." :
                      "Top users ranked by number of active referrals.",
                      style: TextStyle(color: isDark ? Colors.white70 : const Color(0xFF64748B), fontSize: 12),
                    ),
                  ),

                  // Header Row
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    color: theme.cardColor,
                    child: Row(
                      children: [
                        Expanded(
                          flex: 3, 
                          child: Row(
                            children: [
                              Icon(Icons.leaderboard_outlined, size: 12, color: theme.colorScheme.onSurface.withOpacity(0.6)),
                              const SizedBox(width: 4),
                              Text("RANK / USER", style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: theme.colorScheme.onSurface)),
                            ],
                          )
                        ),
                        Expanded(
                          flex: 2, 
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.history_toggle_off, size: 12, color: theme.colorScheme.onSurface.withOpacity(0.6)),
                              const SizedBox(width: 4),
                              Text("LIFETIME", style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: theme.colorScheme.onSurface)),
                            ],
                          )
                        ),
                        Expanded(
                          flex: 2, 
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.calendar_month_outlined, size: 12, color: theme.colorScheme.onSurface.withOpacity(0.6)),
                              const SizedBox(width: 4),
                              Text("MONTHLY", style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: theme.colorScheme.onSurface)),
                            ],
                          )
                        ),
                        Expanded(
                          flex: 1, 
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              Icon(Icons.military_tech_outlined, size: 12, color: theme.colorScheme.onSurface.withOpacity(0.6)),
                              const SizedBox(width: 4),
                              Text("PTS", style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: theme.colorScheme.onSurface)),
                            ],
                          )
                        ),
                      ],
                    ),
                  ),

                  // Leaderboard List
                  Container(
                    decoration: BoxDecoration(
                      color: theme.cardColor,
                      borderRadius: const BorderRadius.vertical(bottom: Radius.circular(12)),
                    ),
                    child: Column(
                      children: _getActiveList().map((entry) => _buildLeaderboardRow(entry)).toList(),
                    ),
                  ),
                ],
              ),
            ),
          ),
    );
  }

  List<dynamic> _getActiveList() {
    if (_activeTab == 'WHALE') return _topTraders;
    if (_activeTab == 'SPEED') return _speedKings;
    return _topReferrers;
  }

  Widget _buildTabButton(String id, String label, IconData icon) {
    bool isSelected = _activeTab == id;
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _activeTab = id),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: isSelected ? const Color(0xFF2563EB) : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
          ),
          alignment: Alignment.center,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
               Icon(icon, size: 14, color: isSelected ? Colors.white : (isDark ? Colors.white54 : const Color(0xFF64748B))),
               const SizedBox(width: 4),
               Text(label, style: TextStyle(color: isSelected ? Colors.white : (isDark ? Colors.white54 : const Color(0xFF64748B)), fontWeight: FontWeight.bold, fontSize: 11)),
            ],
          ),
        ),
      ),
    );
  }

  String _maskUsername(String username) {
    if (username.isEmpty) return "Anonymous";
    if (username.length <= 2) return "${username[0]}*";
    
    final first = username[0];
    final last = username.substring(max(0, username.length - 2));
    final middleCount = (username.length - 3).clamp(2, 5);
    final middle = "*" * middleCount;
    
    return "@$first$middle$last";
  }

  Widget _buildLeaderboardRow(dynamic entry) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final rank = entry['rank'] ?? 0;
    final username = entry['username'] ?? 'Unknown';
    final points = entry['pointsEarned'] ?? 0;
    
    final mv = entry['monthlyValue'] ?? 0;
    final lv = entry['lifetimeValue'] ?? 0;

    String lvDisplay;
    String mvDisplay;

    if (_activeTab == 'WHALE') {
      lvDisplay = "₵${_formatK(lv)}";
      mvDisplay = "₵${NumberFormat('#,##0').format(mv)}";
    } else {
      lvDisplay = _formatK(lv);
      mvDisplay = NumberFormat('#,##0').format(mv);
    }

    Widget rankWidget;
    if (rank == 1) {
      rankWidget = const Icon(Icons.workspace_premium, color: Colors.amber, size: 20);
    } else if (rank == 2) {
      rankWidget = const Icon(Icons.workspace_premium, color: Color(0xFFC0C0C0), size: 20);
    } else if (rank == 3) {
      rankWidget = const Icon(Icons.workspace_premium, color: Color(0xFFCD7F32), size: 20);
    } else {
      rankWidget = Text("#$rank", style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: theme.colorScheme.onSurface.withOpacity(0.6)));
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      decoration: BoxDecoration(
        border: Border(top: BorderSide(color: theme.dividerColor)),
      ),
      child: Row(
        children: [
          // Rank & User (Flex 3)
          Expanded(
            flex: 3,
            child: Row(
              children: [
                SizedBox(width: 24, child: Center(child: rankWidget)),
                const SizedBox(width: 8),
                CircleAvatar(
                  radius: 12,
                  backgroundColor: theme.colorScheme.primary.withOpacity(0.1),
                  child: Text(
                    username.isNotEmpty ? username.substring(0, 1).toUpperCase() : '?',
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: theme.colorScheme.primary),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(child: Text(_maskUsername(username), style: TextStyle(fontWeight: FontWeight.bold, color: theme.colorScheme.onSurface, fontSize: 13), overflow: TextOverflow.ellipsis)),
              ],
            ),
          ),
          // Lifetime (Flex 2)
          Expanded(flex: 2, child: Text(lvDisplay, style: TextStyle(color: isDark ? Colors.white54 : const Color(0xFF475569), fontSize: 12), textAlign: TextAlign.center)),
          // Monthly (Flex 2)
          Expanded(flex: 2, child: Text(mvDisplay, style: TextStyle(color: theme.colorScheme.onSurface, fontWeight: FontWeight.bold, fontSize: 12), textAlign: TextAlign.center)),
          // Points (Flex 1)
          Expanded(
            flex: 1, 
            child: Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Text(points.toString(), style: const TextStyle(color: Color(0xFF2563EB), fontWeight: FontWeight.bold, fontSize: 13), textAlign: TextAlign.right),
                const SizedBox(width: 2),
                const Icon(Icons.star, size: 10, color: Colors.amber),
              ],
            )
          ),
        ],
      ),
    );
  }
}

