import 'package:flutter/material.dart';
import 'package:mycardhive_mobile/services/admin_service.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

class AdminLeaderboardScreen extends StatefulWidget {
  const AdminLeaderboardScreen({super.key});

  @override
  State<AdminLeaderboardScreen> createState() => _AdminLeaderboardScreenState();
}

class _AdminLeaderboardScreenState extends State<AdminLeaderboardScreen> with SingleTickerProviderStateMixin {
  final AdminService _adminService = AdminService();
  late TabController _tabController;
  
  Map<String, dynamic>? _data;
  List<dynamic> _configs = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    final result = await _adminService.fetchLeaderboardAdmin();
    if (mounted) {
      if (result['success']) {
        setState(() {
          _data = result['boards'];
          _configs = result['configs'];
          _isLoading = false;
        });
      } else {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(result['error'] ?? "Failed to load")));
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _distributeRewards(String boardType, double basePoints) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text("Distribute Rewards?"),
        content: Text("Are you sure you want to distribute tiered rewards for the $boardType board now? This will update user wallets in real-time."),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text("Cancel")),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text("Distribute", style: TextStyle(fontWeight: FontWeight.bold))),
        ],
      ),
    );

    if (confirmed == true) {
      setState(() => _isLoading = true);
      final result = await _adminService.leaderboardAction(
        action: 'DISTRIBUTE',
        boardType: boardType,
        basePoints: basePoints,
      );
      if (mounted) {
        if (result['success']) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Successfully awarded points to ${result['awarded'].length} users!"), backgroundColor: Colors.green));
          _loadData();
        } else {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(result['message'] ?? "Distribution failed")));
          setState(() => _isLoading = false);
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text("Leaderboard Admin", style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [Tab(text: "Live Boards"), Tab(text: "Reward Config")],
          labelStyle: GoogleFonts.outfit(fontWeight: FontWeight.bold),
          indicatorColor: const Color(0xFF2563EB),
          labelColor: const Color(0xFF2563EB),
        ),
      ),
      body: _isLoading 
        ? const Center(child: CircularProgressIndicator())
        : TabBarView(
            controller: _tabController,
            children: [
              _buildBoardsTab(isDark),
              _buildConfigTab(isDark),
            ],
          ),
    );
  }

  Widget _buildBoardsTab(bool isDark) {
    if (_data == null) return const Center(child: Text("No data available"));

    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildBoardSection("Whale Board", "Top traders by volume (₵)", _data!['topTraders'] ?? [], "₵", isDark),
          const SizedBox(height: 24),
          _buildBoardSection("Speed Kings", "Top traders by number of trades", _data!['speedKings'] ?? [], "trades", isDark),
          const SizedBox(height: 24),
          _buildBoardSection("Referrals", "Top referrers by registrations", _data!['topReferrers'] ?? [], "referrals", isDark),
        ],
      ),
    );
  }

  Widget _buildBoardSection(String title, String subtitle, List<dynamic> entries, String unit, bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold)),
        Text(subtitle, style: const TextStyle(fontSize: 12, color: Colors.grey)),
        const SizedBox(height: 12),
        Container(
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E293B) : Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: isDark ? Colors.white10 : Colors.black.withOpacity(0.05)),
          ),
          child: Column(
            children: entries.isEmpty 
              ? [const Padding(padding: EdgeInsets.all(24), child: Text("No entries recorded yet.", style: TextStyle(fontSize: 13, color: Colors.grey)))]
              : entries.map((e) => _buildEntryRow(e, unit, isDark)).toList(),
          ),
        ),
      ],
    );
  }

  Widget _buildEntryRow(dynamic entry, String unit, bool isDark) {
    final rank = entry['rank'];
    final username = entry['username'];
    final monthly = entry['monthlyValue'] as num;
    final points = entry['pointsEarned'] as num;

    Widget rankWidget;
    if (rank == 1) rankWidget = const Icon(Icons.emoji_events, color: Color(0xFFFFD700), size: 24);
    else if (rank == 2) rankWidget = const Icon(Icons.emoji_events, color: Color(0xFFC0C0C0), size: 24);
    else if (rank == 3) rankWidget = const Icon(Icons.emoji_events, color: Color(0xFFCD7F32), size: 24);
    else rankWidget = Text("#$rank", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16));

    return ListTile(
      leading: SizedBox(width: 32, child: Center(child: rankWidget)),
      title: Text("@$username", style: GoogleFonts.outfit(fontWeight: FontWeight.w600, fontSize: 14)),
      subtitle: Text(unit == '₵' ? "₵${monthly.toLocaleString()}" : "$monthly $unit", style: const TextStyle(fontSize: 11)),
      trailing: Text("${points.toLocaleString()} pts", style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: const Color(0xFF2563EB))),
    );
  }

  Widget _buildConfigTab(bool isDark) {
    final List<Map<String, dynamic>> boards = [
      {'id': 'WHALE', 'name': 'Whale Board', 'leader': _data?['topTraders']?[0]?['monthlyValue'] ?? 0, 'unit': '₵', 'default': 150.0},
      {'id': 'SPEED', 'name': 'Speed Kings', 'leader': _data?['topSpeedKings']?[0]?['monthlyValue'] ?? 0, 'unit': 'trades', 'default': 100.0},
      {'id': 'REFERRAL', 'name': 'Referrals Hub', 'leader': _data?['topReferrers']?[0]?['monthlyValue'] ?? 0, 'unit': 'referrals', 'default': 100.0},
    ];

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        ...boards.map((b) => _buildBoardConfigCard(b, isDark)),
        const SizedBox(height: 24),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFF2563EB).withOpacity(0.05),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFF2563EB).withOpacity(0.1)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text("Points Distribution Rules (Tiered):", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF2563EB))),
              const SizedBox(height: 8),
              _ruleItem("Rank 1: Full Base Points (P)"),
              _ruleItem("Rank 2: P - 5 points"),
              _ruleItem("Rank 3: P - 10 points"),
              _ruleItem("Rank 4-10: P - 15 points"),
              const Text("Minimum award is always 10 points.", style: TextStyle(fontSize: 11, fontStyle: FontStyle.italic, color: Colors.grey)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _ruleItem(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        children: [
          const Icon(Icons.check_circle_outline_rounded, size: 12, color: Color(0xFF2563EB)),
          const SizedBox(width: 8),
          Text(text, style: const TextStyle(fontSize: 12)),
        ],
      ),
    );
  }

  Widget _buildBoardConfigCard(Map<String, dynamic> board, bool isDark) {
    final config = _configs.firstWhere((c) => c['boardType'] == board['id'] && c['key'] == 'BASE_POINTS', orElse: () => null);
    final pointsController = TextEditingController(text: (config?['points'] ?? board['default']).toString());

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: isDark ? Colors.white10 : Colors.black.withOpacity(0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(board['name'], style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 4),
          Text("Leader: ${board['unit'] == '₵' ? "₵${(board['leader'] as num).toLocaleString()}" : "${board['leader']} ${board['unit']}"}", style: const TextStyle(fontSize: 11, color: Colors.grey)),
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text("Base Reward Points", style: TextStyle(fontSize: 11, color: Colors.grey)),
                    const SizedBox(height: 6),
                    TextField(
                      controller: pointsController,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        filled: true,
                        fillColor: isDark ? Colors.white.withOpacity(0.05) : Colors.black.withOpacity(0.05),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        suffixText: "pts",
                      ),
                      onChanged: (val) {
                         if (val.isNotEmpty) {
                            _adminService.leaderboardAction(
                              action: 'CONFIG',
                              config: {
                                'id': config?['id'] ?? 0,
                                'type': 'BOARD_SETTING',
                                'boardType': board['id'],
                                'key': 'BASE_POINTS',
                                'points': double.parse(val),
                                'description': '${board['name']} base reward points',
                                'isActive': true
                              }
                            );
                         }
                      },
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 16),
              ElevatedButton(
                onPressed: () => _distributeRewards(board['id'], double.parse(pointsController.text)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF2563EB),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  elevation: 0,
                ),
                child: const Text("Confirm"),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

extension NumberFormatting on num {
  String toLocaleString() {
    return NumberFormat('#,###.##').format(this);
  }
}
