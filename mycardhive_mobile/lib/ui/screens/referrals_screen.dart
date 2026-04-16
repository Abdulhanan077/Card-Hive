import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:intl/intl.dart';
import 'package:mycardhive_mobile/services/referral_service.dart';

class ReferralsScreen extends StatefulWidget {
  const ReferralsScreen({super.key});

  @override
  State<ReferralsScreen> createState() => _ReferralsScreenState();
}

class _ReferralsScreenState extends State<ReferralsScreen> {
  final ReferralService _referralService = ReferralService();
  bool _isLoading = true;
  
  Map<String, dynamic>? _userData;
  Map<String, dynamic> _stats = {
    'invitesSent': 0,
    'registrations': 0,
    'activeReferrals': 0,
    'totalEarnings': 0
  };
  List<dynamic> _referralsList = [];

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  Future<void> _fetchData() async {
    try {
      final data = await _referralService.getReferralStats();
      if (!mounted) return;
      setState(() {
        _userData = data['userData'];
        if (data['stats'] != null) _stats = data['stats'];
        _referralsList = data['referralsList'] ?? [];
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString()), backgroundColor: Colors.red));
    }
  }

  void _copyToClipboard(String text) {
    Clipboard.setData(ClipboardData(text: text));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text("Copied to clipboard!"), backgroundColor: Color(0xFF10B981)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final referralCode = _userData?['referralCode'] ?? "---";
    final referralLink = referralCode != "---" ? "https://mycardhive.com/register?ref=$referralCode" : "---";

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text("Referrals", style: TextStyle(color: theme.colorScheme.onSurface, fontWeight: FontWeight.bold)),
        backgroundColor: theme.cardColor,
        elevation: 1,
        centerTitle: true,
        leading: IconButton(icon: Icon(Icons.arrow_back_ios_new, color: theme.colorScheme.onSurface), onPressed: () => Navigator.pop(context)),
      ),
      body: _isLoading 
        ? const Center(child: CircularProgressIndicator())
        : RefreshIndicator(
            onRefresh: _fetchData,
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Hero Card
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(colors: [Color(0xFF4F46E5), Color(0xFF7C3AED)], begin: Alignment.topLeft, end: Alignment.bottomRight),
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: const [BoxShadow(color: Color(0x334F46E5), offset: Offset(0, 10), blurRadius: 20)],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Expanded(child: Text("Your Referral Code", style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900))),
                            InkWell(
                              onTap: () => _copyToClipboard(referralCode),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                decoration: BoxDecoration(color: Colors.white.withOpacity(0.15), borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.white.withOpacity(0.3))),
                                child: const Row(
                                  children: [Icon(Icons.copy, color: Colors.white, size: 14), SizedBox(width: 4), Text("Copy", style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold))],
                                ),
                              ),
                            )
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text("Share your code and earn rewards when friends join!", style: TextStyle(color: Colors.white.withOpacity(0.9), fontSize: 12)),
                        const SizedBox(height: 24),
                        // Code Box
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(color: Colors.black.withOpacity(0.2), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.white.withOpacity(0.1))),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text("CODE", style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1)),
                              const SizedBox(height: 4),
                              Text(referralCode, style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w900, letterSpacing: 2)),
                            ],
                          ),
                        ),
                        const SizedBox(height: 12),
                        // Link Box
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(color: Colors.black.withOpacity(0.2), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.white.withOpacity(0.1))),
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text("REFERRAL LINK", style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1)),
                                    const SizedBox(height: 4),
                                    Text(referralLink, style: TextStyle(color: Colors.white.withOpacity(0.9), fontSize: 13), overflow: TextOverflow.ellipsis),
                                  ],
                                ),
                              ),
                              IconButton(icon: const Icon(Icons.copy, color: Colors.white), onPressed: () => _copyToClipboard(referralLink)),
                            ],
                          ),
                        )
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  // Stats Grid
                  Row(
                    children: [
                      _buildStatCard(Icons.share, const Color(0xFF4F46E5), _stats['invitesSent'].toString(), "Invites Sent", theme, isDark),
                      const SizedBox(width: 12),
                      _buildStatCard(Icons.people, const Color(0xFF10B981), _stats['registrations'].toString(), "Registrations", theme, isDark),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      _buildStatCard(Icons.check_circle, const Color(0xFF3B82F6), _stats['activeReferrals'].toString(), "Qualified", theme, isDark),
                      const SizedBox(width: 12),
                      _buildStatCard(Icons.monetization_on, const Color(0xFFF59E0B), "GHS ${NumberFormat('#,##0').format(_stats['totalEarnings'] ?? 0)}", "Total Earnings", theme, isDark),
                    ],
                  ),

                  const SizedBox(height: 24),

                  // Middle Section: Share Your Code & Earnings Breakdown
                  _buildShareCard(referralLink),
                  const SizedBox(height: 16),
                  _buildEarningsBreakdownCard(),

                  const SizedBox(height: 24),

                  // My Referrals List
                  Text("My Referrals", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: theme.colorScheme.onSurface)),
                  const SizedBox(height: 4),
                  Text("A list of users you have invited and their status.", style: TextStyle(fontSize: 12, color: isDark ? Colors.white54 : const Color(0xFF64748B))),
                  const SizedBox(height: 16),

                  if (_referralsList.isEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(vertical: 40),
                      alignment: Alignment.center,
                      decoration: BoxDecoration(color: theme.cardColor, borderRadius: BorderRadius.circular(12), border: Border.all(color: theme.dividerColor)),
                      child: Text("No referrals yet.\nShare your code to start earning!", textAlign: TextAlign.center, style: TextStyle(color: isDark ? Colors.white30 : const Color(0xFF94A3B8), fontStyle: FontStyle.italic)),
                    )
                  else
                    Column(
                      children: _referralsList.map((ref) => _buildReferralRow(ref)).toList(),
                    ),
                ],
              ),
            ),
          ),
    );
  }

  Widget _buildStatCard(IconData icon, Color color, String value, String label, ThemeData theme, bool isDark) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: theme.cardColor, borderRadius: BorderRadius.circular(12), border: Border.all(color: theme.dividerColor)),
        child: Column(
          children: [
            Icon(icon, color: color, size: 28),
            const SizedBox(height: 12),
            Text(value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: theme.colorScheme.onSurface)),
            const SizedBox(height: 4),
            Text(label, style: TextStyle(fontSize: 11, color: isDark ? Colors.white54 : const Color(0xFF64748B)), textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }

  Widget _buildReferralRow(dynamic ref) {
    final username = ref['username'] ?? 'Unknown';
    final joinedAt = ref['joinedAt'];
    final dateFormatted = joinedAt != null ? DateFormat('MM/dd/yy').format(DateTime.parse(joinedAt)) : 'N/A';
    final points = ref['pointsEarned'] ?? 0;
    final isActive = ref['isActive'] == true;
    final isBlocked = ref['status'] == 'BLOCKED';

    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: theme.cardColor, borderRadius: BorderRadius.circular(12), border: Border.all(color: theme.dividerColor)),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Left Side: Name and Date
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text("@$username", style: TextStyle(fontWeight: FontWeight.bold, color: theme.colorScheme.onSurface, fontSize: 14)),
              const SizedBox(height: 4),
              Text(dateFormatted, style: TextStyle(color: isDark ? Colors.white54 : const Color(0xFF64748B), fontSize: 11)),
            ],
          ),
          // Right Side: Status and Points
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text("+$points", style: const TextStyle(color: Color(0xFF4F46E5), fontWeight: FontWeight.w900, fontSize: 16)),
              const SizedBox(height: 4),
              if (isBlocked)
                Container(padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2), decoration: BoxDecoration(color: const Color(0xFFEF4444), borderRadius: BorderRadius.circular(4)), child: const Text("BLOCKED", style: TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.bold)))
              else if (isActive)
                Container(padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2), decoration: BoxDecoration(color: const Color(0xFFD1FAE5), borderRadius: BorderRadius.circular(4)), child: const Text("QUALIFIED", style: TextStyle(color: Color(0xFF10B981), fontSize: 8, fontWeight: FontWeight.bold)))
              else
                Container(padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2), decoration: BoxDecoration(color: isDark ? theme.scaffoldBackgroundColor : const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(4)), child: Text("PENDING", style: TextStyle(color: isDark ? Colors.white30 : const Color(0xFF64748B), fontSize: 8, fontWeight: FontWeight.bold)))
            ],
          )
        ],
      ),
    );
  }

  Widget _buildShareCard(String link) {
    if (link == "---") return const SizedBox.shrink();
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: theme.cardColor, borderRadius: BorderRadius.circular(12), border: Border.all(color: theme.dividerColor)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text("Share Your Code", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: theme.colorScheme.onSurface)),
          const SizedBox(height: 16),
          Text("Social Media", style: TextStyle(fontSize: 12, color: isDark ? Colors.white54 : const Color(0xFF64748B))),
          const SizedBox(height: 8),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildSocialBtn("Facebook", Icons.facebook, const Color(0xFF1877F2), () {
                  _launchShare('https://www.facebook.com/sharer/sharer.php?u=${Uri.encodeComponent(link)}');
                }),
                _buildSocialBtn("Twitter", Icons.flutter_dash, const Color(0xFF1DA1F2), () {
                  _launchShare('https://twitter.com/intent/tweet?text=${Uri.encodeComponent("Trade gift cards and crypto on Card Hive! Use my referral code to get started:")}&url=${Uri.encodeComponent(link)}');
                }),
                _buildSocialBtn("WhatsApp", Icons.chat_bubble, const Color(0xFF25D366), () {
                  _launchShare('https://wa.me/?text=${Uri.encodeComponent("Trade gift cards and crypto on Card Hive! Use my referral code to get started: $link")}');
                }),
                _buildSocialBtn("Telegram", Icons.send, const Color(0xFF0088CC), () {
                  _launchShare('https://t.me/share/url?url=${Uri.encodeComponent(link)}&text=${Uri.encodeComponent("Trade gift cards and crypto on Card Hive! Use my referral code to get started:")}');
                }),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Text("Messaging", style: TextStyle(fontSize: 12, color: isDark ? Colors.white54 : const Color(0xFF64748B))),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(child: _buildMsgBtn("SMS", Icons.sms, () {
                _launchShare('sms:?body=${Uri.encodeComponent("Trade gift cards and crypto on Card Hive! Use my referral code to get started: $link")}');
              })),
              const SizedBox(width: 8),
              Expanded(child: _buildMsgBtn("Email", Icons.email, () {
                _launchShare('mailto:?subject=${Uri.encodeComponent("Join Card Hive and Start Trading!")}&body=${Uri.encodeComponent("Trade gift cards and crypto on Card Hive! Use my referral code to get started: $link")}');
              })),
            ],
          ),
          const SizedBox(height: 24),
          Align(alignment: Alignment.centerLeft, child: Text("QR Code", style: TextStyle(fontSize: 12, color: isDark ? Colors.white54 : const Color(0xFF64748B)))),
          const SizedBox(height: 12),
          Center(
            child: Column(
              children: [
                Container(
                  width: 120, height: 120,
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: Colors.white, border: Border.all(color: theme.dividerColor), borderRadius: BorderRadius.circular(12)),
                  child: Image.network("https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${Uri.encodeComponent(link)}"),
                ),
                const SizedBox(height: 8),
                Text("Scan to share your referral code", style: TextStyle(fontSize: 10, color: isDark ? Colors.white30 : const Color(0xFF64748B))),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _launchShare(String urlString) async {
    final Uri url = Uri.parse(urlString);
    if (!await launchUrl(url, mode: LaunchMode.externalApplication)) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Could not launch app for sharing'), backgroundColor: Colors.red));
      }
    }
  }

  Widget _buildSocialBtn(String label, IconData icon, Color color, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(right: 8),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(20)),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: Colors.white, size: 12),
            const SizedBox(width: 6),
            Text(label, style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }

  Widget _buildMsgBtn(String label, IconData icon, VoidCallback onTap) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(color: isDark ? theme.scaffoldBackgroundColor : const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(8), border: Border.all(color: theme.dividerColor)),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: theme.colorScheme.onSurface, size: 14),
            const SizedBox(width: 6),
            Text(label, style: TextStyle(color: theme.colorScheme.onSurface, fontSize: 12, fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }

  Widget _buildEarningsBreakdownCard() {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final double total = double.tryParse(_stats['totalEarnings']?.toString() ?? '0') ?? 0.0;
    final bool hasReferrals = (_stats['registrations'] ?? 0) > 0;
    
    final double signupVal = hasReferrals ? total * 0.2 : 0.0;
    final double milestoneVal = hasReferrals ? total * 0.3 : 0.0;
    final double commissionVal = hasReferrals ? total * 0.5 : 0.0;

    // Chart heights relative to 120 max height
    final double maxVal = dataMax([signupVal, milestoneVal, commissionVal]);
    final double h1 = maxVal == 0 ? 0 : (signupVal / maxVal) * 120;
    final double h2 = maxVal == 0 ? 0 : (milestoneVal / maxVal) * 120;
    final double h3 = maxVal == 0 ? 0 : (commissionVal / maxVal) * 120;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: theme.cardColor, borderRadius: BorderRadius.circular(12), border: Border.all(color: theme.dividerColor)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text("Earnings Breakdown", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: theme.colorScheme.onSurface)),
          const SizedBox(height: 24),
          
          // Pure UI Chart
          SizedBox(
            height: 140,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                _buildBar(h1, "Signup", isDark),
                _buildBar(h2, "Milestone", isDark),
                _buildBar(h3, "Commissions", isDark),
              ],
            ),
          ),
          Divider(height: 32, color: theme.dividerColor),

          // Breakdown pills
          Row(
            children: [
              Expanded(child: _buildBreakdownItem("Signup Bonuses", signupVal, const Color(0xFF8B5CF6))),
              const SizedBox(width: 8),
              Expanded(child: _buildBreakdownItem("Milestone Bonuses", milestoneVal, const Color(0xFF10B981))),
              const SizedBox(width: 8),
              Expanded(child: _buildBreakdownItem("Commissions", commissionVal, const Color(0xFFF59E0B))),
            ],
          )
        ],
      ),
    );
  }

  double dataMax(List<double> vals) {
    double m = 0;
    for (var v in vals) { if (v > m) m = v; }
    return m == 0 ? 1 : m; // Prevent division by zero
  }

  Widget _buildBar(double height, String label, bool isDark) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        Container(
          width: 30,
          height: height > 0 ? height : 4,
          decoration: const BoxDecoration(
            color: Color(0xFF2563EB),
            borderRadius: BorderRadius.only(topLeft: Radius.circular(4), topRight: Radius.circular(4)),
          ),
        ),
        const SizedBox(height: 8),
        Text(label, style: TextStyle(fontSize: 9, color: isDark ? Colors.white54 : const Color(0xFF64748B))),
      ],
    );
  }

  Widget _buildBreakdownItem(String label, double value, Color color) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(color: isDark ? theme.scaffoldBackgroundColor : const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(8)),
      child: Column(
        children: [
          Container(width: 12, height: 4, decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(2))),
          const SizedBox(height: 4),
          Text(label, style: TextStyle(fontSize: 8, color: isDark ? Colors.white54 : const Color(0xFF64748B)), textAlign: TextAlign.center),
          const SizedBox(height: 4),
          Text("GH₵ ${value.toStringAsFixed(1)}", style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: theme.colorScheme.onSurface)),
        ],
      ),
    );
  }
}
