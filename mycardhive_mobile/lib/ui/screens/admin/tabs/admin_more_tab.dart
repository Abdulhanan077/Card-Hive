import 'package:flutter/material.dart';
import 'package:mycardhive_mobile/services/auth_service.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mycardhive_mobile/ui/screens/admin/admin_rates_screen.dart';
import 'package:mycardhive_mobile/ui/screens/admin/admin_security_logs_screen.dart';
import 'package:mycardhive_mobile/ui/screens/admin/admin_leaderboard_screen.dart';
import 'package:mycardhive_mobile/ui/screens/admin/admin_site_settings_screen.dart';
import 'package:mycardhive_mobile/ui/screens/home_screen.dart';
import 'package:mycardhive_mobile/ui/screens/admin/admin_support_sessions_screen.dart';
import 'package:mycardhive_mobile/ui/screens/admin/admin_rewards_screen.dart';
import 'package:mycardhive_mobile/ui/screens/admin/admin_status_updates_screen.dart';
import 'package:mycardhive_mobile/ui/screens/login_screen.dart';

class AdminMoreTab extends StatelessWidget {
  final dynamic user;
  const AdminMoreTab({super.key, required this.user});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final AuthService authService = AuthService();

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text("Admin Utilities", style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        centerTitle: false,
        elevation: 0,
        backgroundColor: Colors.transparent,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            _buildActionItem(
              title: "Manage Rates",
              icon: Icons.trending_up_rounded,
              color: Colors.blue,
              isDark: isDark,
              onTap: () {
                Navigator.of(context).push(MaterialPageRoute(builder: (context) => const AdminRatesScreen()));
              },
            ),
            const SizedBox(height: 12),
            _buildActionItem(
              title: "Security Logs",
              icon: Icons.security_rounded,
              color: Colors.orange,
              isDark: isDark,
              onTap: () {
                Navigator.of(context).push(MaterialPageRoute(builder: (context) => const AdminSecurityLogsScreen()));
              },
            ),
            const SizedBox(height: 12),
            _buildActionItem(
              title: "Leaderboard",
              icon: Icons.emoji_events_outlined,
              color: Colors.purple,
              isDark: isDark,
              onTap: () {
                Navigator.of(context).push(MaterialPageRoute(builder: (context) => const AdminLeaderboardScreen()));
              },
            ),
            const SizedBox(height: 12),
            _buildActionItem(
              title: "Live Support Inbox",
              icon: Icons.forum_rounded,
              color: const Color(0xFF2563EB),
              isDark: isDark,
              onTap: () {
                Navigator.of(context).push(MaterialPageRoute(builder: (context) => AdminSupportSessionsScreen(user: user)));
              },
            ),
            const SizedBox(height: 12),
            _buildActionItem(
              title: "Reward Redemptions",
              icon: Icons.redeem_rounded,
              color: Colors.green,
              isDark: isDark,
              onTap: () {
                Navigator.of(context).push(MaterialPageRoute(builder: (context) => const AdminRewardsScreen()));
              },
            ),
            const SizedBox(height: 12),
            _buildActionItem(
              title: "Public Status Updates",
              icon: Icons.campaign_rounded,
              color: Colors.teal,
              isDark: isDark,
              onTap: () {
                Navigator.of(context).push(MaterialPageRoute(builder: (context) => const AdminStatusUpdatesScreen()));
              },
            ),
            const SizedBox(height: 12),
            _buildActionItem(
              title: "Site Settings",
              icon: Icons.settings_outlined,
              color: Colors.blueGrey,
              isDark: isDark,
              onTap: () {
                Navigator.of(context).push(MaterialPageRoute(builder: (context) => const AdminSiteSettingsScreen()));
              },
            ),
            const SizedBox(height: 32),
            _buildActionItem(
              title: "Log Out",
              icon: Icons.logout_rounded,
              color: Colors.red,
              isDark: isDark,
              onTap: () async {
                await authService.logout();
                if (context.mounted) {
                    Navigator.of(context, rootNavigator: true).pushAndRemoveUntil(
                      MaterialPageRoute(builder: (context) => LoginScreen()),
                      (route) => false
                    );
                }
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionItem({
    required String title,
    required IconData icon,
    required Color color,
    required bool isDark,
    required VoidCallback onTap,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? Colors.white10 : Colors.black.withOpacity(0.05)),
      ),
      child: ListTile(
        onTap: onTap,
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: color, size: 20),
        ),
        title: Text(
          title,
          style: GoogleFonts.outfit(fontWeight: FontWeight.w600, fontSize: 15),
        ),
        trailing: const Icon(Icons.chevron_right_rounded, size: 20, color: Colors.grey),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
    );
  }
}
