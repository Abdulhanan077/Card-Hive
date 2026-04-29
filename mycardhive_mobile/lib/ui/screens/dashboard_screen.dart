import 'package:flutter/material.dart';
import 'package:mycardhive_mobile/config.dart';
import 'package:mycardhive_mobile/utils/error_utils.dart';
import 'package:mycardhive_mobile/ui/screens/general_support_chat_screen.dart';
import 'package:mycardhive_mobile/services/auth_service.dart';
import 'package:mycardhive_mobile/main.dart';
import 'package:mycardhive_mobile/ui/screens/sell_card_screen.dart';
import 'package:mycardhive_mobile/ui/screens/trades_screen.dart';
import 'package:mycardhive_mobile/ui/screens/leaderboard_screen.dart';
import 'package:mycardhive_mobile/ui/screens/referrals_screen.dart';
import 'package:mycardhive_mobile/ui/screens/settings_screen.dart';
import 'package:mycardhive_mobile/ui/screens/rewards_screen.dart';
import 'package:mycardhive_mobile/ui/screens/home_screen.dart';
import 'package:mycardhive_mobile/services/cache_service.dart';
import 'package:mycardhive_mobile/services/status_service.dart';
import 'package:mycardhive_mobile/services/trade_service.dart';
import 'package:mycardhive_mobile/services/rate_service.dart';
import 'package:intl/intl.dart';
import 'dart:async';
import 'package:mycardhive_mobile/services/notification_service.dart';
import 'package:mycardhive_mobile/ui/screens/notifications_screen.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:mycardhive_mobile/services/public_service.dart';
import 'package:mycardhive_mobile/services/update_service.dart';
import 'package:provider/provider.dart';
import 'package:smooth_page_indicator/smooth_page_indicator.dart';
import 'package:restart_app/restart_app.dart';
import 'package:mycardhive_mobile/utils/vip_tiers.dart';

class DashboardScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  
  const DashboardScreen({super.key, required this.user});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final AuthService _authService = AuthService();
  final TradeService _tradeService = TradeService();
  final RateService _rateService = RateService();
  final PublicService _publicService = PublicService();
  
  List<Map<String, dynamic>> _topRates = [];
  List<Map<String, dynamic>> _recentTrades = [];
  List<Map<String, dynamic>> _statusUpdates = [];
  Map<String, dynamic> _user = {};
  Map<String, dynamic> _siteSettings = {};
  final PageController _statusController = PageController();
  bool _isRefreshing = false;
  int _unreadCount = 0;
  bool _initialCheckDone = false;
  Timer? _notifTimer;

  @override
  void initState() {
    super.initState();
    _user = widget.user;
    _siteSettings = CacheService.getCachedSiteSettings() ?? {};
    _loadDashboardData();
    StatusPollingService.startPolling();
    _startNotificationPolling();
    _setupUpdateListener();
  }

  void _setupUpdateListener() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final updateService = Provider.of<UpdateService>(context, listen: false);
      updateService.addListener(() async {
        if (updateService.updateAvailable && mounted) {
           ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text("🚀 New version ready! Restart app to apply changes."),
              duration: const Duration(seconds: 10),
              backgroundColor: const Color(0xFF2563EB),
              action: SnackBarAction(
                label: "RESTART",
                textColor: Colors.white,
                onPressed: () => Restart.restartApp(),
              ),
            ),
          );
        }
      });
    });
  }

  void _startNotificationPolling() {
    _checkNotifications();
    _notifTimer = Timer.periodic(const Duration(seconds: 30), (_) => _checkNotifications());
  }

  Future<void> _checkNotifications() async {
    final notifications = await NotificationService.getFilteredNotifications(_authService);
    if (mounted) {
      setState(() => _unreadCount = notifications.length);
    }
    _initialCheckDone = true;
  }

  Future<void> _loadDashboardData() async {
    setState(() => _isRefreshing = true);
    await Future.delayed(const Duration(milliseconds: 500));
    try {
      // 1. Refresh user stats from server
      final autoLoginRes = await _authService.tryAutoLogin();
      if (autoLoginRes['success']) {
        setState(() {
           _user = autoLoginRes['user'];
           if (autoLoginRes['siteSettings'] != null) {
             _siteSettings = autoLoginRes['siteSettings'];
           }
        });
        await CacheService.cacheDashboard(_user);
      }

      // 2. Load trades, rates, and status updates
      final trades = await _tradeService.getTrades();
      final rates = await _rateService.getTopRates();
      final updates = await _publicService.getStatusUpdates();
      
      setState(() {
        _recentTrades = trades.take(3).toList();
        _topRates = rates;
        _statusUpdates = updates;
      });
    } catch (e) {
      debugPrint("Dashboard Refresh Error: $e");
      // Fallback to cache if needed
      final cachedTrades = CacheService.getCachedTrades();
      if (cachedTrades != null) {
        setState(() => _recentTrades = cachedTrades.take(3).toList());
      }
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(ErrorUtils.getFriendlyErrorMessage(e)),
            backgroundColor: Colors.orangeAccent,
            behavior: SnackBarBehavior.floating,
          )
        );
      }
    } finally {
      if (mounted) setState(() => _isRefreshing = false);
    }
  }

  @override
  void dispose() {
    StatusPollingService.stopPolling();
    _notifTimer?.cancel();
    _statusController.dispose();
    super.dispose();
  }

  void _logout() async {
    await _authService.logout();
    if (!mounted) return;
    Navigator.pushAndRemoveUntil(context, MaterialPageRoute(builder: (_) => const LoginScreen()), (route) => false);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    
    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        leading: Builder(
          builder: (context) => IconButton(
            icon: Icon(Icons.menu, color: isDark ? Colors.white : Colors.black87),
            onPressed: () => Scaffold.of(context).openDrawer(),
          ),
        ),
        title: Image.asset('assets/logo.png', height: 28),
        backgroundColor: theme.cardColor,
        centerTitle: true,
        elevation: 1,
        actions: [
          Stack(
            children: [
              IconButton(
                icon: Icon(_unreadCount > 0 ? Icons.notifications_active : Icons.notifications_none, 
                  color: _unreadCount > 0 ? const Color(0xFF2563EB) : (isDark ? Colors.white : Colors.black87)),
                onPressed: () async {
                  // Mark current notifications as "seen" locally to clear status updates from badge
                  final notifications = await NotificationService.checkAndNotify(_authService);
                  for (var n in notifications) {
                    NotificationService.markStatusAsSeenLocally(n['id']);
                  }
                  
                  setState(() => _unreadCount = 0);
                  await Navigator.push(context, MaterialPageRoute(builder: (_) => NotificationsScreen()));
                  
                  // Final refresh
                  final updatedNotifs = await NotificationService.getFilteredNotifications(_authService);
                  setState(() => _unreadCount = updatedNotifs.length);
                },
              ),
              if (_unreadCount > 0)
                Positioned(
                  right: 8,
                  top: 8,
                  child: Container(
                    padding: const EdgeInsets.all(2),
                    decoration: BoxDecoration(
                      color: Colors.red,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                    child: Text(
                      '$_unreadCount',
                      style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
      drawer: _buildUserPanelDrawer(),
      body: RefreshIndicator(
        onRefresh: _loadDashboardData,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
            // Latest Promotions / Status Update Banner
            _buildStatusCarousel(isDark, theme),
            const SizedBox(height: 16),

            // Top Content Row: Dashboard Grid (Wallet & Referrals)
            _buildColoredInfoCard(
              title: "My Wallet (Reward Pts)",
              value: "${_user['rewardBalance'] ?? 0} pts",
              buttonText: "View Rewards",
              icon: Icons.account_balance_wallet_outlined,
              gradient: const [Color(0xFF8B5CF6), Color(0xFF6D28D9)],
              onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => RewardsScreen(user: _user, siteSettings: _siteSettings))),
            ),
            const SizedBox(height: 12),
            _buildColoredInfoCard(
              title: "Referral Rewards",
              value: "New!",
              buttonText: "Open Referrals Hub",
              icon: Icons.card_giftcard_outlined,
              description: "Your personal dashboard is ready. Track your referrals, bonuses, and earnings in one place!",
              gradient: const [Color(0xFF3B82F6), Color(0xFF1D4ED8)],
              onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ReferralsScreen())),
            ),
            const SizedBox(height: 16),

            // Quick Actions (Matching Web layout better)
            _buildModernCard(
              isDark, theme,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                   Text("Quick Actions", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: theme.colorScheme.onSurface)),
                   const SizedBox(height: 16),
                   Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _buildQuickAction(Icons.credit_card, "Sell Card", const Color(0xFF9333EA), theme, isDark, onTap: () {
                        Navigator.push(context, MaterialPageRoute(builder: (_) => const SellCardScreen()));
                      }),
                      _buildQuickAction(Icons.bar_chart, "History", const Color(0xFF16A34A), theme, isDark, onTap: () {
                        Navigator.push(context, MaterialPageRoute(builder: (_) => const TradesScreen()));
                      }),
                      _buildQuickAction(Icons.settings, "Settings", const Color(0xFF0284C7), theme, isDark, onTap: () {
                        Navigator.push(context, MaterialPageRoute(builder: (_) => const SettingsScreen()));
                      }),
                      _buildQuickAction(Icons.support_agent_rounded, "Support", const Color(0xFF16A34A), theme, isDark, onTap: () {
                        Navigator.push(context, MaterialPageRoute(builder: (_) => GeneralSupportChatScreen(user: _user)));
                      }),
                    ],
                   ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Recent Trades Section
            _buildModernCard(
              isDark, theme,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text("Recent Trades", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: theme.colorScheme.onSurface)),
                      TextButton(
                        onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const TradesScreen())),
                        child: const Text("View All", style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  if (_recentTrades.isEmpty)
                    const Padding(padding: EdgeInsets.symmetric(vertical: 20), child: Center(child: Text("No recent activity.", style: TextStyle(color: Colors.grey))))
                  else
                    ..._recentTrades.map((t) => _buildTradeListItem(t, isDark, theme)),
                ],
              ),
            ),
             const SizedBox(height: 16),

            // VIP Status
            _buildVipCard(isDark, theme),
            const SizedBox(height: 16),

            // Top Rates Section
            _buildModernCard(
              isDark, theme,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text("Top Rates Today", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: theme.colorScheme.onSurface)),
                      TextButton(
                        onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SellCardScreen())),
                        child: const Text("Trade Now", style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  if (_topRates.isEmpty)
                    const Padding(padding: EdgeInsets.symmetric(vertical: 20), child: Center(child: Text("Loading live rates...", style: TextStyle(color: Colors.grey))))
                  else
                    ..._topRates.map((r) => _buildRateListItem(r, isDark, theme)),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Support Section
            _buildModernCard(
              isDark, theme,
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                   Text("Support", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: theme.colorScheme.onSurface)),
                   const SizedBox(height: 16),
                   _buildSupportButton(
                     icon: Icons.chat_outlined,
                     title: "WhatsApp Support",
                     subtitle: _siteSettings['whatsappNumber'] ?? "+233 201548030",
                     color: const Color(0xFF10B981),
                     onTap: () => launchUrl(Uri.parse("https://wa.me/${(_siteSettings['whatsappNumber'] ?? '233201548030').replaceAll('+', '').replaceAll(' ', '')}")),
                   ),
                   const SizedBox(height: 12),
                   _buildSupportButton(
                     icon: Icons.mail_outline_rounded,
                     title: "Email Support",
                     subtitle: _siteSettings['contactEmail'] ?? "support@mycardhive.com",
                     color: const Color(0xFF2563EB),
                     onTap: () => launchUrl(Uri.parse("mailto:${_siteSettings['contactEmail'] ?? 'support@mycardhive.com'}")),
                   ),
                   const SizedBox(height: 12),
                   _buildSupportButton(
                     icon: Icons.public_rounded,
                     title: "Website Support",
                     subtitle: "Visit our contact page",
                     color: const Color(0xFF6366F1),
                     onTap: () => launchUrl(Uri.parse("${AppConfig.baseUrl.replaceFirst('/api', '')}/contact")),
                   ),
                ],
              ),
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    ),
  );
}

  static const List<LinearGradient> _cardGradients = [
    LinearGradient(colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)], begin: Alignment.topLeft, end: Alignment.bottomRight),
    LinearGradient(colors: [Color(0xFF3B82F6), Color(0xFF06B6D4)], begin: Alignment.topLeft, end: Alignment.bottomRight),
    LinearGradient(colors: [Color(0xFFEF4444), Color(0xFFF97316)], begin: Alignment.topLeft, end: Alignment.bottomRight),
    LinearGradient(colors: [Color(0xFF10B981), Color(0xFF14B8A6)], begin: Alignment.topLeft, end: Alignment.bottomRight),
    LinearGradient(colors: [Color(0xFFEC4899), Color(0xFFF43F5E)], begin: Alignment.topLeft, end: Alignment.bottomRight),
    LinearGradient(colors: [Color(0xFF8B5CF6), Color(0xFFD946EF)], begin: Alignment.topLeft, end: Alignment.bottomRight),
  ];

  Widget _buildStatusCarousel(bool isDark, ThemeData theme) {
    if (_statusUpdates.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          gradient: _cardGradients[0],
          borderRadius: BorderRadius.circular(20),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 10, offset: const Offset(0, 4))],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text("Latest Promotions", style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            const Text(
              "Discover the best exchange rates and start selling your gift cards today.",
              style: TextStyle(color: Colors.white70, fontSize: 13),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SellCardScreen())),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: const Color(0xFF6366F1),
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: const Text("Sell Now", style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      );
    }

    return Column(
      children: [
        SizedBox(
          height: 220,
          child: PageView.builder(
            controller: _statusController,
            itemCount: _statusUpdates.length,
            itemBuilder: (context, index) {
              final update = _statusUpdates[index];
              final hasImage = update['imageUrl'] != null;
              final gradient = _cardGradients[index % _cardGradients.length];

              return Container(
                margin: const EdgeInsets.symmetric(horizontal: 4),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(24),
                  color: isDark ? const Color(0xFF1E293B) : Colors.white,
                  border: Border.all(color: Colors.white.withOpacity(0.2)),
                  image: hasImage ? DecorationImage(
                    image: NetworkImage(update['imageUrl']),
                    fit: BoxFit.cover,
                    colorFilter: ColorFilter.mode(Colors.black.withOpacity(0.6), BlendMode.darken),
                  ) : null,
                  gradient: !hasImage ? gradient : null,
                  boxShadow: [
                    BoxShadow(color: Colors.black.withOpacity(0.15), blurRadius: 15, offset: const Offset(0, 8)),
                  ],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(24),
                  child: Stack(
                    children: [
                      if (!hasImage)
                        Positioned(
                          right: -30, bottom: -50,
                          child: Container(
                            width: 250, height: 250,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              gradient: RadialGradient(
                                colors: [Colors.white.withOpacity(0.15), Colors.white.withOpacity(0)],
                              ),
                            ),
                          ),
                        ),
                      Padding(
                        padding: const EdgeInsets.all(24.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withOpacity(0.2),
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  child: const Text("UPDATE", style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 1)),
                                ),
                                Text(
                                  _getTimeAgo(update['createdAt'] ?? ""),
                                  style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 10),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Expanded(
                              child: Center(
                                child: SingleChildScrollView(
                                  physics: const BouncingScrollPhysics(),
                                  child: Text(
                                    update['message'] ?? "",
                                    style: const TextStyle(
                                      color: Colors.white, 
                                      fontSize: 18, 
                                      fontWeight: FontWeight.bold,
                                      height: 1.4,
                                      fontStyle: FontStyle.italic,
                                      fontFamily: 'Georgia', 
                                    ),
                                    textAlign: TextAlign.center,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(height: 8),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 12),
        SmoothPageIndicator(
          controller: _statusController,
          count: _statusUpdates.length,
          effect: ScrollingDotsEffect(
            dotWidth: 7,
            dotHeight: 7,
            activeDotColor: theme.primaryColor,
            dotColor: isDark ? Colors.white24 : Colors.grey.withOpacity(0.3),
          ),
        ),
      ],
    );
  }

  String _getTimeAgo(String dateString) {
    if (dateString.isEmpty) return "Just now";
    try {
      final date = DateTime.parse(dateString);
      final diff = DateTime.now().difference(date);

      if (diff.inMinutes < 1) return "Just now";
      if (diff.inMinutes < 60) return "${diff.inMinutes}m ago";
      if (diff.inHours < 24) return "${diff.inHours}h ago";
      return "${diff.inDays}d ago";
    } catch (e) {
      return "Just now";
    }
  }

  String _getUpdateTitle(Map<String, dynamic> update) {
    if (update['message'] != null && update['message'].toString().contains("paid")) return "Payment Confirmed! ✅";
    return "New Update 📢";
  }

  Widget _buildColoredInfoCard({
    required String title, 
    required String value, 
    required String buttonText, 
    required IconData icon, 
    required List<Color> gradient, 
    required VoidCallback onTap,
    String? description,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: gradient, begin: Alignment.topLeft, end: Alignment.bottomRight),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(color: gradient[1].withOpacity(0.3), blurRadius: 12, offset: const Offset(0, 6)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(icon, color: Colors.white, size: 22),
                  const SizedBox(width: 8),
                  Text(title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
                ],
              ),
              if (value == "New!")
                Text("New!", style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 12, fontWeight: FontWeight.w500)),
            ],
          ),
          const SizedBox(height: 16),
          if (description != null)
            Text(description, style: TextStyle(color: Colors.white.withOpacity(0.9), fontSize: 14, height: 1.4)),
          if (description == null)
            Text(value, style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)),
          
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton(
              onPressed: onTap,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: gradient[1],
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: Text(buttonText, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildModernCard(bool isDark, ThemeData theme, {required Widget child, EdgeInsets padding = const EdgeInsets.all(16)}) {
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: isDark ? theme.cardColor : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: theme.dividerColor),
        boxShadow: isDark ? [] : [
           BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: child,
    );
  }

  Widget _buildRateListItem(Map<String, dynamic> rate, bool isDark, ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isDark ? Colors.white.withOpacity(0.05) : const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: isDark ? Colors.white.withOpacity(0.1) : theme.dividerColor.withOpacity(0.5)),
        ),
        child: Row(
          children: [
            Container(
              width: 36, height: 36,
              decoration: BoxDecoration(
                color: theme.cardColor,
                shape: BoxShape.circle,
                border: Border.all(color: theme.dividerColor),
              ),
              child: const Icon(Icons.credit_card, size: 18),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text("${rate['cardBrand'] ?? "Card"} (${rate['cardCountry'] ?? ""})", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: theme.colorScheme.onSurface)),
                  Text(rate['cardType'] ?? "Physical", style: const TextStyle(color: Colors.grey, fontSize: 10)),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text("${rate['effectiveRate'] ?? rate['rate']} GHS/\$", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF2563EB))),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTradeListItem(Map<String, dynamic> trade, bool isDark, ThemeData theme) {
    final status = trade['status'] as String;
    final isRejected = status == "REJECTED";
    final isPaid = status == "PAID";
    
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(border: Border(bottom: BorderSide(color: theme.dividerColor.withOpacity(0.1)))),
        child: Row(
          children: [
            Container(
              width: 40, height: 40,
              decoration: BoxDecoration(
                color: isRejected ? Colors.red[50] : (isPaid ? Colors.green[50] : Colors.blue[50]),
                shape: BoxShape.circle,
              ),
              child: Icon(
                isRejected ? Icons.close : (isPaid ? Icons.check : Icons.access_time),
                size: 18, 
                color: isRejected ? Colors.red : (isPaid ? Colors.green : Colors.blue),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(trade['cardBrand'] ?? "Trade", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  Text(DateFormat('MM/dd/yyyy').format(DateTime.parse(trade['createdAt'])), style: const TextStyle(color: Colors.grey, fontSize: 11)),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text("${trade['faceValue']} ${trade['currency']}", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: isRejected ? Colors.red : (isPaid ? Colors.green : Colors.orange),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(status.replaceAll("_", " "), style: const TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSupportButton({required IconData icon, required String title, required String subtitle, required Color color, required VoidCallback onTap}) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          border: Border.all(color: Colors.grey.withOpacity(0.2)),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Container(
              width: 40, height: 40,
              decoration: BoxDecoration(color: color.withOpacity(0.1), shape: BoxShape.circle),
              child: Center(child: Icon(icon, color: color, size: 20)),
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                Text(subtitle, style: const TextStyle(color: Colors.grey, fontSize: 11)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildVipCard(bool isDark, ThemeData theme) {
    final rawPts = _user['completedTradesCount'] ?? 0;
    final pts = rawPts is int ? rawPts : int.tryParse(rawPts.toString()) ?? 0;
    final currentTier = VipTiersConfig.calculateVipTier(pts);
    final nextTier = VipTiersConfig.getNextVipTier(currentTier.level);
    
    final tierColor = Color(int.parse(currentTier.colorHex.replaceFirst('#', '0xFF')));
    
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? theme.cardColor : const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text("VIP Status", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                decoration: BoxDecoration(color: tierColor, borderRadius: BorderRadius.circular(20)),
                child: Text(currentTier.name.toUpperCase(), style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          const SizedBox(height: 24),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text("$pts ", style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white)),
              const Padding(
                padding: EdgeInsets.only(bottom: 6),
                child: Text("VIP Pts", style: TextStyle(color: Colors.white70, fontSize: 16)),
              ),
            ],
          ),
          const Text("Accumulated from successful trades", style: TextStyle(color: Colors.white54, fontSize: 12)),
          const SizedBox(height: 24),
          if (nextTier != null) ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text("Progress to ${nextTier.name}", style: const TextStyle(color: Colors.white, fontSize: 13)),
                Text("$pts / ${nextTier.minTrades} Pts", style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
              ],
            ),
            const SizedBox(height: 8),
            LinearProgressIndicator(
              value: (pts / nextTier.minTrades).clamp(0, 1).toDouble(), 
              backgroundColor: Colors.white12, 
              color: const Color(0xFFEAB308), 
              minHeight: 6, 
              borderRadius: BorderRadius.circular(10)
            ),
          ] else ...[
             const Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text("Max VIP Level Reached", style: TextStyle(color: Colors.white, fontSize: 13)),
                Text("Max", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
              ],
            ),
            const SizedBox(height: 8),
            LinearProgressIndicator(
              value: 1.0, 
              backgroundColor: Colors.white12, 
              color: const Color(0xFFEAB308), 
              minHeight: 6, 
              borderRadius: BorderRadius.circular(10)
            ),
          ],
          const SizedBox(height: 12),
          Text("Benefit: ${currentTier.multiplier}x Reward Multiplier", style: const TextStyle(color: Colors.white54, fontSize: 12, fontStyle: FontStyle.italic)),
        ],
      ),
    );
  }

  Widget _buildQuickAction(IconData icon, String label, Color color, ThemeData theme, bool isDark, {VoidCallback? onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        children: [
          Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
              color: isDark ? theme.cardColor : Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: isDark ? [] : [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 4))],
              border: Border.all(color: theme.dividerColor),
            ),
            child: Icon(icon, color: color, size: 28),
          ),
          const SizedBox(height: 8),
          Text(label, style: TextStyle(fontWeight: FontWeight.w600, fontSize: 12, color: theme.colorScheme.onSurface)),
        ],
      ),
    );
  }

  Widget _buildUserPanelDrawer() {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Drawer(
      backgroundColor: theme.cardColor,
      child: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text("User Panel", style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: theme.colorScheme.onSurface)),
                      IconButton(icon: Icon(Icons.close, color: theme.colorScheme.onSurface), onPressed: () => Navigator.pop(context)),
                    ],
                  ),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text("@${_user['username']}", style: const TextStyle(color: Color(0xFF2563EB), fontWeight: FontWeight.w600)),
                      TextButton(
                        onPressed: () {
                          Navigator.pop(context);
                          Navigator.push(context, MaterialPageRoute(builder: (_) => const SettingsScreen()));
                        },
                        style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: Size.zero, tapTargetSize: MaterialTapTargetSize.shrinkWrap),
                        child: Text("Edit Profile", style: TextStyle(fontSize: 12, color: isDark ? Colors.white54 : Colors.grey, decoration: TextDecoration.underline)),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            Divider(height: 1, color: theme.dividerColor),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: ElevatedButton.icon(
                onPressed: () {
                  Navigator.pop(context); // Close Drawer
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const SellCardScreen()));
                },
                icon: const Icon(Icons.add, color: Colors.white, size: 18),
                label: const Text("Sell Gift Card", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF2563EB),
                  alignment: Alignment.centerLeft,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),
            ),
            _buildDrawerItem("Dashboard Home", Icons.home_outlined, isSelected: true),
            _buildDrawerItem("My Trades", Icons.receipt_long_outlined),
            _buildDrawerItem("Support Chat", Icons.chat_outlined, onTap: () {
              Navigator.pop(context);
              Navigator.push(context, MaterialPageRoute(builder: (context) => GeneralSupportChatScreen(user: _user)));
            }),
            _buildDrawerItem("Leaderboard", Icons.emoji_events_outlined),
            _buildDrawerItem("Referrals", Icons.people_outline),
            _buildDrawerItem("Settings", Icons.settings_outlined),
            _buildDrawerItem("Security & Sessions", Icons.shield_outlined),
            const SizedBox(height: 20),
            
            // Lifetime Stats
            Container(
              padding: const EdgeInsets.all(20),
              color: isDark ? theme.scaffoldBackgroundColor : const Color(0xFFF8FAFC),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text("LIFETIME STATISTICS", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
                  const SizedBox(height: 16),
                  
                  _buildStatBox("Total Trades", "${_user['stats']?['totalTrades'] ?? 0}", theme, isDark),
                  const SizedBox(height: 10),
                  _buildStatBox("Pending", "${_user['stats']?['pending'] ?? 0}", theme, isDark, valueColor: Colors.orange),
                  const SizedBox(height: 10),
                  
                  Row(
                    children: [
                      Expanded(child: _buildStatBox("Successful", "${_user['stats']?['successful'] ?? 0}", theme, isDark, valueColor: Colors.green)),
                      const SizedBox(width: 10),
                      Expanded(child: _buildStatBox("Rejected", "${_user['stats']?['rejected'] ?? 0}", theme, isDark, valueColor: Colors.red)),
                    ],
                  ),
                  const SizedBox(height: 10),

                  _buildStatBox("Total Received (₵)", "₵ ${(_user['stats']?['totalReceivedGHS'] ?? 0).toStringAsFixed(2)}", theme, isDark, isFullWidth: true),
                  const SizedBox(height: 10),
                  _buildStatBox("Total Volume (\$)", "\$ ${(_user['stats']?['totalVolumeUSD'] ?? 0).toStringAsFixed(2)}", theme, isDark, isFullWidth: true, valueColor: const Color(0xFF2563EB)),
                  
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    child: TextButton.icon(
                      onPressed: _logout,
                      icon: const Icon(Icons.logout, color: Colors.red, size: 18),
                      label: const Text("Log Out", style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

  Widget _buildDrawerItem(String title, IconData icon, {bool isSelected = false, VoidCallback? onTap}) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return InkWell(
      onTap: onTap ?? () {
        if (title == "My Trades") {
          Navigator.pop(context); // Close Drawer
          Navigator.push(context, MaterialPageRoute(builder: (_) => const TradesScreen()));
        } else if (title == "Leaderboard") {
          Navigator.pop(context);
          Navigator.push(context, MaterialPageRoute(builder: (_) => const LeaderboardScreen()));
        } else if (title == "Referrals") {
          Navigator.pop(context);
          Navigator.push(context, MaterialPageRoute(builder: (_) => const ReferralsScreen()));
        } else if (title == "Settings" || title == "Security & Sessions") {
          Navigator.pop(context);
          Navigator.push(context, MaterialPageRoute(builder: (_) => const SettingsScreen()));
        }
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        child: Row(
          children: [
            Icon(
              icon,
              size: 20,
              color: isSelected ? const Color(0xFF2563EB) : (isDark ? Colors.white54 : const Color(0xFF64748B)),
            ),
            const SizedBox(width: 16),
            Text(
              title,
              style: TextStyle(
                fontSize: 15,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                color: isSelected ? const Color(0xFF2563EB) : (isDark ? Colors.white70 : const Color(0xFF475569)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatBox(String title, String value, ThemeData theme, bool isDark, {Color? valueColor, bool isFullWidth = true}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: theme.dividerColor.withOpacity(0.5)),
        boxShadow: isDark ? [] : [
          BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 4, offset: const Offset(0, 2)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontSize: 12, color: Colors.grey, fontWeight: FontWeight.w500)),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: valueColor ?? theme.colorScheme.onSurface,
            ),
          ),
        ],
      ),
    );
  }
}
