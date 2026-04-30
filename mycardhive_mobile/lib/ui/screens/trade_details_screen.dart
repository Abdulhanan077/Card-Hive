import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mycardhive_mobile/services/trade_service.dart';
import 'package:mycardhive_mobile/services/chat_service.dart';
import 'package:mycardhive_mobile/services/admin_service.dart';
import 'package:mycardhive_mobile/services/auth_service.dart';
import 'package:intl/intl.dart';
import 'package:mycardhive_mobile/utils/image_utils.dart';
import 'package:mycardhive_mobile/ui/screens/chat_screen.dart';
import 'package:mycardhive_mobile/utils/compliance_utils.dart';

class TradeDetailsScreen extends StatefulWidget {
  final Map<String, dynamic>? trade;
  final String? tradeId;
  final bool isAdmin;

  const TradeDetailsScreen({super.key, this.trade, this.tradeId, this.isAdmin = false});

  @override
  State<TradeDetailsScreen> createState() => _TradeDetailsScreenState();
}

class _TradeDetailsScreenState extends State<TradeDetailsScreen> {
  final TradeService _tradeService = TradeService();
  final ChatService _chatService = ChatService();
  final AuthService _authService = AuthService();
  final AdminService _adminService = AdminService();
  
  bool _isConfirming = false;
  late String _status;
  Map<String, dynamic>? _fullTrade;
  bool _isLoading = false;
  int? _currentUserId;
  final ImagePicker _picker = ImagePicker();
  bool _isUploadingFile = false;

  @override
  void initState() {
    super.initState();
    if (widget.trade != null) {
      _fullTrade = widget.trade;
      _status = _fullTrade!['status'] ?? "PENDING";
      _loadInitialData();
    } else {
      _isLoading = true;
      _status = "PENDING";
      _fetchTradeDetails();
    }
  }

  Future<void> _fetchTradeDetails() async {
    try {
      final isAdmin = widget.isAdmin;
      final dynamic tradeResponse;
      if (isAdmin) {
        final res = await _adminService.fetchTradeById(widget.tradeId!);
        tradeResponse = res['success'] == true ? res['trade'] : null;
      } else {
        tradeResponse = await _tradeService.getTradeById(widget.tradeId!);
      }

      if (mounted) {
        if (tradeResponse != null) {
          setState(() {
            _fullTrade = tradeResponse;
            _status = tradeResponse['status'] ?? "PENDING";
            _isLoading = false;
          });
          _loadInitialData();
        } else {
          setState(() => _isLoading = false);
        }
      }
    } catch (e) {
      debugPrint("Trade Fetch Details Error: $e");
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _loadInitialData() async {
    final userData = await _authService.getCurrentUser();
    if (userData != null && mounted) {
      setState(() => _currentUserId = userData['id']);
    }
  }

  void _confirmReceipt() async {
    final bool? confirm = await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text("Confirm Receipt"),
        content: Text("Are you sure you have received the ${ComplianceUtils.isReviewMode ? 'credit' : 'payment'}? This will finalize the ${ComplianceUtils.tradeAction.toLowerCase()} and award your VIP points."),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text("Cancel")),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981)),
            child: const Text("Yes, I've Received It", style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _isConfirming = true);
    final res = await _tradeService.confirmTradeReceipt(_fullTrade!['tradeId']);
    setState(() => _isConfirming = false);

    if (!mounted) return;

