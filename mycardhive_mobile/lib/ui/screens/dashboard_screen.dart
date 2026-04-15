import 'package:flutter/material.dart';
import 'package:mycardhive_mobile/services/auth_service.dart';
import 'package:mycardhive_mobile/main.dart';
import 'package:mycardhive_mobile/ui/screens/sell_card_screen.dart';

class DashboardScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  
  const DashboardScreen({super.key, required this.user});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final AuthService _authService = AuthService();

  void _logout() async {
    await _authService.logout();
    if (!mounted) return;
    Navigator.pushAndRemoveUntil(context, MaterialPageRoute(builder: (_) => const HomeScreen()), (route) => false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Image.asset('assets/logo.png', height: 28),
        backgroundColor: Colors.white,
        centerTitle: false,
        elevation: 1,
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_none, color: Colors.black87),
            onPressed: () {},
          ),
          Builder(
            builder: (context) => IconButton(
              icon: const Icon(Icons.menu, color: Colors.black87),
              onPressed: () => Scaffold.of(context).openEndDrawer(),
            ),
          ),
        ],
      ),
      endDrawer: _buildUserPanelDrawer(),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Welcome Banner
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: const Color(0xFFEFF6FF),
                border: Border.all(color: const Color(0xFFBFDBFE)),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  const Icon(Icons.info_outline, color: Color(0xFF2563EB)),
                  const SizedBox(width: 12),
                  Expanded(
                    child: RichText(
                      text: TextSpan(
                        style: const TextStyle(color: Color(0xFF1E3A8A), fontSize: 13, height: 1.4),
                        children: [
                          const TextSpan(text: "Welcome to Card Hive! ", style: TextStyle(fontWeight: FontWeight.bold)),
                          TextSpan(text: "Keep submitting gift cards to climb the VIP Tiers and multiply your Reward Points."),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Latest Promotions
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF8B5CF6), Color(0xFF6366F1)], // Purple to Indigo
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text("Latest Promotions", style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  const Text(
                    "Discover the best exchange rates and start selling your unused gift cards today to maximize your payouts.",
                    style: TextStyle(color: Colors.white70, fontSize: 14),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () {
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const SellCardScreen()));
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: const Color(0xFF6366F1),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    child: const Text("Sell Now", style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // VIP Status
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text("VIP Status", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(color: const Color(0xFFB45309), borderRadius: BorderRadius.circular(20)),
                        child: const Text("BRONZE", style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  RichText(
                    text: const TextSpan(
                      children: [
                        TextSpan(text: "5 ", style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white)),
                        TextSpan(text: "VIP Pts", style: TextStyle(color: Colors.white70)),
                      ],
                    ),
                  ),
                  const Text("Accumulated from successful trades", style: TextStyle(color: Colors.white54, fontSize: 12)),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: const [
                      Text("Progress to Silver", style: TextStyle(color: Colors.white, fontSize: 12)),
                      Text("5 / 51 Pts", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  LinearProgressIndicator(value: 5 / 51, backgroundColor: Colors.white24, color: const Color(0xFFEAB308), minHeight: 6, borderRadius: BorderRadius.circular(10)),
                  const SizedBox(height: 8),
                  const Text("Benefit: 1.5x Reward Multiplier", style: TextStyle(color: Colors.white54, fontSize: 11, fontStyle: FontStyle.italic)),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Grid items: Wallet & Referrals
            Row(
              children: [
                Expanded(
                  child: Container(
                    height: 140,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(color: const Color(0xFF9333EA), borderRadius: BorderRadius.circular(16)),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text("My Wallet (Reward Pts)", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                        const Spacer(),
                        const Text("1,112 pts", style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)),
                        const Spacer(),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: () {},
                            style: ElevatedButton.styleFrom(backgroundColor: Colors.white, foregroundColor: const Color(0xFF9333EA), padding: EdgeInsets.zero),
                            child: const Text("View Rewards"),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Container(
                    height: 140,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(color: const Color(0xFF2563EB), borderRadius: BorderRadius.circular(16)),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: const [
                            Expanded(child: Text("Referral Rewards", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12))),
                            Text("New!", style: TextStyle(color: Colors.white70, fontSize: 10)),
                          ],
                        ),
                        const SizedBox(height: 8),
                        const Text("Track your referrals, bonuses, and earnings.", style: TextStyle(color: Colors.white70, fontSize: 11)),
                        const Spacer(),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: () {},
                            style: ElevatedButton.styleFrom(backgroundColor: Colors.white, foregroundColor: const Color(0xFF2563EB), padding: EdgeInsets.zero),
                            child: const Text("Open Hub"),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Quick Actions
            const Text("Quick Actions", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildQuickAction(Icons.credit_card, "Sell Card", Colors.blue, onTap: () {
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const SellCardScreen()));
                }),
                _buildQuickAction(Icons.bar_chart, "History", Colors.green, onTap: () {}),
                _buildQuickAction(Icons.settings, "Settings", Colors.grey, onTap: () {}),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickAction(IconData icon, String label, Color color, {VoidCallback? onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        children: [
          Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 4))],
              border: Border.all(color: Colors.grey.withOpacity(0.1)),
            ),
            child: Icon(icon, color: color, size: 28),
          ),
          const SizedBox(height: 8),
          Text(label, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
        ],
      ),
    );
  }

  Widget _buildUserPanelDrawer() {
    return Drawer(
      backgroundColor: Colors.white,
      child: SafeArea(
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
                      const Text("User Panel", style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                      IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
                    ],
                  ),
                  Text("@${widget.user['username']}", style: const TextStyle(color: Color(0xFF2563EB), fontWeight: FontWeight.w600)),
                ],
              ),
            ),
            const Divider(height: 1),
            _buildDrawerItem("Dashboard Home", isSelected: true),
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
            _buildDrawerItem("My Trades"),
            _buildDrawerItem("Leaderboard"),
            _buildDrawerItem("Referrals"),
            _buildDrawerItem("Settings"),
            _buildDrawerItem("Security & Sessions"),
            const Spacer(),
            
            // Lifetime Stats
            Container(
              padding: const EdgeInsets.all(20),
              color: const Color(0xFFF8FAFC),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text("LIFETIME STATISTICS", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.grey.withOpacity(0.2))),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                         Text("Total Trades", style: TextStyle(fontSize: 12, color: Colors.grey)),
                         Text("13", style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _logout,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.red[50],
                        foregroundColor: Colors.red[700],
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      child: const Text("Logout"),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDrawerItem(String title, {bool isSelected = false}) {
    return InkWell(
      onTap: () {},
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        child: Text(
          title,
          style: TextStyle(
            fontSize: 15,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
            color: isSelected ? const Color(0xFF0F172A) : const Color(0xFF475569),
          ),
        ),
      ),
    );
  }
}
