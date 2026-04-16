import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mycardhive_mobile/services/admin_service.dart';
import 'package:mycardhive_mobile/services/auth_service.dart';
import 'package:mycardhive_mobile/services/notification_service.dart';
import 'dart:async';
import 'package:smooth_page_indicator/smooth_page_indicator.dart';
import 'package:flutter_slidable/flutter_slidable.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';
import 'package:mycardhive_mobile/ui/screens/admin/admin_notifications_screen.dart';
import 'package:mycardhive_mobile/ui/screens/admin/admin_trade_detail_screen.dart';

class AdminDashboardTab extends StatefulWidget {
  final dynamic user;
  const AdminDashboardTab({super.key, required this.user});

  @override
  State<AdminDashboardTab> createState() => _AdminDashboardTabState();
}

class _AdminDashboardTabState extends State<AdminDashboardTab> {
  final AdminService _adminService = AdminService();
  final AuthService _authService = AuthService();
  final PageController _pageController = PageController();
  Timer? _notifTimer;
  
  Map<String, dynamic> _stats = {};
  Map<String, dynamic> _charts = {};
  List<dynamic> _securityAlerts = [];
  List<Map<String, dynamic>> _pendingTrades = [];
  bool _isLoading = true;
  int _unreadCount = 0;

  @override
  void initState() {
    super.initState();
    _loadData();
    _startPolling();
  }

  void _startPolling() {
    _notifTimer = Timer.periodic(const Duration(seconds: 30), (timer) {
      _checkNotifications();
    });
  }

