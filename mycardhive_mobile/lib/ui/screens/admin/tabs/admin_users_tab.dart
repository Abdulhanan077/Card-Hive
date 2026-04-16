import 'package:flutter/material.dart';
import 'package:mycardhive_mobile/services/admin_service.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:mycardhive_mobile/ui/screens/admin/admin_manage_user_screen.dart';

class AdminUsersTab extends StatefulWidget {
  const AdminUsersTab({super.key});

  @override
  State<AdminUsersTab> createState() => _AdminUsersTabState();
}

class _AdminUsersTabState extends State<AdminUsersTab> {
  final AdminService _adminService = AdminService();
  final TextEditingController _searchController = TextEditingController();
  
  List<Map<String, dynamic>> _users = [];
  bool _isLoading = true;
  String _sortBy = "newest";

  @override
  void initState() {
    super.initState();
    _loadUsers();
  }

  Future<void> _loadUsers() async {
    setState(() => _isLoading = true);
    final users = await _adminService.fetchAllUsers(
      query: _searchController.text,
      sort: _sortBy,
    );
    if (mounted) {
      setState(() {
        _users = users;
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
        title: Text("Manage Users", style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        elevation: 0,
        backgroundColor: Colors.transparent,
      ),
      body: Column(
        children: [
          _buildSearchAndFilters(isDark),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _loadUsers,
              child: _isLoading 
                ? const Center(child: CircularProgressIndicator())
                : _users.isEmpty
                  ? _buildEmptyState()
                  : ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      itemCount: _users.length,
                      itemBuilder: (context, index) => _buildUserCard(_users[index], isDark),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchAndFilters(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          TextField(
            controller: _searchController,
            onSubmitted: (_) => _loadUsers(),
            decoration: InputDecoration(
              hintText: "Search email, username, or phone...",
              hintStyle: const TextStyle(fontSize: 14),
              prefixIcon: const Icon(Icons.search, size: 20),
              filled: true,
              fillColor: isDark ? const Color(0xFF1E293B) : Colors.white,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: isDark ? Colors.white10 : Colors.black.withOpacity(0.05))),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: isDark ? Colors.white10 : Colors.black.withOpacity(0.05))),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16),
            ),
          ),
          const SizedBox(height: 12),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _filterChip("Newest", "newest"),
                const SizedBox(width: 8),
                _filterChip("Trades", "trades_desc"),
                const SizedBox(width: 8),
                _filterChip("Points", "points_desc"),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _filterChip(String label, String value) {
    final isSelected = _sortBy == value;
    return ChoiceChip(
      label: Text(label, style: TextStyle(fontSize: 12, color: isSelected ? Colors.white : null)),
      selected: isSelected,
      onSelected: (selected) {
        if (selected) {
          setState(() => _sortBy = value);
          _loadUsers();
        }
      },
      selectedColor: const Color(0xFF2563EB),
      backgroundColor: Colors.transparent,
      padding: const EdgeInsets.symmetric(horizontal: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20), side: BorderSide(color: isSelected ? Colors.transparent : Colors.grey.withOpacity(0.2))),
    );
  }

  Widget _buildUserCard(Map<String, dynamic> user, bool isDark) {
    final status = user['status'] ?? "ACTIVE";
    final isActive = status == "ACTIVE";
    final date = DateTime.parse(user['createdAt']);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: isDark ? Colors.white10 : Colors.black.withOpacity(0.05)),
      ),
      child: InkWell(
        onTap: () async {
          final result = await Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => AdminManageUserScreen(user: user)),
          );
          if (result == true || result != null) _loadUsers();
        },
        borderRadius: BorderRadius.circular(20),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  CircleAvatar(
                    radius: 20,
                    backgroundColor: (isActive ? Colors.green : Colors.red).withOpacity(0.1),
                    child: Text(
                      user['username'][0].toUpperCase(),
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: isActive ? Colors.green : Colors.red),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text("@${user['username']}", style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 15)),
                            _buildStatusDot(isActive),
                          ],
                        ),
                        Text(user['email'], style: const TextStyle(fontSize: 12, color: Colors.grey)),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            _statBadge(Icons.shopping_bag_rounded, "${user['tradesCount']}", const Color(0xFF2563EB)),
                            const SizedBox(width: 8),
                            _statBadge(Icons.generating_tokens_rounded, "${user['rewardBalance']}", const Color(0xFFF59E0B)),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _statBadge(IconData icon, String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
      decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(6)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 10, color: color),
          const SizedBox(width: 4),
          Text(label, style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: color)),
        ],
      ),
    );
  }

  Widget _buildStatusDot(bool active) {
    return Container(
      width: 6,
      height: 6,
      decoration: BoxDecoration(color: active ? Colors.green : Colors.red, shape: BoxShape.circle),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.people_outline_rounded, size: 64, color: Colors.grey.withOpacity(0.1)),
          const SizedBox(height: 16),
          const Text("No users found.", style: TextStyle(color: Colors.grey)),
        ],
      ),
    );
  }
}
