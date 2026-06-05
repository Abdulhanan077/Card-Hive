import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:mycardhive_mobile/services/trade_service.dart';
import 'package:mycardhive_mobile/ui/screens/trade_details_screen.dart';
import 'package:mycardhive_mobile/utils/compliance_utils.dart';

class TradesScreen extends StatefulWidget {
  const TradesScreen({super.key});

  @override
  State<TradesScreen> createState() => _TradesScreenState();
}

class _TradesScreenState extends State<TradesScreen> {
  final TradeService _tradeService = TradeService();
  bool _isLoading = true;
  List<Map<String, dynamic>> _allTrades = [];
  String _selectedFilter = 'All';

  List<String> get _filters => ComplianceUtils.isReviewMode 
      ? ['All', 'Pending', 'In Progress', 'Completed', 'Rejected']
      : ['All', 'Pending', 'Paid (Action Required)', 'Completed', 'Rejected'];

  @override
  void initState() {
    super.initState();
    _fetchTrades();
  }

  Future<void> _fetchTrades() async {
    try {
      final trades = await _tradeService.getTrades();
      if (!mounted) return;
      setState(() {
        _allTrades = trades;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString()), backgroundColor: Colors.red));
    }
  }

  List<Map<String, dynamic>> get _filteredTrades {
    List<Map<String, dynamic>> trades = _allTrades;
    if (_selectedFilter != 'All') {
      trades = _allTrades.where((trade) {
        final status = trade['status'] as String? ?? '';
        if (_selectedFilter == 'Pending') return status == 'PENDING';
        if (_selectedFilter == 'Paid (Action Required)' || _selectedFilter == 'In Progress') return status == 'PAID';
        if (_selectedFilter == 'Completed') return status == 'COMPLETED';
        if (_selectedFilter == 'Rejected') return status == 'REJECTED';
        return true;
      }).toList();
    }

    // Now group them
    List<Map<String, dynamic>> grouped = [];
    Set<String> processedBatches = {};

    for (var t in trades) {
      final fullName = t['fullName'] as String?;
      if (fullName == null || !fullName.startsWith('BATCH-')) {
        grouped.add({...t, 'isBatch': false, 'cardCount': 1});
      } else if (!processedBatches.contains(fullName)) {
        final batchMembers = trades.where((tm) => tm['fullName'] == fullName).toList();
        final totalPayout = batchMembers.fold(0.0, (sum, tm) => sum + (tm['status'] != 'REJECTED' ? (double.tryParse(tm['calculatedPayout']?.toString() ?? '0') ?? 0.0) : 0.0));
        final batchBrands = batchMembers.map((tm) => tm['cardBrand']).toSet().join(", ");

        grouped.add({
          ...t,
          'isBatch': true,
          'cardCount': batchMembers.length,
          'totalPayout': totalPayout,
          'batchBrands': batchBrands,
        });
        processedBatches.add(fullName);
      }
    }
    return grouped;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text("My ${ComplianceUtils.tradeActionPlural}", style: TextStyle(color: theme.colorScheme.onSurface, fontWeight: FontWeight.bold)),
        backgroundColor: theme.cardColor,
        elevation: 1,
        centerTitle: true,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_new, color: theme.colorScheme.onSurface),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.fromLTRB(16, 20, 16, 8),
             child: Text(
              ComplianceUtils.isReviewMode 
                  ? "Track the status of all your submitted logistics logs."
                  : "Track the status of all your submitted gift cards.",
              style: TextStyle(color: isDark ? Colors.white70 : const Color(0xFF64748B), fontSize: 14),
            ),
          ),
          
          // Horizontal Filter Chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: _filters.map((filter) {
                final isSelected = _selectedFilter == filter;
                return Padding(
                  padding: const EdgeInsets.only(right: 8.0),
                  child: ChoiceChip(
                    label: Text(filter, style: TextStyle(
                      color: isSelected ? Colors.white : (isDark ? Colors.white70 : const Color(0xFF475569)),
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                    )),
                    selected: isSelected,
                    selectedColor: const Color(0xFF2563EB),
                    backgroundColor: isDark ? theme.cardColor : Colors.white,
                    side: BorderSide(color: isSelected ? const Color(0xFF2563EB) : theme.dividerColor),
                    onSelected: (selected) {
                      if (selected) setState(() => _selectedFilter = filter);
                    },
                  ),
                );
              }).toList(),
            ),
          ),

          const SizedBox(height: 8),

          // Trades List
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _filteredTrades.isEmpty
                    ? const Center(child: Text("No trades found.", style: TextStyle(color: Color(0xFF94A3B8))))
                    : RefreshIndicator(
                        onRefresh: _fetchTrades,
                        child: ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: _filteredTrades.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 12),
                          itemBuilder: (context, index) {
                            final trade = _filteredTrades[index];
                            return _buildTradeCard(trade);
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildTradeCard(Map<String, dynamic> trade) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final status = trade['status'] as String? ?? 'PENDING';
    final isBatch = trade['isBatch'] == true;
    final batchLabel = isBatch ? "BATCH" : "SINGLE";
    final createdAtStr = trade['createdAt'] as String?;
    final dateFormatted = createdAtStr != null 
        ? DateFormat('M/d/yyyy').format(DateTime.parse(createdAtStr))
        : 'N/A';
    final tradeId = isBatch ? trade['fullName'] : (trade['tradeId'] as String? ?? 'N/A');
    final brandStr = isBatch ? trade['batchBrands'] : (trade['cardBrand'] as String? ?? 'Unknown Brand');
    final expectedPayout = isBatch ? trade['totalPayout'] : (double.tryParse(trade['calculatedPayout']?.toString() ?? '0') ?? 0.0);
    final quantity = trade['cardCount'] ?? 1;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: theme.dividerColor),
        boxShadow: isDark ? [] : const [BoxShadow(color: Color(0x0A000000), offset: Offset(0, 2), blurRadius: 4)],
      ),
      child: Column(
        children: [
          // Top Row: Badge + ID and Date
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: isDark ? Colors.blue.withOpacity(0.1) : const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      batchLabel,
                      style: const TextStyle(color: Color(0xFF2563EB), fontSize: 10, fontWeight: FontWeight.bold),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(tradeId, style: const TextStyle(color: Color(0xFF2563EB), fontWeight: FontWeight.bold, fontSize: 13)),
                ],
              ),
              Text(dateFormatted, style: TextStyle(color: isDark ? Colors.white54 : const Color(0xFF64748B), fontSize: 12)),
            ],
          ),
          Divider(height: 24, color: theme.dividerColor),
          
          // Middle Row: Brands/Qty and Est. Payout
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(brandStr, style: TextStyle(color: theme.colorScheme.onSurface, fontWeight: FontWeight.w500, fontSize: 14)),
                  const SizedBox(height: 2),
                  Text("$quantity Card${quantity > 1 ? 's' : ''}", style: TextStyle(color: isDark ? Colors.white54 : const Color(0xFF64748B), fontSize: 13)),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(ComplianceUtils.valuationLabel, style: TextStyle(color: isDark ? Colors.white54 : const Color(0xFF64748B), fontSize: 12)),
                  const SizedBox(height: 2),
                  Text(ComplianceUtils.formatAmount(expectedPayout), style: const TextStyle(color: Color(0xFF2563EB), fontWeight: FontWeight.bold, fontSize: 15)),
                ],
              )
            ],
          ),
          const SizedBox(height: 16),
          
          // Bottom Row: Status Badge and Actions
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _buildStatusBadge(status),
              Row(
                children: [
                  OutlinedButton(
                    onPressed: () {
                      Navigator.push(context, MaterialPageRoute(builder: (_) => TradeDetailsScreen(trade: trade))).then((_) {
                        _fetchTrades(); // Refresh if status changed
                      });
                    },
                    style: OutlinedButton.styleFrom(
                      foregroundColor: theme.colorScheme.onSurface,
                      side: BorderSide(color: theme.dividerColor),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    child: const Text("Details", style: TextStyle(fontSize: 12)),
                  ),
                  if (status == 'PAID' && !ComplianceUtils.isReviewMode) ...[
                    const SizedBox(width: 8),
                    ElevatedButton(
                      onPressed: () {
                        Navigator.push(context, MaterialPageRoute(builder: (_) => TradeDetailsScreen(trade: trade))).then((_) {
                          _fetchTrades();
                        });
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF10B981),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        elevation: 0,
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                      child: const Text("Confirm Receipt", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                    ),
                  ]
                ],
              )
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatusBadge(String status) {
    if (status == "REJECTED") {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(color: const Color(0xFFEF4444), borderRadius: BorderRadius.circular(12)),
        child: const Text("REJECTED", style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
      );
    } else if (status == "COMPLETED") {
      return Text("COMPLETED", style: TextStyle(color: Theme.of(context).colorScheme.onSurface, fontSize: 11, fontWeight: FontWeight.bold));
    } else if (status == "PAID") {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(color: const Color(0xFF10B981), borderRadius: BorderRadius.circular(12)),
        child: const Text("PAID", style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
      );
    } else if (status == "PENDING") {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(color: const Color(0xFFF59E0B), borderRadius: BorderRadius.circular(12)),
        child: const Text("PENDING", style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
      );
    } else if (status == "UNDER_REVIEW") {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(color: const Color(0xFF3B82F6), borderRadius: BorderRadius.circular(12)),
        child: const Text("Processing...", style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
      );
    }
    
    return Text(status, style: const TextStyle(color: Color(0xFF64748B), fontSize: 11, fontWeight: FontWeight.bold));
  }
}
