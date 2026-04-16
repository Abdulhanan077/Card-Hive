import 'package:flutter/material.dart';
import 'package:mycardhive_mobile/services/auth_service.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mycardhive_mobile/ui/screens/admin/admin_trades_screen.dart';
import 'package:mycardhive_mobile/ui/screens/admin/admin_rewards_screen.dart';
import 'package:mycardhive_mobile/ui/screens/admin/admin_status_updates_screen.dart';
import 'package:mycardhive_mobile/ui/screens/admin/admin_rates_screen.dart';
import 'package:mycardhive_mobile/ui/screens/admin/admin_users_screen.dart';

class AdminDashboardScreen extends StatefulWidget {
  final dynamic user;
  const AdminDashboardScreen({super.key, required this.user});

  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen> {
  final AuthService _authService = AuthService();
  bool _isLoading = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
      appBar: AppBar(
        elevation: 0,
        backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
        title: Text(
          "Admin Portal",
          style: GoogleFonts.outfit(
            fontWeight: FontWeight.bold,
            color: theme.colorScheme.onSurface,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_rounded, color: Colors.red),
            onPressed: () async {
              await _authService.logout();
              if (mounted) Navigator.pushReplacementNamed(context, '/login');
            },
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildWelcomeHeader(theme, isDark),
            const SizedBox(height: 24),
            Text(
              "Quick Stats",
              style: GoogleFonts.outfit(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: theme.colorScheme.onSurface,
              ),
            ),
            const SizedBox(height: 16),
            _buildStatsGrid(theme, isDark),
            const SizedBox(height: 32),
            Text(
              "Management",
              style: GoogleFonts.outfit(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: theme.colorScheme.onSurface,
              ),
            ),
            const SizedBox(height: 16),
            _buildAdminMenu(theme, isDark),
          ],
        ),
      ),
    );
  }

  Widget _buildWelcomeHeader(ThemeData theme, bool isDark) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF2563EB), Color(0xFF1E40AF)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF2563EB).withOpacity(0.3),
            blurRadius: 15,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const CircleAvatar(
                radius: 20,
                backgroundColor: Colors.white24,
                child: Text("👑", style: TextStyle(fontSize: 20)),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    "Master Control",
                    style: GoogleFonts.outfit(
                      color: Colors.white.withOpacity(0.8),
                      fontSize: 14,
                    ),
                  ),
                  Text(
                    "Admin ${widget.user['username']}",
                    style: GoogleFonts.outfit(
                      color: Colors.white,
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatsGrid(ThemeData theme, bool isDark) {
    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 2,
      childAspectRatio: 1.5,
      crossAxisSpacing: 16,
      mainAxisSpacing: 16,
      children: [
        _buildStatCard(
          title: "Pending Trades",
          value: "---",
          icon: Icons.hourglass_empty_rounded,
          color: Colors.orange,
          isDark: isDark,
        ),
        _buildStatCard(
          title: "Active Users",
          value: "---",
          icon: Icons.people_rounded,
          color: Colors.blue,
          isDark: isDark,
        ),
        _buildStatCard(
          title: "Today's Vol.",
          value: "GHS ---",
          icon: Icons.bar_chart_rounded,
          color: Colors.green,
          isDark: isDark,
        ),
        _buildStatCard(
          title: "Rates Sync",
          value: "Active",
          icon: Icons.sync_rounded,
          color: Colors.purple,
          isDark: isDark,
        ),
      ],
    );
  }

  Widget _buildStatCard({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
    required bool isDark,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? Colors.white10 : Colors.black.withOpacity(0.05),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Icon(icon, color: color, size: 24),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                value,
                style: GoogleFonts.outfit(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white : Colors.black87,
                ),
              ),
              Text(
                title,
                style: GoogleFonts.outfit(
                  fontSize: 12,
                  color: isDark ? Colors.white54 : Colors.black54,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildAdminMenu(ThemeData theme, bool isDark) {
    return Column(
      children: [
        _buildMenuItem(
          title: "Manage Trades",
          subtitle: "Review pending gift cards",
          icon: Icons.receipt_long_rounded,
          color: const Color(0xFF2563EB),
          isDark: isDark,
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const AdminTradesScreen()),
            );
          },
        ),
        const SizedBox(height: 12),
        _buildMenuItem(
          title: "Update Rates",
          subtitle: "Modify brand exchange rates",
          icon: Icons.trending_up_rounded,
          color: const Color(0xFF10B981),
          isDark: isDark,
          onTap: () {
            Navigator.push(context, MaterialPageRoute(builder: (context) => const AdminRatesScreen()));
          },
        ),
        const SizedBox(height: 12),
        _buildMenuItem(
          title: "Redemptions",
          subtitle: "Process reward requests",
          icon: Icons.redeem_rounded,
          color: Colors.orange,
          isDark: isDark,
          onTap: () {
            Navigator.push(context, MaterialPageRoute(builder: (context) => const AdminRewardsScreen()));
          },
        ),
        const SizedBox(height: 12),
        _buildMenuItem(
          title: "Status Updates",
          subtitle: "Post public broadcasts",
          icon: Icons.campaign_rounded,
          color: Colors.teal,
          isDark: isDark,
          onTap: () {
            Navigator.push(context, MaterialPageRoute(builder: (context) => const AdminStatusUpdatesScreen()));
          },
        ),
        const SizedBox(height: 12),
        _buildMenuItem(
          title: "User Management",
          subtitle: "View users and history",
          icon: Icons.person_search_rounded,
          color: const Color(0xFF8B5CF6),
          isDark: isDark,
          onTap: () {
            Navigator.push(context, MaterialPageRoute(builder: (context) => const AdminUsersScreen()));
          },
        ),
      ],
    );
  }

  Widget _buildMenuItem({
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required bool isDark,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1E293B) : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isDark ? Colors.white10 : Colors.black.withOpacity(0.05),
          ),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: color),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: GoogleFonts.outfit(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: isDark ? Colors.white : Colors.black87,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: GoogleFonts.outfit(
                      fontSize: 13,
                      color: isDark ? Colors.white54 : Colors.black54,
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              Icons.chevron_right_rounded,
              color: isDark ? Colors.white24 : Colors.black26,
            ),
          ],
        ),
      ),
    );
  }
}
