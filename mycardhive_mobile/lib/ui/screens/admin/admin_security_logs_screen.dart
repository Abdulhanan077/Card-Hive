import 'package:flutter/material.dart';
import 'package:mycardhive_mobile/services/admin_service.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

class AdminSecurityLogsScreen extends StatefulWidget {
  const AdminSecurityLogsScreen({super.key});

  @override
  State<AdminSecurityLogsScreen> createState() => _AdminSecurityLogsScreenState();
}

class _AdminSecurityLogsScreenState extends State<AdminSecurityLogsScreen> {
  final AdminService _adminService = AdminService();
  List<Map<String, dynamic>> _logs = [];
  bool _isLoading = true;
  
  String? _portalFilter;
  String? _successFilter;
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadLogs();
  }

  Future<void> _loadLogs() async {
    setState(() => _isLoading = true);
    final logs = await _adminService.fetchLoginLogs(
      portal: _portalFilter,
      success: _successFilter,
      query: _searchController.text.isEmpty ? null : _searchController.text,
    );
    if (mounted) {
      setState(() {
        _logs = logs;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text("Security Logs", style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        elevation: 0,
      ),
      body: Column(
        children: [
          _buildFilters(isDark),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _loadLogs,
              child: _isLoading 
                ? const Center(child: CircularProgressIndicator())
                : _logs.isEmpty
                  ? _buildEmptyState()
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _logs.length,
                      itemBuilder: (context, index) => _buildLogCard(_logs[index], isDark),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilters(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).appBarTheme.backgroundColor,
        borderRadius: const BorderRadius.only(bottomLeft: Radius.circular(24), bottomRight: Radius.circular(24)),
      ),
      child: Column(
        children: [
          TextField(
            controller: _searchController,
            onSubmitted: (_) => _loadLogs(),
            decoration: InputDecoration(
              hintText: "Search email, IP address...",
              prefixIcon: const Icon(Icons.search),
              filled: true,
              fillColor: isDark ? Colors.white.withOpacity(0.05) : Colors.black.withOpacity(0.05),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16),
            ),
          ),
          const SizedBox(height: 12),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _filterChip("All Portals", null, _portalFilter == null),
                const SizedBox(width: 8),
                _filterChip("User Portal", "USER", _portalFilter == "USER"),
                const SizedBox(width: 8),
                _filterChip("Admin Portal", "ADMIN", _portalFilter == "ADMIN"),
                const SizedBox(width: 16),
                Container(width: 1, height: 24, color: Colors.grey.withOpacity(0.2)),
                const SizedBox(width: 16),
                _filterChip("All Status", null, _successFilter == null, isSuccessChip: true),
                const SizedBox(width: 8),
                _filterChip("Success", "true", _successFilter == "true", isSuccessChip: true),
                const SizedBox(width: 8),
                _filterChip("Failed", "false", _successFilter == "false", isSuccessChip: true),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _filterChip(String label, String? value, bool isSelected, {bool isSuccessChip = false}) {
    return ChoiceChip(
      label: Text(label, style: TextStyle(fontSize: 11, color: isSelected ? Colors.white : null)),
      selected: isSelected,
      onSelected: (selected) {
        if (selected) {
          setState(() {
            if (isSuccessChip) {
              _successFilter = value;
            } else {
              _portalFilter = value;
            }
          });
          _loadLogs();
        }
      },
      selectedColor: isSuccessChip && value == "false" ? Colors.red : const Color(0xFF2563EB),
      backgroundColor: Colors.transparent,
      padding: const EdgeInsets.symmetric(horizontal: 4),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20), side: BorderSide(color: isSelected ? Colors.transparent : Colors.grey.withOpacity(0.2))),
    );
  }

  Widget _buildLogCard(Map<String, dynamic> log, bool isDark) {
    final success = log['success'] == true;
    final portal = log['portal'] ?? "USER";
    final date = DateTime.parse(log['createdAt']);
    final user = log['user'];

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: isDark ? Colors.white10 : Colors.black.withOpacity(0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _portalBadge(portal),
              _statusBadge(success),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              CircleAvatar(
                radius: 18,
                backgroundColor: (success ? Colors.green : Colors.red).withOpacity(0.1),
                child: Icon(
                  success ? Icons.person_rounded : Icons.person_off_rounded,
                  size: 16,
                  color: success ? Colors.green : Colors.red,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      user != null ? "@${user['username']}" : log['emailOrUsername'],
                      style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 15),
                    ),
                    if (user != null)
                      Text(user['email'], style: const TextStyle(fontSize: 12, color: Colors.grey)),
                  ],
                ),
              ),
            ],
          ),
          const Divider(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.language_rounded, size: 12, color: Colors.grey),
                      const SizedBox(width: 4),
                      Text(log['ipAddress'] ?? "Unknown IP", style: const TextStyle(fontSize: 11, fontFamily: 'monospace', color: Colors.grey)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.access_time_rounded, size: 12, color: Colors.grey),
                      const SizedBox(width: 4),
                      Text(DateFormat('MMM dd, yyyy • HH:mm').format(date.toLocal()), style: const TextStyle(fontSize: 11, color: Colors.grey)),
                    ],
                  ),
                ],
              ),
              if (log['userAgent'] != null)
                IconButton(
                  onPressed: () => _showUserAgent(log['userAgent']),
                  icon: const Icon(Icons.info_outline_rounded, size: 18, color: Colors.blue),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _portalBadge(String portal) {
    final isAdmin = portal == "ADMIN";
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: (isAdmin ? Colors.orange : Colors.blue).withOpacity(0.1), borderRadius: BorderRadius.circular(6)),
      child: Text(
        portal,
        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: isAdmin ? Colors.orange : Colors.blue),
      ),
    );
  }

  Widget _statusBadge(bool success) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: (success ? Colors.green : Colors.red).withOpacity(0.1), borderRadius: BorderRadius.circular(6)),
      child: Text(
        success ? "SUCCESS" : "FAILED",
        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: success ? Colors.green : Colors.red),
      ),
    );
  }

  void _showUserAgent(String userAgent) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Device / User Agent"),
        content: Text(userAgent, style: const TextStyle(fontSize: 12)),
        actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text("Close"))],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.security_rounded, size: 64, color: Colors.grey.withOpacity(0.1)),
          const SizedBox(height: 16),
          const Text("No login events found.", style: TextStyle(color: Colors.grey)),
        ],
      ),
    );
  }
}
