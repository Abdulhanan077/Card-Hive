import 'package:flutter/material.dart';
import 'package:mycardhive_mobile/services/admin_service.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:mycardhive_mobile/ui/screens/admin/admin_trade_detail_screen.dart';

class AdminNotificationsScreen extends StatefulWidget {
  const AdminNotificationsScreen({super.key});

  @override
  State<AdminNotificationsScreen> createState() => _AdminNotificationsScreenState();
}

class _AdminNotificationsScreenState extends State<AdminNotificationsScreen> {
  final AdminService _adminService = AdminService();
  List<dynamic> _notifications = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadNotifications();
  }

  Future<void> _loadNotifications() async {
    setState(() => _isLoading = true);
    final result = await _adminService.fetchNotifications();
    if (mounted) {
      if (result['success'] == true) {
        setState(() {
          _notifications = result['notifications'] ?? [];
          _isLoading = false;
        });
      } else {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(result['error'] ?? "Failed to load notifications")));
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
        title: Text("Admin Notifications", style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(onPressed: _loadNotifications, icon: const Icon(Icons.refresh_rounded)),
        ],
      ),
      body: _isLoading 
        ? const Center(child: CircularProgressIndicator())
        : _notifications.isEmpty
          ? _buildEmptyState(isDark)
          : RefreshIndicator(
              onRefresh: _loadNotifications,
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: _notifications.length,
                itemBuilder: (context, index) => _buildNotificationListTile(_notifications[index], isDark, theme),
              ),
            ),
    );
  }

  Widget _buildEmptyState(bool isDark) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.notifications_none_rounded, size: 60, color: Colors.grey.withOpacity(0.2)),
          const SizedBox(height: 16),
          const Text("No pending alerts.", style: TextStyle(color: Colors.grey, fontWeight: FontWeight.bold)),
          const Text("Check back later for new activity.", style: TextStyle(color: Colors.grey, fontSize: 12)),
        ],
      ),
    );
  }

  Widget _buildNotificationListTile(dynamic notif, bool isDark, ThemeData theme) {
    final type = notif['type'];
    final time = DateTime.parse(notif['time']);
    
    IconData icon;
    Color iconColor;
    
    switch (type) {
      case 'TRADE_PENDING':
        icon = Icons.shopping_bag_outlined;
        iconColor = Colors.orange;
        break;
      case 'MESSAGE':
        icon = Icons.chat_bubble_outline_rounded;
        iconColor = Colors.blue;
        break;
      case 'REDEMPTION':
        icon = Icons.card_giftcard_rounded;
        iconColor = Colors.purple;
        break;
      default:
        icon = Icons.notifications_none_rounded;
        iconColor = Colors.grey;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? Colors.white10 : Colors.black.withOpacity(0.05)),
      ),
      child: ListTile(
        onTap: () => _handleNotifClick(notif),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(color: iconColor.withOpacity(0.1), shape: BoxShape.circle),
          child: Icon(icon, color: iconColor, size: 22),
        ),
        title: Text(notif['title'], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Text(notif['body'], style: TextStyle(fontSize: 12, color: isDark ? Colors.white70 : Colors.black87)),
            const SizedBox(height: 8),
            Text(DateFormat('MMM d, h:mm a').format(time.toLocal()), style: const TextStyle(fontSize: 10, color: Colors.grey)),
          ],
        ),
        trailing: const Icon(Icons.chevron_right_rounded, size: 20, color: Colors.grey),
      ),
    );
  }

  void _handleNotifClick(dynamic notif) {
    final data = notif['data'];
    if (data == null) return;

    final route = data['route']?.toString();
    final id = data['tradeId'] ?? data['redemptionId'];

    if (route == 'TRADE' || route == 'CHAT' || (route == null && data['tradeId'] != null)) {
      Navigator.of(context).push(MaterialPageRoute(builder: (context) => AdminTradeDetailScreen(tradeId: id.toString())));
    } else if (route == 'REDEMPTION') {
      // In future we could navigate to redemptions list, for now just show alert
       ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Action required on Reward Redemptions list.")));
    }
  }
}
