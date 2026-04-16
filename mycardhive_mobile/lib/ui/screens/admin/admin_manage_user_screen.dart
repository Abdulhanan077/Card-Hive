import 'package:flutter/material.dart';
import 'package:mycardhive_mobile/services/admin_service.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

class AdminManageUserScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  const AdminManageUserScreen({super.key, required this.user});

  @override
  State<AdminManageUserScreen> createState() => _AdminManageUserScreenState();
}

class _AdminManageUserScreenState extends State<AdminManageUserScreen> {
  final AdminService _adminService = AdminService();
  final TextEditingController _pointsController = TextEditingController();
  final TextEditingController _vipTradesController = TextEditingController();
  
  bool _isLoading = false;
  late Map<String, dynamic> _currentUser;

  @override
  void initState() {
    super.initState();
    _currentUser = widget.user;
    _vipTradesController.text = _currentUser['completedTradesCount'].toString();
  }

  Future<void> _performAction(String action, dynamic value) async {
    setState(() => _isLoading = true);
    final result = await _adminService.performUserAction(_currentUser['id'], action, value);
    if (mounted) {
      if (result['success']) {
        setState(() => _currentUser = result['user']);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(result['message']), backgroundColor: Colors.green));
      } else {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(result['error'] ?? "Action failed"), backgroundColor: Colors.red));
      }
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text("Manage @${_currentUser['username']}", style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 18)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            _buildUserHeader(isDark, theme),
            const SizedBox(height: 24),
            _buildPointsManager(isDark, theme),
            const SizedBox(height: 20),
            _buildVipManager(isDark, theme),
            const SizedBox(height: 24),
            _buildAccountStatus(isDark, theme),
          ],
        ),
      ),
    );
  }

  Widget _buildUserHeader(bool isDark, ThemeData theme) {
    final status = _currentUser['status'] ?? "ACTIVE";
    final isActive = status == "ACTIVE";
    final date = DateTime.parse(_currentUser['createdAt']);

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: isDark ? Colors.white10 : Colors.black.withOpacity(0.05)),
      ),
      child: Column(
        children: [
          CircleAvatar(
            radius: 40,
            backgroundColor: (isActive ? Colors.green : Colors.red).withOpacity(0.1),
            child: Text(_currentUser['username'][0].toUpperCase(), style: TextStyle(fontWeight: FontWeight.bold, fontSize: 28, color: isActive ? Colors.green : Colors.red)),
          ),
          const SizedBox(height: 16),
          Text("@${_currentUser['username']}", style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 24)),
          Text(_currentUser['email'], style: GoogleFonts.outfit(fontSize: 14, color: Colors.grey)),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _infoTile("Trades", _currentUser['completedTradesCount'].toString(), const Color(0xFF2563EB)),
              const SizedBox(width: 24),
              _infoTile("Points", _currentUser['rewardBalance'].toString(), const Color(0xFFF59E0B)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _infoTile(String label, String value, Color color) {
    return Column(
      children: [
        Text(value, style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 20, color: color)),
        Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey, fontWeight: FontWeight.w500)),
      ],
    );
  }

  Widget _buildPointsManager(bool isDark, ThemeData theme) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: isDark ? Colors.white10 : Colors.black.withOpacity(0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.generating_tokens_outlined, color: Color(0xFFF59E0B), size: 18),
              const SizedBox(width: 8),
              Text("Adjust Reward Points", style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16)),
            ],
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _pointsController,
            keyboardType: TextInputType.number,
            decoration: InputDecoration(
              hintText: "Enter amount (e.g. 100)",
              filled: true,
              fillColor: isDark ? Colors.white.withOpacity(0.05) : Colors.black.withOpacity(0.05),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: ElevatedButton(
                  onPressed: _isLoading ? null : () => _performAction("REWARD_POINTS", _pointsController.text),
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981), foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                  child: const Text("Reward Points", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: _isLoading ? null : () => _performAction("DEDUCT_POINTS", _pointsController.text),
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFEF4444), foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                  child: const Text("Deduct Points", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildVipManager(bool isDark, ThemeData theme) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: isDark ? Colors.white10 : Colors.black.withOpacity(0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.workspace_premium_rounded, color: Color(0xFF2563EB), size: 18),
              const SizedBox(width: 8),
              Text("Set VIP Status (Trades Count)", style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16)),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _vipTradesController,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    hintText: "Target trades count",
                    filled: true,
                    fillColor: isDark ? Colors.white.withOpacity(0.05) : Colors.black.withOpacity(0.05),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              ElevatedButton(
                onPressed: _isLoading ? null : () => _performAction("SET_VIP_TRADES", _vipTradesController.text),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF2563EB), 
                  foregroundColor: Colors.white, 
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))
                ),
                child: const Text("Set", style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildAccountStatus(bool isDark, ThemeData theme) {
    final status = _currentUser['status'] ?? "ACTIVE";
    final isActive = status == "ACTIVE";

    return SizedBox(
      width: double.infinity,
      child: OutlinedButton.icon(
        onPressed: _isLoading ? null : () => _performAction("TOGGLE_STATUS", null),
        icon: Icon(isActive ? Icons.block_rounded : Icons.check_circle_rounded),
        label: Text(isActive ? "Block Account" : "Activate Account", style: const TextStyle(fontWeight: FontWeight.bold)),
        style: OutlinedButton.styleFrom(
          foregroundColor: isActive ? const Color(0xFFEF4444) : const Color(0xFF10B981),
          side: BorderSide(color: isActive ? const Color(0xFFEF4444) : const Color(0xFF10B981)),
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        ),
      ),
    );
  }
}
