import 'package:flutter/material.dart';
import 'package:mycardhive_mobile/services/admin_service.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:mycardhive_mobile/ui/screens/admin/admin_manage_user_screen.dart';

class AdminUsersScreen extends StatefulWidget {
  const AdminUsersScreen({super.key});

  @override
  State<AdminUsersScreen> createState() => _AdminUsersScreenState();
}

class _AdminUsersScreenState extends State<AdminUsersScreen> {
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
        title: Text("Registered Users", style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        elevation: 0,
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
      decoration: BoxDecoration(
        color: Theme.of(context).appBarTheme.backgroundColor,
        borderRadius: const BorderRadius.only(bottomLeft: Radius.circular(24), bottomRight: Radius.circular(24)),
      ),
      child: Column(
        children: [
          TextField(
            controller: _searchController,
            onSubmitted: (_) => _loadUsers(),
            decoration: InputDecoration(
              hintText: "Search email, username, or phone...",
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
                _filterChip("Newest", "newest"),
                const SizedBox(width: 8),
                _filterChip("Most Trades", "trades_desc"),
                const SizedBox(width: 8),
                _filterChip("Highest Points", "points_desc"),
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
          if (result == true) _loadUsers();
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
                    radius: 24,
                    backgroundColor: (isActive ? Colors.green : Colors.red).withOpacity(0.1),
                    child: Text(
                      user['username'][0].toUpperCase(),
                      style: TextStyle(fontWeight: FontWeight.bold, color: isActive ? Colors.green : Colors.red),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text("@${user['username']}", style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16)),
                            _buildStatusDot(isActive),
                          ],
                        ),
                        Text(user['email'], style: GoogleFonts.outfit(fontSize: 13, color: Colors.grey)),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            _statBadge(Icons.shopping_bag_outlined, "${user['tradesCount']} Trades", const Color(0xFF2563EB)),
                            const SizedBox(width: 8),
                            _statBadge(Icons.generating_tokens_outlined, "${user['rewardBalance']} Pts", const Color(0xFFF59E0B)),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const Divider(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text("Joined ${DateFormat('MMM dd, yyyy').format(date)}", style: const TextStyle(fontSize: 11, color: Colors.grey)),
                  Row(
                    children: [
                      Text("Manage", style: GoogleFonts.outfit(color: const Color(0xFF2563EB), fontWeight: FontWeight.w600, fontSize: 13)),
                      const Icon(Icons.chevron_right, size: 16, color: Color(0xFF2563EB)),
                    ],
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
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 4),
          Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: color)),
        ],
      ),
    );
  }

  Widget _buildStatusDot(bool active) {
    return Container(
      width: 8,
      height: 8,
      decoration: BoxDecoration(color: active ? Colors.green : Colors.red, shape: BoxShape.circle),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.people_outline_rounded, size: 64, color: Colors.grey.withOpacity(0.2)),
          const SizedBox(height: 16),
          const Text("No users found.", style: TextStyle(color: Colors.grey)),
        ],
      ),
    );
  }
}