    if (res['success'] == true) {
      setState(() => _status = 'COMPLETED');
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("${ComplianceUtils.isReviewMode ? 'Credit' : 'Payment'} received! Your VIP points have been awarded.", style: const TextStyle(color: Colors.white)), backgroundColor: const Color(0xFF10B981)));
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(res['error'] ?? "Action failed"), backgroundColor: Colors.red));
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(appBar: AppBar(title: const Text("Loading...")), body: const Center(child: CircularProgressIndicator()));
    }

    if (_fullTrade == null) {
      return Scaffold(appBar: AppBar(title: const Text("Error")), body: const Center(child: Text("Trade details not found.")));
    }

    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    // Parse Image URLs
    List<String> imageUrls = [];
    final imgData = _fullTrade!['imageUrls'];
    if (imgData != null) {
      if (imgData is String && imgData.isNotEmpty) {
        try {
          final parsed = json.decode(imgData);
          if (parsed is List) imageUrls = List<String>.from(parsed);
        } catch (_) {}
      } else if (imgData is List) {
        imageUrls = List<String>.from(imgData);
      }
    }

    String? paymentReceiptUrl = _fullTrade!['paymentReceiptUrl'];
    if (paymentReceiptUrl != null && !paymentReceiptUrl.startsWith('http')) {
      paymentReceiptUrl = '${AuthService.baseUrl.replaceAll('/api', '')}$paymentReceiptUrl';
    }

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text(_fullTrade!['tradeId'] ?? "${ComplianceUtils.tradeAction} Details", style: TextStyle(color: theme.colorScheme.onSurface, fontWeight: FontWeight.bold, fontSize: 16)),
        actions: [
          IconButton(
            icon: const Icon(Icons.chat_bubble_outline_rounded, color: Color(0xFF2563EB)),
            onPressed: () => _openChat(),
          ),
          const SizedBox(width: 8),
        ],
        leading: IconButton(icon: Icon(Icons.arrow_back_ios_new, color: theme.colorScheme.onSurface), onPressed: () => Navigator.pop(context)),
      ),
      bottomNavigationBar: _status == "PAID" ? Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: theme.cardColor,
          boxShadow: [BoxShadow(color: isDark ? Colors.black26 : const Color(0x1A000000), offset: const Offset(0, -4), blurRadius: 10)],
        ),
        child: ElevatedButton(
          onPressed: _isConfirming ? null : _confirmReceipt,
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF10B981),
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
          child: _isConfirming 
            ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
            : const Text("Confirm Receipt", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
        ),
      ) : null,
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            _buildGiftCardDetailsCard(),
            const SizedBox(height: 16),
            _buildPayoutTargetCard(),
            const SizedBox(height: 16),
            _buildImagesCard(imageUrls),
            if (paymentReceiptUrl != null && paymentReceiptUrl.toString().isNotEmpty) ...[
              const SizedBox(height: 16),
              _buildPaymentReceiptCard(paymentReceiptUrl.toString()),
            ],
            const SizedBox(height: 24),
            _buildAttractiveChatCTA(),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  void _openChat() {
    if (_fullTrade != null) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => ChatScreen(
            tradeId: _fullTrade!['id'],
            tradeDisplayId: _fullTrade!['tradeId'],
          ),
        ),
      );
    }
  }

  Widget _buildAttractiveChatCTA() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isDark 
              ? [const Color(0xFF1E293B), const Color(0xFF0F172A)]
              : [const Color(0xFFEFF6FF), Colors.white],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFF2563EB).withOpacity(0.1)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF2563EB).withOpacity(0.05),
            blurRadius: 15,
            offset: const Offset(0, 5),
          )
        ],
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFF2563EB).withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.support_agent_rounded, color: Color(0xFF2563EB), size: 32),
          ),
          const SizedBox(height: 16),
          const Text(
            "Need Assistance?",
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
          ),
          const SizedBox(height: 4),
          Text(
            "Chat with our admin support for real-time updates on this ${ComplianceUtils.tradeAction.toLowerCase()}.",
            textAlign: TextAlign.center,
            style: TextStyle(color: isDark ? Colors.white60 : Colors.black54, fontSize: 13),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _openChat,
              icon: const Icon(Icons.chat_bubble_rounded, size: 18),
              label: const Text("Chat with Admin", style: TextStyle(fontWeight: FontWeight.bold)),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF2563EB),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                elevation: 0,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGiftCardDetailsCard() {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    
    final currency = _fullTrade!['currency'] ?? 'USD';
    final faceValue = _fullTrade!['faceValue'] ?? 0;
    final cardType = _fullTrade!['cardType'] ?? 'Physical';
    final brand = _fullTrade!['cardBrand'] ?? 'Unknown Brand';
    final expectedPayout = double.tryParse(_fullTrade!['calculatedPayout']?.toString() ?? '0') ?? 0.0;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: theme.dividerColor),
        boxShadow: isDark ? [] : [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 4))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(brand, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              _buildStatusBadge(_status),
            ],
          ),
          const SizedBox(height: 4),
          Text("${_fullTrade!['cardCountry']} - $cardType", style: const TextStyle(color: Colors.grey, fontSize: 13)),
          const Divider(height: 32),
          _detailRow("Face Value", "$currency $faceValue"),
          _detailRow("Card Code", _fullTrade!['cardCode']?.toString() ?? "N/A"),
          if (_fullTrade!['serialNumber'] != null && _fullTrade!['serialNumber'].toString().isNotEmpty)
            _detailRow("Serial Number", _fullTrade!['serialNumber'].toString()),
          _detailRow("Estimated ${ComplianceUtils.isReviewMode ? 'Valuation' : 'Payout'}", "GH₵ ${expectedPayout.toStringAsFixed(2)}", isBold: true, color: const Color(0xFF2563EB)),
          if (_fullTrade!['adminNotes'] != null && _fullTrade!['adminNotes'].toString().isNotEmpty) ...[
            const Divider(height: 32),
            const Text("Admin Notes:", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
            const SizedBox(height: 4),
            Text(_fullTrade!['adminNotes'], style: const TextStyle(fontSize: 13)),
          ],
        ],
      ),
    );
  }

  Widget _buildPayoutTargetCard() {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final method = _fullTrade!['payoutMethod'] ?? 'MOBILE_MONEY';

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: theme.dividerColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(ComplianceUtils.isReviewMode ? "Processing Destination" : "Payout Destination", style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.grey)),
          const SizedBox(height: 12),
          if (method == 'MOBILE_MONEY') ...[
            Text("${_fullTrade!['payoutNetwork']} ${ComplianceUtils.isReviewMode ? 'Credit' : 'Mobile Money'}", style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF2563EB), fontSize: 16)),
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.phone_android_rounded, size: 14, color: Colors.grey),
                const SizedBox(width: 8),
                Text(_fullTrade!['payoutPhoneNumber'] ?? '', style: TextStyle(fontWeight: FontWeight.bold, color: theme.colorScheme.onSurface)),
              ],
            ),
            Row(
              children: [
                const Icon(Icons.person_outline_rounded, size: 14, color: Colors.grey),
                const SizedBox(width: 8),
                Text(_fullTrade!['payoutAccountName'] ?? 'Unknown', style: TextStyle(fontWeight: FontWeight.bold, color: theme.colorScheme.onSurface)),
              ],
            ),
          ] else ...[
            Text("${_fullTrade!['cryptoCoin']} (${_fullTrade!['cryptoNetwork']})", style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF2563EB), fontSize: 16)),
            const SizedBox(height: 4),
            Text("Exchange: ${_fullTrade!['cryptoExchange']}", style: const TextStyle(color: Color(0xFF475569))),
            const Divider(height: 20),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text("EXCHANGE ID (${_fullTrade!['cryptoReceiverIdType']}):", style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
                const SizedBox(height: 2),
                Text(_fullTrade!['cryptoReceiverId'] ?? '', style: TextStyle(fontWeight: FontWeight.bold, color: theme.colorScheme.onSurface)),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _detailRow(String label, String value, {bool isBold = false, Color? color}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.grey, fontSize: 13)),
          Text(value, style: TextStyle(fontWeight: isBold ? FontWeight.bold : FontWeight.normal, color: color, fontSize: 14)),
        ],
      ),
    );
  }

  Widget _buildImagesCard(List<String> imageUrls) {
    if (imageUrls.isEmpty) return const SizedBox.shrink();
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text("Uploaded Proof (Shared)", style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.grey)),
        const SizedBox(height: 12),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: imageUrls.length,
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, crossAxisSpacing: 10, mainAxisSpacing: 10, childAspectRatio: 1),
          itemBuilder: (context, index) {
            String url = imageUrls[index];
            if (!url.startsWith('http')) {
              url = '${AuthService.baseUrl.replaceAll('/api', '')}$url';
            }
            return GestureDetector(
              onTap: () => _viewImage(url),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    Image.network(url, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const Center(child: Icon(Icons.broken_image))),
                    Positioned(
                      bottom: 8,
                      right: 8,
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: const BoxDecoration(color: Colors.black45, shape: BoxShape.circle),
                        child: const Icon(Icons.fullscreen, color: Colors.white, size: 16),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _buildPaymentReceiptCard(String url) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF10B981).withOpacity(0.05),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF10B981).withOpacity(0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.verified_rounded, color: Color(0xFF10B981), size: 20),
              const SizedBox(width: 8),
              Text("Admin Payment Proof", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: theme.colorScheme.onSurface)),
            ],
          ),
          const SizedBox(height: 12),
          GestureDetector(
            onTap: () => _viewImage(url),
            child: Container(
              height: 120,
              width: double.infinity,
              decoration: BoxDecoration(
                color: isDark ? Colors.black26 : Colors.white,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: theme.dividerColor),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    Image.network(url, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const Center(child: Icon(Icons.broken_image, color: Colors.grey))),
                    Container(color: Colors.black26),
                    const Center(child: Icon(Icons.zoom_in_rounded, color: Colors.white, size: 30)),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 8),
          const Text("The administrator has uploaded this receipt as proof of payment.", style: TextStyle(color: Colors.grey, fontSize: 12)),
        ],
      ),
    );
  }

  void _viewImage(String url) {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: EdgeInsets.zero,
        child: Stack(
          alignment: Alignment.center,
          children: [
            GestureDetector(
              onTap: () => Navigator.pop(context),
              child: Container(width: double.infinity, height: double.infinity, color: Colors.black87),
            ),
            InteractiveViewer(child: Image.network(url, fit: BoxFit.contain, errorBuilder: (_, __, ___) => const Center(child: Icon(Icons.broken_image)))),
            Positioned(
              top: MediaQuery.of(context).padding.top + 10,
              right: 20,
              child: IconButton(icon: const Icon(Icons.close, color: Colors.white, size: 30), onPressed: () => Navigator.pop(context)),
            ),
            Positioned(
              top: MediaQuery.of(context).padding.top + 10,
              left: 20,
              child: IconButton(icon: const Icon(Icons.download_rounded, color: Colors.white, size: 30), onPressed: () => ImageUtils.saveNetworkImage(context, url)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusBadge(String status) {
    if (status == "REJECTED") {
      return Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4), decoration: BoxDecoration(color: const Color(0xFFEF4444), borderRadius: BorderRadius.circular(12)), child: const Text("REJECTED", style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)));
    } else if (status == "COMPLETED") {
      return Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4), decoration: BoxDecoration(color: const Color(0xFF3B82F6), borderRadius: BorderRadius.circular(12)), child: const Text("COMPLETED", style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)));
    } else if (status == "PAID") {
      return Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4), decoration: BoxDecoration(color: const Color(0xFF10B981), borderRadius: BorderRadius.circular(12)), child: const Text("PAID", style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)));
    } else if (status == "PENDING") {
      return Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4), decoration: BoxDecoration(color: const Color(0xFFF59E0B), borderRadius: BorderRadius.circular(12)), child: const Text("PENDING", style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)));
    }
    return Text(status, style: const TextStyle(color: const Color(0xFF64748B), fontSize: 11, fontWeight: FontWeight.bold));
  }
}
