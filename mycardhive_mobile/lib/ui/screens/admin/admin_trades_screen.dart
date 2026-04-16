import 'package:flutter/material.dart';
import 'package:mycardhive_mobile/services/admin_service.dart';
import 'package:mycardhive_mobile/ui/screens/admin/admin_trade_detail_screen.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

class AdminTradesScreen extends StatefulWidget {
  const AdminTradesScreen({super.key});

  @override
  State<AdminTradesScreen> createState() => _AdminTradesScreenState();
}

class _AdminTradesScreenState extends State<AdminTradesScreen> {
  final AdminService _adminService = AdminService();
  List<Map<String, dynamic>> _trades = [];
  bool _isLoading = true;
  String _currentFilter = 'PENDING';
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _loadTrades();
  }

  Future<void> _loadTrades() async {
    setState(() => _isLoading = true);
    final trades = await _adminService.fetchAllTrades(status: _currentFilter);
    setState(() {
      _trades = trades;
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text("Manage Trades", style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        elevation: 0,
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(60),
          child: _buildSearchBar(isDark, theme),
        ),
      ),
      body: Column(
        children: [
          _buildFilterChips(isDark, theme),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _loadTrades,
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : _trades.isEmpty
                      ? _buildEmptyState(isDark)
                      : ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                          itemCount: _trades.length,
                          itemBuilder: (context, index) {
                            return _buildTradeCard(_trades[index], isDark, theme);
                          },
                        ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBar(bool isDark, ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      child: Container(
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1E293B) : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: isDark ? Colors.white10 : Colors.black.withOpacity(0.05)),
        ),
        child: TextField(
          onChanged: (val) => setState(() => _searchQuery = val.toLowerCase()),
          decoration: InputDecoration(
            hintText: "Search ID, User, or Brand...",
            hintStyle: GoogleFonts.outfit(fontSize: 14, color: Colors.grey),
            prefixIcon: const Icon(Icons.search_rounded, size: 20, color: Colors.grey),
            border: InputBorder.none,
            contentPadding: const EdgeInsets.symmetric(vertical: 12),
          ),
        ),
      ),
    );
  }

  Widget _buildFilterChips(bool isDark, ThemeData theme) {
    final filters = ['PENDING', 'UNDER_REVIEW', 'PAID', 'REJECTED', 'ALL'];
    return Container(
      height: 50,
      margin: const EdgeInsets.symmetric(vertical: 10),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        itemCount: filters.length,
        itemBuilder: (context, index) {
          final filter = filters[index];
          final isSelected = _currentFilter == filter;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: ChoiceChip(
              label: Text(filter.replaceAll('_', ' ')),
              selected: isSelected,
              onSelected: (selected) {
                if (selected) {
                  setState(() => _currentFilter = filter);
                  _loadTrades();
                }
              },
              backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
              selectedColor: const Color(0xFF2563EB),
              labelStyle: GoogleFonts.outfit(
                fontSize: 12,
                color: isSelected ? Colors.white : (isDark ? Colors.white70 : Colors.black87),
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              ),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              side: BorderSide(color: isSelected ? Colors.transparent : (isDark ? Colors.white10 : Colors.black12)),
            ),
          );
        },
      ),
    );
  }

  Widget _buildTradeCard(Map<String, dynamic> trade, bool isDark, ThemeData theme) {
    // Local filtering
    if (_searchQuery.isNotEmpty) {
      final tid = (trade['tradeId'] ?? '').toString().toLowerCase();
      final user = (trade['user']['username'] ?? '').toString().toLowerCase();
      final brand = (trade['cardBrand'] ?? '').toString().toLowerCase();
      if (!tid.contains(_searchQuery) && !user.contains(_searchQuery) && !brand.contains(_searchQuery)) {
        return const SizedBox.shrink();
      }
    }

    final statusColor = _getStatusColor(trade['status']);
    final isBatch = trade['isBatch'] ?? false;
    final date = DateTime.parse(trade['createdAt']);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: isDark ? Colors.white10 : Colors.black.withOpacity(0.05)),
      ),
      child: InkWell(
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => AdminTradeDetailScreen(trade: trade)),
          );
        },
        borderRadius: BorderRadius.circular(20),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: isBatch ? Colors.blue.withOpacity(0.1) : Colors.grey.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          isBatch ? "BATCH" : "SINGLE",
                          style: GoogleFonts.outfit(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: isBatch ? Colors.blue : Colors.grey,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        isBatch ? trade['batchId'] : trade['tradeId'],
                        style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                    ],
                  ),
                  _buildStatusBadge(trade['status'], statusColor),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  CircleAvatar(
                    radius: 12,
                    backgroundColor: theme.primaryColor.withOpacity(0.1),
                    child: Text(trade['user']['username'][0].toUpperCase(), style: TextStyle(fontSize: 10, color: theme.primaryColor)),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    "@${trade['user']['username']}",
                    style: GoogleFonts.outfit(fontSize: 13, color: isDark ? Colors.white70 : Colors.black87, fontWeight: FontWeight.w500),
                  ),
                  const Spacer(),
                  Text(
                    DateFormat('MMM dd, HH:mm').format(date),
                    style: GoogleFonts.outfit(fontSize: 12, color: Colors.grey),
                  ),
                ],
              ),
              const Divider(height: 24, thickness: 0.5),
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isBatch ? "${trade['cardCount']} Cards" : trade['cardBrand'],
                          style: GoogleFonts.outfit(fontWeight: FontWeight.w600, fontSize: 15),
                        ),
                        Text(
                          isBatch ? trade['batchBrands'] : "${trade['cardType']} trade",
                          style: GoogleFonts.outfit(fontSize: 12, color: Colors.grey),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  Text(
                    "${(isBatch ? (trade['totalValue'] ?? 0) : (trade['faceValue'] ?? 0)).toStringAsFixed(2)} ${trade['currency']}",
                    style: GoogleFonts.outfit(
                      fontWeight: FontWeight.bold,
                      color: const Color(0xFF2563EB),
                      fontSize: 18,
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

  Widget _buildStatusBadge(String status, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        status.replaceAll('_', ' '),
        style: GoogleFonts.outfit(color: color, fontSize: 11, fontWeight: FontWeight.bold),
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'PAID': return Colors.green;
      case 'REJECTED': return Colors.red;
      case 'UNDER_REVIEW': return Colors.orange;
      case 'PENDING':
      default: return Colors.blue;
    }
  }

  Widget _buildEmptyState(bool isDark) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.receipt_long_rounded, size: 64, color: isDark ? Colors.white10 : Colors.black12),
          const SizedBox(height: 16),
          Text(
            "No trades found",
            style: GoogleFonts.outfit(fontSize: 16, color: Colors.grey),
          ),
        ],
      ),
    );
  }
}