  Future<void> _checkNotifications() async {
    try {
      final notifications = await NotificationService.getFilteredNotifications(_authService);
      if (mounted) {
        setState(() => _unreadCount = notifications.length);
      }
    } catch (_) {}
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    
    try {
      final response = await _adminService.fetchStats();
      if (response.isNotEmpty) {
        setState(() {
          _stats = response['stats'] ?? {};
          _charts = response['charts'] ?? {};
          _securityAlerts = response['securityAlerts'] ?? [];
        });
      }

      final trades = await _adminService.fetchAllTrades(status: 'PENDING');
      final notifs = await _adminService.fetchNotifications();
      setState(() {
        _pendingTrades = trades;
        _unreadCount = notifs['unreadCount'] ?? 0;
      });
    } catch (e) {
      debugPrint("Dashboard load error: $e");
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  void dispose() {
    _notifTimer?.cancel();
    _pageController.dispose();
    super.dispose();
  }

  Future<void> _handleAction(String tradeId, String status, String notes) async {
    final result = await _adminService.updateTradeStatus(tradeId, status, notes);
    if (result['success']) {
       _loadData(); // Refresh
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return RefreshIndicator(
      onRefresh: _loadData,
      child: CustomScrollView(
        slivers: [
          // No local AppBar here - using global AppBar from AdminHome
          
          // 1. Stat Carousel (Now with 12 Metrics)
          SliverToBoxAdapter(
            child: _isLoading ? _buildCarouselLoading() : _buildStatCarousel(isDark, theme),
          ),

          // 2. Platform Analytics Overview
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    "Platform Analytics Overview",
                    style: GoogleFonts.outfit(
                      fontSize: 20, 
                      fontWeight: FontWeight.bold,
                      color: theme.colorScheme.onSurface,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(child: _buildChartContainer("Trade Status Distribution", _buildDonutChart(isDark, theme), isDark, theme)),
                      const SizedBox(width: 16),
                      // We'll stack them vertically on mobile for better visibility
                    ],
                  ),
                ],
              ),
            ),
          ),

          // 3. Trade Feed Section
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
            sliver: SliverToBoxAdapter(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    "Manage Trades",
                    style: GoogleFonts.outfit(
                      fontSize: 20, 
                      fontWeight: FontWeight.bold,
                      color: theme.colorScheme.onSurface,
                    ),
                  ),
                ],
              ),
            ),
          ),

          _isLoading 
            ? const SliverToBoxAdapter(child: Center(child: Padding(padding: EdgeInsets.all(40), child: CircularProgressIndicator())))
            : _pendingTrades.isEmpty 
              ? _buildEmptyState(isDark, theme)
              : SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, index) => _buildTradeItem(_pendingTrades[index], isDark, theme),
                      childCount: _pendingTrades.length,
                    ),
                  ),
                ),

          // 4. Security Alerts Section
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.warning_amber_rounded, color: Colors.red),
                      const SizedBox(width: 8),
                      Text(
                        "Recent Security Alerts",
                        style: GoogleFonts.outfit(
                          fontSize: 20, 
                          fontWeight: FontWeight.bold,
                          color: Colors.redAccent,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    "Suspicious or failed login attempts detected.",
                    style: GoogleFonts.outfit(color: isDark ? Colors.white54 : Colors.black54, fontSize: 13),
                  ),
                  const SizedBox(height: 16),
                  _buildSecurityAlertsList(isDark, theme),
                ],
              ),
            ),
          ),
          
          const SliverToBoxAdapter(child: SizedBox(height: 100)),
        ],
      ),
    );
  }

  Widget _buildStatCarousel(bool isDark, ThemeData theme) {
    final List<Widget> carouselPages = [
      _buildStatPage([
        _statData("TOTAL TRADES", _stats['totalTrades'], Colors.blue),
        _statData("TODAY'S TRADES", _stats['todaysTrades'], Colors.blue),
        _statData("PENDING INTAKE", _stats['pendingIntake'], Colors.orange),
        _statData("CURRENTLY REVIEWING", _stats['currentlyReviewing'], Colors.blue),
      ], isDark, theme),
      _buildStatPage([
        _statData("SUCCESSFUL TRADES", _stats['successfulTrades'], Colors.green),
        _statData("REJECTED TRADES", _stats['rejectedTrades'], Colors.red),
        _statData("TOTAL FACE VALUE", "\$${NumberFormat('#,###').format(_stats['totalFaceValue'] ?? 0)}", Colors.blue),
        _statData("TOTAL GHS PAYOUT", "GHS ${NumberFormat('#,###').format(_stats['totalGhsPayout'] ?? 0)}", Colors.green),
      ], isDark, theme),
      _buildStatPage([
        _statData("PENDING > 24H", _stats['pendingAlert'], Colors.red),
        _statData("AVG PAYOUT", "GHS ${NumberFormat('#,###').format(_stats['avgPayout'] ?? 0)}", Colors.green),
        _statData("AVG TRADE VALUE", "\$${NumberFormat('#,###').format(_stats['avgTradeValue'] ?? 0)}", Colors.blue),
        _statData("REGISTERED USERS", _stats['registeredUsers'], Colors.blue),
      ], isDark, theme),
    ];

    return Column(
      children: [
        SizedBox(
          height: 240, // Taller to accommodate 4 items per page in a grid
          child: PageView(
            controller: _pageController,
            children: carouselPages,
          ),
        ),
        const SizedBox(height: 12),
        SmoothPageIndicator(
          controller: _pageController,
          count: carouselPages.length,
          effect: WormEffect(
            dotHeight: 6,
            dotWidth: 6,
            activeDotColor: const Color(0xFF2563EB),
            dotColor: isDark ? Colors.white10 : Colors.black12,
          ),
        ),
      ],
    );
  }

  Widget _buildStatPage(List<_StatItem> items, bool isDark, ThemeData theme) {
    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 2,
      childAspectRatio: 1.8,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      children: items.map((item) => _buildMiniCard(item, isDark, theme)).toList(),
    );
  }

  Widget _buildMiniCard(_StatItem item, bool isDark, ThemeData theme) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: item.color.withOpacity(0.2), width: 1),
        boxShadow: [
          if (!isDark) BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10, offset: const Offset(0, 4))
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            item.label,
            style: GoogleFonts.outfit(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              color: isDark ? Colors.white54 : Colors.black54,
              letterSpacing: 0.5,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 4),
          Text(
            item.value.toString(),
            style: GoogleFonts.outfit(
              fontSize: 18,
              fontWeight: FontWeight.w900,
              color: item.label.contains("PAYOUT") || item.label.contains("SUCCESS") ? Colors.green : (item.color == Colors.red ? Colors.red : theme.colorScheme.onSurface),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildChartContainer(String title, Widget chart, bool isDark, ThemeData theme) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: isDark ? Colors.white10 : Colors.black.withOpacity(0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Text(
            title,
            style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 14, color: theme.colorScheme.onSurface),
          ),
          const SizedBox(height: 24),
          SizedBox(height: 180, child: chart),
          const SizedBox(height: 16),
          _buildChartLegend(isDark, theme),
        ],
      ),
    );
  }

  Widget _buildDonutChart(bool isDark, ThemeData theme) {
    if (_charts.isEmpty) return const Center(child: Text("No chart data"));
    
    final List<dynamic> data = _charts['statusDistribution'] ?? [];
    if (data.isEmpty) return const Center(child: Text("No data to display yet"));
    
    return PieChart(
      PieChartData(
        sectionsSpace: 4,
        centerSpaceRadius: 40,
        sections: data.map((d) {
          return PieChartSectionData(
            color: _parseColor(d['color']),
            value: (d['value'] as num).toDouble(),
            title: '',
            radius: 20,
          );
        }).toList(),
      ),
    );
  }

  Widget _buildChartLegend(bool isDark, ThemeData theme) {
    return Wrap(
      spacing: 12,
      runSpacing: 8,
      alignment: WrapAlignment.center,
      children: [
        _legendItem("Pending", Colors.orange),
        _legendItem("Rejected", Colors.red),
        _legendItem("Reviewing", Colors.blue),
        _legendItem("Successful", Colors.green),
      ],
    );
  }

  Widget _legendItem(String label, Color color) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 4),
        Text(label, style: const TextStyle(fontSize: 10, color: Colors.grey)),
      ],
    );
  }

  Widget _buildSecurityAlertsList(bool isDark, ThemeData theme) {
    if (_securityAlerts.isEmpty) return const SizedBox.shrink();

    return Column(
      children: _securityAlerts.map((log) => _buildSecurityItem(log, isDark, theme)).toList(),
    );
  }

  Widget _buildSecurityItem(dynamic log, bool isDark, ThemeData theme) {
    final date = DateTime.parse(log['createdAt']);
    final timeStr = DateFormat('hh:mm a').format(date);
    final isSuccess = log['success'] == true;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.red.withOpacity(0.1)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(color: Colors.red.withOpacity(0.1), shape: BoxShape.circle),
            child: Icon(Icons.security, color: Colors.red, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  log['emailOrUsername'],
                  style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.redAccent),
                ),
                Text(
                  "Portal: ${log['portal']} | IP: ${log['ipAddress']}",
                  style: GoogleFonts.outfit(fontSize: 11, color: Colors.grey),
                ),
              ],
            ),
          ),
          Text(
            timeStr,
            style: GoogleFonts.outfit(fontSize: 11, color: Colors.grey),
          ),
        ],
      ),
    );
  }

  Widget _buildTradeItem(Map<String, dynamic> trade, bool isDark, ThemeData theme) {
    final isBatch = trade['isBatch'] ?? false;
    final date = DateTime.parse(trade['createdAt']);
    final timeStr = DateFormat('HH:mm').format(date);

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Slidable(
        key: ValueKey(trade['tradeId']),
        startActionPane: ActionPane(
          motion: const BehindMotion(),
          extentRatio: 0.25,
          children: [
            SlidableAction(
              onPressed: (_) => _handleAction(trade['tradeId'], 'PAID', 'Approved via Mobile Swiped'),
              backgroundColor: Colors.green,
              foregroundColor: Colors.white,
              icon: Icons.check,
              borderRadius: BorderRadius.circular(20),
            ),
          ],
        ),
        endActionPane: ActionPane(
          motion: const BehindMotion(),
          extentRatio: 0.25,
          children: [
            SlidableAction(
              onPressed: (_) => _handleAction(trade['tradeId'], 'REJECTED', 'Rejected via Mobile Swipe'),
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
              icon: Icons.close,
              borderRadius: BorderRadius.circular(20),
            ),
          ],
        ),
        child: InkWell(
          onTap: () {
            Navigator.push(context, MaterialPageRoute(builder: (context) => AdminTradeDetailScreen(trade: trade)));
          },
          borderRadius: BorderRadius.circular(20),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E293B) : Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: isDark ? Colors.white10 : Colors.black.withOpacity(0.05)),
              boxShadow: [
                if (!isDark) BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10, offset: const Offset(0, 4))
              ],
            ),
            child: Row(
              children: [
                Container(
                  width: 48, height: 48,
                  decoration: BoxDecoration(
                    color: isBatch ? const Color(0xFF2563EB).withOpacity(0.1) : Colors.orange.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(
                    isBatch ? Icons.layers_outlined : Icons.credit_card_rounded,
                    color: isBatch ? const Color(0xFF2563EB) : Colors.orange,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "@${trade['user']['username']}",
                        style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 15, color: theme.colorScheme.onSurface),
                      ),
                      Text(
                        isBatch ? "${trade['cardCount']} Cards" : "${trade['cardBrand']} - ${trade['cardType']}",
                        style: GoogleFonts.outfit(fontSize: 12, color: Colors.grey),
                      ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      "\$${(isBatch ? (trade['totalValue'] ?? 0) : (trade['faceValue'] ?? 0)).toStringAsFixed(0)}",
                      style: GoogleFonts.outfit(fontWeight: FontWeight.w900, fontSize: 17, color: const Color(0xFF2563EB)),
                    ),
                    Text(timeStr, style: GoogleFonts.outfit(fontSize: 11, color: Colors.grey)),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // --- Helpers ---
  _StatItem _statData(String label, dynamic value, Color color) => _StatItem(label, value ?? "0", color);

  Color _parseColor(String hex) {
    hex = hex.replaceFirst('#', '');
    if (hex.length == 6) hex = 'FF$hex';
    return Color(int.parse(hex, radix: 16));
  }

  Widget _buildCarouselLoading() => Container(height: 240, margin: const EdgeInsets.all(20), decoration: BoxDecoration(color: Colors.black12, borderRadius: BorderRadius.circular(24)));

  Widget _buildEmptyState(bool isDark, ThemeData theme) {
    return SliverToBoxAdapter(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 40),
        alignment: Alignment.center,
        child: Text("No actionable trades", style: GoogleFonts.outfit(color: Colors.grey)),
      ),
    );
  }
}

class _StatItem {
  final String label;
  final dynamic value;
  final Color color;
  _StatItem(this.label, this.value, this.color);
}
