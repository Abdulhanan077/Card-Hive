import 'package:flutter/material.dart';
import 'package:mycardhive_mobile/services/admin_service.dart';
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
      backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
      appBar: AppBar(
        elevation: 0,
        backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
        title: Text(
          "Manage Trades",
          style: GoogleFonts.outfit(fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _loadTrades,
          ),
        ],
      ),
      body: Column(
        children: [
          _buildFilterBar(isDark),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _trades.isEmpty
                    ? _buildEmptyState(isDark)
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _trades.length,
                        itemBuilder: (context, index) {
                          return _buildTradeCard(_trades[index], isDark);
                        },
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterBar(bool isDark) {
    final filters = ['PENDING', 'UNDER_REVIEW', 'PAID', 'REJECTED', 'ALL'];
    return Container(
      height: 60,
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        border: Border(bottom: BorderSide(color: isDark ? Colors.white10 : Colors.black12)),
      ),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
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
              backgroundColor: isDark ? Colors.white10 : Colors.grey.shade100,
              selectedColor: const Color(0xFF2563EB),
              labelStyle: GoogleFonts.outfit(
                fontSize: 12,
                color: isSelected ? Colors.white : (isDark ? Colors.white70 : Colors.black87),
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildTradeCard(Map<String, dynamic> trade, bool isDark) {
    final statusColor = _getStatusColor(trade['status']);
    final isBatch = trade['isBatch'] ?? false;
    final date = DateTime.parse(trade['createdAt']);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? Colors.white10 : Colors.black.withOpacity(0.05)),
      ),
      child: InkWell(
        onTap: () {
          // TODO: Navigate to trade details
        },
        borderRadius: BorderRadius.circular(16),
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
                          borderRadius: BorderRadius.circular(6),
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
                        style: GoogleFonts.outfit(
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                  _buildStatusBadge(trade['status'], statusColor),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  const Icon(Icons.person_outline_rounded, size: 16, color: Colors.grey),
                  const SizedBox(width: 4),
                  Text(
                    "@${trade['user']['username']}",
                    style: GoogleFonts.outfit(fontSize: 13, color: Colors.grey),
                  ),
                  const Spacer(),
                  Text(
                    DateFormat('MMM dd, HH:mm').format(date),
                    style: GoogleFonts.outfit(fontSize: 12, color: Colors.grey),
                  ),
                ],
              ),
              const Divider(height: 24),
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isBatch ? "${trade['cardCount']} Cards" : trade['cardBrand'],
                          style: GoogleFonts.outfit(fontWeight: FontWeight.w600),
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
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        "${(isBatch ? (trade['totalValue'] ?? 0) : (trade['faceValue'] ?? 0)).toStringAsFixed(2)} ${trade['currency']}",
                        style: GoogleFonts.outfit(
                          fontWeight: FontWeight.bold,
                          color: const Color(0xFF2563EB),
                          fontSize: 16,
                        ),
                      ),
                      if (trade['unreadCount'] > 0)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.red,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            "${trade['unreadCount']} new msg",
                            style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                          ),
                        ),
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

  Widget _buildStatusBadge(String status, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        status.replaceAll('_', ' '),
        style: GoogleFonts.outfit(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'PAID':
      case 'COMPLETED':
        return Colors.green;
      case 'REJECTED':
        return Colors.red;
      case 'UNDER_REVIEW':
        return Colors.orange;
      case 'PENDING':
      default:
        return Colors.blue;
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
            style: GoogleFonts.outfit(
              fontSize: 16,
              color: isDark ? Colors.white54 : Colors.black54,
            ),
          ),
        ],
      ),
    );
  }
}
