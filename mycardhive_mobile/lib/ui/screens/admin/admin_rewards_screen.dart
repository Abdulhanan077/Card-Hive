import 'package:flutter/material.dart';
import 'package:mycardhive_mobile/services/admin_service.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

class AdminRewardsScreen extends StatefulWidget {
  const AdminRewardsScreen({super.key});

  @override
  State<AdminRewardsScreen> createState() => _AdminRewardsScreenState();
}

class _AdminRewardsScreenState extends State<AdminRewardsScreen> {
  final AdminService _adminService = AdminService();
  List<Map<String, dynamic>> _redemptions = [];
  bool _isLoading = true;
  double _ptsToGhs = 100.0;

  @override
  void initState() {
    super.initState();
    _loadRedemptions();
  }

  Future<void> _loadRedemptions() async {
    setState(() => _isLoading = true);
    final data = await _adminService.fetchRewardsQueue();
    if (data != null && data['success'] == true) {
      setState(() {
        _redemptions = List<Map<String, dynamic>>.from(data['redemptions'] ?? []);
        _ptsToGhs = (data['rate'] ?? 100.0).toDouble();
        _isLoading = false;
      });
    } else {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _processAction(int id, String status) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(status == 'PAID' ? "Mark as Paid?" : "Reject Request?"),
        content: Text("Are you sure you want to $status this redemption request?"),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text("Cancel")),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: status == 'PAID' ? Colors.green : Colors.red,
            ),
            child: Text(status == 'PAID' ? "Confirm Paid" : "Confirm Reject", style: const TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    final res = await _adminService.processRewardAction(id, status);
    if (res != null && res['success'] == true) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Redemption $status successfully")));
      _loadRedemptions();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(res?['message'] ?? "Action failed")));
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text("Reward Redemptions", style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        elevation: 0,
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadRedemptions,
              child: _redemptions.isEmpty
                  ? _buildEmptyState(isDark)
                  : ListView.builder(
                      padding: const EdgeInsets.all(20),
                      itemCount: _redemptions.length,
                      itemBuilder: (context, index) {
                        return _buildRedemptionCard(_redemptions[index], isDark, theme);
                      },
                    ),
            ),
    );
  }

  Widget _buildRedemptionCard(Map<String, dynamic> req, bool isDark, ThemeData theme) {
    final statusColor = _getStatusColor(req['status']);
    final date = DateTime.parse(req['createdAt']);
    final amountGhs = (req['pointsRedeemed'] / 100) * _ptsToGhs;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: isDark ? Colors.white10 : Colors.black.withOpacity(0.05)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  "@${req['user']['username']}",
                  style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16),
                ),
                _buildStatusBadge(req['status'], statusColor),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "${req['pointsRedeemed']} Points",
                        style: GoogleFonts.outfit(fontSize: 14, color: Colors.orange, fontWeight: FontWeight.bold),
                      ),
                      Text(
                        "GHS ${amountGhs.toStringAsFixed(2)}",
                        style: GoogleFonts.outfit(fontSize: 18, color: Colors.green, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
                Text(
                  DateFormat('MMM dd, yyyy').format(date),
                  style: GoogleFonts.outfit(fontSize: 12, color: Colors.grey),
                ),
              ],
            ),
            const Divider(height: 24),
            Row(
              children: [
                const Icon(Icons.account_balance_wallet_outlined, size: 16, color: Colors.grey),
                const SizedBox(width: 8),
                Text(
                  req['payoutMethod'] ?? "Not specified",
                  style: GoogleFonts.outfit(fontSize: 13, fontWeight: FontWeight.w500),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(12),
              width: double.infinity,
              decoration: BoxDecoration(
                color: isDark ? Colors.black26 : Colors.grey.withOpacity(0.05),
                borderRadius: BorderRadius.circular(12),
              ),
              child: SelectableText(
                req['payoutDetails'] ?? "No details provided",
                style: GoogleFonts.robotoMono(fontSize: 12),
              ),
            ),
            if (req['status'] == 'PENDING') ...[
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => _processAction(req['id'], 'REJECTED'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.red,
                        side: const BorderSide(color: Colors.red),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text("Reject & Refund"),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () => _processAction(req['id'], 'PAID'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        elevation: 0,
                      ),
                      child: const Text("Confirm Payment"),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildStatusBadge(String status, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        status,
        style: GoogleFonts.outfit(color: color, fontSize: 11, fontWeight: FontWeight.bold),
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'PAID': return Colors.green;
      case 'REJECTED': return Colors.red;
      case 'PENDING':
      default: return Colors.orange;
    }
  }

  Widget _buildEmptyState(bool isDark) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.redeem_rounded, size: 64, color: isDark ? Colors.white10 : Colors.black12),
          const SizedBox(height: 16),
          Text("No redemption requests", style: GoogleFonts.outfit(color: Colors.grey)),
        ],
      ),
    );
  }
}
