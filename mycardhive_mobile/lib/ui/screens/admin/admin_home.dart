import 'package:flutter/material.dart';
import 'package:mycardhive_mobile/ui/screens/admin/tabs/admin_dashboard_tab.dart';
import 'package:mycardhive_mobile/ui/screens/admin/tabs/admin_trades_tab.dart';
import 'package:mycardhive_mobile/ui/screens/admin/tabs/admin_users_tab.dart';
import 'package:mycardhive_mobile/ui/screens/admin/tabs/admin_more_tab.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mycardhive_mobile/services/auth_service.dart';
import 'package:mycardhive_mobile/services/notification_service.dart';
import 'package:mycardhive_mobile/ui/screens/admin/admin_notifications_screen.dart';
import 'dart:async';

class AdminHome extends StatefulWidget {
  final dynamic user;
  const AdminHome({super.key, required this.user});

  @override
  State<AdminHome> createState() => _AdminHomeState();
}

class _AdminHomeState extends State<AdminHome> {
  final AuthService _authService = AuthService();
  int _currentIndex = 0;
  late List<Widget> _tabs;
  int _unreadCount = 0;
  Timer? _notifTimer;

  @override
  void initState() {
    super.initState();
    _tabs = [
      AdminDashboardTab(user: widget.user),
      const AdminTradesTab(),
      const AdminUsersTab(),
      AdminMoreTab(user: widget.user),
    ];
    _startPolling();
  }

  void _startPolling() {
    _checkNotifications();
    _notifTimer = Timer.periodic(const Duration(seconds: 30), (_) => _checkNotifications());
  }

  Future<void> _checkNotifications() async {
    final notifications = await NotificationService.getFilteredNotifications(_authService);
    if (mounted) {
      setState(() => _unreadCount = notifications.length);
    }
  }

  @override
  void dispose() {
    _notifTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        elevation: 0,
        backgroundColor: theme.scaffoldBackgroundColor,
        surfaceTintColor: Colors.transparent,
        title: Text(
          "Admin Portal",
          style: GoogleFonts.outfit(
            fontWeight: FontWeight.bold, 
            fontSize: 22,
            color: theme.colorScheme.onSurface,
          ),
        ),
        actions: [
          Stack(
            children: [
              IconButton(
                icon: Icon(Icons.notifications_none_rounded, color: theme.colorScheme.onSurface),
                onPressed: () {
                  Navigator.push(context, MaterialPageRoute(builder: (context) => const AdminNotificationsScreen())).then((_) => _checkNotifications());
                },
              ),
              if (_unreadCount > 0)
                Positioned(
                  top: 10, right: 10,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                    constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                    child: Text(
                      _unreadCount > 9 ? "9+" : "$_unreadCount",
                      style: const TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.bold),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: IndexedStack(
        index: _currentIndex,
        children: _tabs,
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: theme.cardColor,
          border: Border(top: BorderSide(color: theme.dividerColor)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.03),
              blurRadius: 10,
              offset: const Offset(0, -5),
            ),
          ],
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: (index) => setState(() => _currentIndex = index),
          type: BottomNavigationBarType.fixed,
          backgroundColor: Colors.transparent,
          elevation: 0,
          selectedItemColor: const Color(0xFF2563EB),
          unselectedItemColor: isDark ? Colors.white38 : const Color(0xFF94A3B8),
          selectedLabelStyle: GoogleFonts.outfit(fontWeight: FontWeight.w600, fontSize: 12),
          unselectedLabelStyle: GoogleFonts.outfit(fontWeight: FontWeight.w500, fontSize: 12),
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.dashboard_outlined),
              activeIcon: Icon(Icons.dashboard_rounded),
              label: 'Dashboard',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.receipt_long_outlined),
              activeIcon: Icon(Icons.receipt_long_rounded),
              label: 'Trades',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.people_outline_rounded),
              activeIcon: Icon(Icons.people_rounded),
              label: 'Users',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.more_horiz_rounded),
              activeIcon: Icon(Icons.more_horiz_rounded),
              label: 'More',
            ),
          ],
        ),
      ),
    );
  }
}
