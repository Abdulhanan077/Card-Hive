import 'package:flutter/material.dart';
import 'package:mycardhive_mobile/services/reward_service.dart';
import 'package:intl/intl.dart';

class RewardsScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  const RewardsScreen({super.key, required this.user});

  @override
  State<RewardsScreen> createState() => _RewardsScreenState();
}

class _RewardsScreenState extends State<RewardsScreen> {
  final RewardService _rewardService = RewardService();
  final _formKey = GlobalKey<FormState>();
  
  final TextEditingController _pointsController = TextEditingController();
  final TextEditingController _detailsController = TextEditingController();
  String _selectedMethod = "Mobile Money";

  List<Map<String, dynamic>> _history = [];
  bool _isLoading = false;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    setState(() => _isLoading = true);
    final history = await _rewardService.getRedemptionHistory();
    setState(() {
      _history = history;
      _isLoading = false;
    });
  }

  Future<void> _submitRedemption() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);
    final points = double.tryParse(_pointsController.text) ?? 0;
    
    final result = await _rewardService.redeemRewards(
      points: points,
      payoutMethod: _selectedMethod,
      payoutDetails: _detailsController.text,
    );

    setState(() => _isSubmitting = false);

    if (result['success'] == true) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Redemption request submitted successfully!"), backgroundColor: Colors.green),
      );
      _pointsController.clear();
      _detailsController.clear();
      _loadHistory();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(result['error'] ?? "Failed to submit request"), backgroundColor: Colors.red),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final balance = widget.user['rewardBalance'] ?? 0;
    final tradesCount = widget.user['completedTradesCount'] ?? 0;
    // Assuming 1 pt = 0.5 GHS (based on 1112 pts = 556 GHS in screenshot)
    final cediEquivalent = (balance * 0.5).toStringAsFixed(2);

    return Scaffold(
      appBar: AppBar(
        title: const Text("Redeem Rewards", style: TextStyle(fontWeight: FontWeight.bold)),
        centerTitle: true,
        elevation: 0,
      ),
      body: RefreshIndicator(
        onRefresh: _loadHistory,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text("Request a withdrawal for your accumulated reward points.", 
                style: TextStyle(color: Colors.grey, fontSize: 13)),
              const SizedBox(height: 24),

              // Balance Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: isDark ? Theme.of(context).cardColor : Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Theme.of(context).dividerColor),
                  boxShadow: isDark ? [] : [
                    BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 4)),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text("Current Balance", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    const SizedBox(height: 16),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text("$balance ", style: const TextStyle(fontSize: 40, fontWeight: FontWeight.bold, color: Colors.orange)),
                        const Padding(
                          padding: EdgeInsets.only(bottom: 8),
                          child: Text("pts", style: TextStyle(color: Colors.grey, fontSize: 16)),
                        ),
                      ],
                    ),
                    Text("≈ GHS $cediEquivalent", style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 16)),
                    const SizedBox(height: 24),

                    // Requirements Box
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: isDark ? Colors.white10 : const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Theme.of(context).dividerColor.withOpacity(0.5)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text("Withdrawal Requirements:", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                          const SizedBox(height: 12),
                          _buildRequirementRow("Minimum 100 Reward Points", balance >= 100),
                          const SizedBox(height: 8),
                          _buildRequirementRow("At least 5 Successful Trades ($tradesCount/5)", tradesCount >= 5),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 32),

              // Redeem Form
              const Text("Withdrawal Form", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
              const SizedBox(height: 16),
              Form(
                key: _formKey,
                child: Column(
                  children: [
                    TextFormField(
                      controller: _pointsController,
                      keyboardType: TextInputType.number,
                      decoration: _inputDecoration("Points to Redeem", "Enter amount..."),
                      validator: (value) {
                        if (value == null || value.isEmpty) return "Please enter points";
                        final p = double.tryParse(value);
                        if (p == null) return "Invalid number";
                        if (p < 100) return "Minimum is 100 pts";
                        if (p > balance) return "Insufficient balance";
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<String>(
                      value: _selectedMethod,
                      decoration: _inputDecoration("Payout Method", ""),
                      items: const [
                        DropdownMenuItem(value: "Mobile Money", child: Text("Mobile Money (Direct transfer)")),
                        DropdownMenuItem(value: "Crypto", child: Text("Crypto (USDT)")),
                        DropdownMenuItem(value: "Add to Next Trade", child: Text("Add to Next Giftcard Trade")),
                      ],
                      onChanged: (val) => setState(() => _selectedMethod = val!),
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _detailsController,
                      decoration: _inputDecoration("Payout Details", "Enter Momo number or note..."),
                      validator: (value) {
                        if (value == null || value.isEmpty) return "Please enter payout details";
                        return null;
                      },
                    ),
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      height: 56,
                      child: ElevatedButton(
                        onPressed: _isSubmitting || balance < 100 || tradesCount < 5 ? null : _submitRedemption,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF2563EB),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          elevation: 0,
                        ),
                        child: _isSubmitting 
                          ? const CircularProgressIndicator(color: Colors.white)
                          : const Text("Submit Redemption", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 40),

              // History
              const Text("Redemption History", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
              const SizedBox(height: 16),
              if (_isLoading)
                const Center(child: CircularProgressIndicator())
              else if (_history.isEmpty)
                const Center(child: Padding(
                  padding: EdgeInsets.symmetric(vertical: 40),
                  child: Text("No redemption requests yet.", style: TextStyle(color: Colors.grey)),
                ))
              else
                ..._history.map((req) => _buildHistoryItem(req, isDark)),
              
              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRequirementRow(String text, bool isMet) {
    return Row(
      children: [
        Icon(isMet ? Icons.check_circle : Icons.circle_outlined, 
          color: isMet ? Colors.green : Colors.grey, size: 16),
        const SizedBox(width: 8),
        Text(text, style: TextStyle(
          color: isMet ? Colors.green : Colors.grey,
          fontSize: 12,
          fontWeight: isMet ? FontWeight.bold : FontWeight.normal,
        )),
      ],
    );
  }

  InputDecoration _inputDecoration(String label, String hint) {
    return InputDecoration(
      labelText: label,
      hintText: hint,
      labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: Colors.grey.withOpacity(0.3)),
      ),
      filled: true,
      fillColor: Colors.grey.withOpacity(0.05),
    );
  }

  Widget _buildHistoryItem(Map<String, dynamic> req, bool isDark) {
    final status = req['status'] as String;
    final date = DateTime.parse(req['createdAt']);
    
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? Theme.of(context).cardColor : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Theme.of(context).dividerColor),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text("${req['pointsRedeemed']} pts", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
              _buildStatusBadge(status),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text("Method: ${req['payoutMethod']}", style: const TextStyle(color: Colors.grey, fontSize: 12)),
              Text(DateFormat('MMM dd, yyyy').format(date), style: const TextStyle(color: Colors.grey, fontSize: 11)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatusBadge(String status) {
    Color color;
    switch (status.toUpperCase()) {
      case 'PENDING': color = Colors.orange; break;
      case 'APPROVED':
      case 'PAID': color = Colors.green; break;
      default: color = Colors.red;
    }
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.5)),
      ),
      child: Text(status, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold)),
    );
  }
}
