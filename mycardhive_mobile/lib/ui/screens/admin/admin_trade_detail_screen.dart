import 'dart:io';
import 'package:flutter/material.dart';
import 'package:auto_size_text/auto_size_text.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mycardhive_mobile/services/admin_service.dart';
import 'package:mycardhive_mobile/services/chat_service.dart';
import 'package:mycardhive_mobile/services/auth_service.dart';
import 'package:mycardhive_mobile/ui/screens/chat_screen.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:photo_view/photo_view.dart';

class AdminTradeDetailScreen extends StatefulWidget {
  final Map<String, dynamic> trade;
  const AdminTradeDetailScreen({super.key, required this.trade});

  @override
  State<AdminTradeDetailScreen> createState() => _AdminTradeDetailScreenState();
}

class _AdminTradeDetailScreenState extends State<AdminTradeDetailScreen> {
  final AdminService _adminService = AdminService();
  bool _isUpdating = false;
  late String _currentStatus;
  final TextEditingController _notesController = TextEditingController();
  final TextEditingController _refController = TextEditingController();
  final ChatService _chatService = ChatService();
  final ImagePicker _picker = ImagePicker();
  File? _receiptFile;
  bool _isUploadingFile = false;

  @override
  void initState() {
    super.initState();
    _currentStatus = widget.trade['status'];
  }

  Future<void> _updateStatus(String newStatus) async {
    setState(() => _isUpdating = true);
    
    String? receiptUrl;
    if (newStatus == 'PAID' && _receiptFile != null) {
      setState(() => _isUploadingFile = true);
      final uploadRes = await _chatService.uploadFile(_receiptFile!);
      if (uploadRes['success']) {
        receiptUrl = uploadRes['fileUrl'];
      }
      setState(() => _isUploadingFile = false);
    }

    final result = await _adminService.updateTradeStatus(
      widget.trade['tradeId'], 
      newStatus, 
      _notesController.text,
      paymentReceiptUrl: receiptUrl,
    );
    
    if (result['success']) {
      setState(() => _currentStatus = newStatus);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("Status updated to $newStatus"), backgroundColor: Colors.green),
        );
      }
    } else {
       if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(result['error'] ?? "Update failed"), backgroundColor: Colors.red),
        );
      }
    }
    setState(() => _isUpdating = false);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final trade = widget.trade;
    final isBatch = trade['isBatch'] ?? false;
    final date = DateTime.parse(trade['createdAt']);

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text("Trade Details", style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.chat_bubble_outline_rounded, color: Color(0xFF2563EB)),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => ChatScreen(
                    tradeId: trade['id'], // Backend ID for chat
                    tradeDisplayId: isBatch ? trade['batchId'] : trade['tradeId'],
                  ),
                ),
              );
            },
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildStatusHeader(isDark),
            const SizedBox(height: 24),
            _buildSubmitterInfo(isDark, theme),
            const SizedBox(height: 24),
            Text("Trade Information", style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 18)),
            const SizedBox(height: 12),
            _buildTradeDataGrid(isDark, theme),
            const SizedBox(height: 24),
            if (trade['imageUrl'] != null && trade['imageUrl'].isNotEmpty) ...[
              Text("Card Image", style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 18)),
              const SizedBox(height: 12),
              _buildImageCard(trade['imageUrl']),
              const SizedBox(height: 24),
            ],
            Text("Admin Actions", style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 18)),
            const SizedBox(height: 12),
            _buildActionSection(isDark, theme),
            const SizedBox(height: 100),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusHeader(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF2563EB).withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFF2563EB).withOpacity(0.2)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: const BoxDecoration(color: Color(0xFF2563EB), shape: BoxShape.circle),
            child: const Icon(Icons.receipt_long_rounded, color: Colors.white, size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  "Status: ${_currentStatus.replaceAll('_', ' ')}",
                  style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 18, color: const Color(0xFF2563EB)),
                ),
                Text(
                  "Trade ID: ${widget.trade['tradeId']}",
                  style: GoogleFonts.outfit(fontSize: 13, color: isDark ? Colors.white54 : Colors.black54),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSubmitterInfo(bool isDark, ThemeData theme) {
    final user = widget.trade['user'];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text("Submitter", style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 18)),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E293B) : Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: isDark ? Colors.white10 : Colors.black.withOpacity(0.05)),
          ),
          child: Row(
            children: [
              CircleAvatar(
                radius: 24,
                backgroundColor: const Color(0xFF2563EB).withOpacity(0.1),
                child: Text(user['username'][0].toUpperCase(), style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF2563EB))),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text("@${user['username']}", style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16)),
                    Text(user['email'], style: GoogleFonts.outfit(fontSize: 13, color: Colors.grey)),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildTradeDataGrid(bool isDark, ThemeData theme) {
    final trade = widget.trade;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: isDark ? Colors.white10 : Colors.black.withOpacity(0.05)),
      ),
      child: Column(
        children: [
          _dataRow("Card Brand", trade['cardBrand'] ?? "N/A"),
          _dataRow("Card Type", trade['cardType'] ?? "N/A"),
          _dataRow("Face Value", "\$${trade['faceValue']}"),
          _dataRow("Currency", trade['currency'] ?? "USD"),
          const Divider(height: 24),
          _dataRow("Payout Method", trade['payoutMethod']?.toString().replaceAll('_', ' ') ?? "N/A"),
          if (trade['payoutPhoneNumber'] != null && trade['payoutPhoneNumber'].toString().isNotEmpty) ...[
            _dataRow("Network", trade['payoutNetwork'] ?? "N/A"),
            _dataRow("Phone Number", trade['payoutPhoneNumber'], isCopyable: true),
            if (trade['payoutAccountName'] != null)
              _dataRow("Account Name", trade['payoutAccountName'], isCopyable: true),
          ],
          if (trade['cryptoReceiverId'] != null && trade['cryptoReceiverId'].toString().isNotEmpty) ...[
            _dataRow("Crypto Coin", trade['cryptoCoin'] ?? "N/A"),
            _dataRow("Network", trade['cryptoNetwork'] ?? "N/A"),
            _dataRow("Receiver ID", trade['cryptoReceiverId'], isCopyable: true),
          ],
          const Divider(height: 24),
          _dataRow("Amount Payable", "GHS ${trade['calculatedPayout']?.toStringAsFixed(2) ?? '0.00'}", isHighlight: true, isCopyable: true),
          const Divider(height: 24),
          _dataRow("Submitted", DateFormat('MMM dd, yyyy - HH:mm').format(DateTime.parse(trade['createdAt']))),
        ],
      ),
    );
  }

  Widget _dataRow(String label, String value, {bool isHighlight = false, bool isCopyable = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: GoogleFonts.outfit(fontSize: 14, color: Colors.grey)),
          const SizedBox(width: 12),
          Expanded(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Flexible(
                  child: AutoSizeText(
                    value,
                    style: GoogleFonts.outfit(
                      fontWeight: FontWeight.bold, 
                      fontSize: 15, 
                      color: isHighlight ? const Color(0xFF10B981) : null,
                    ),
                    maxLines: 1,
                    minFontSize: 8,
                    textAlign: TextAlign.end,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                if (isCopyable) ...[
                  const SizedBox(width: 4),
                  InkWell(
                    onTap: () {
                      Clipboard.setData(ClipboardData(text: value));
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text("Copied: $label"), duration: const Duration(seconds: 1)),
                      );
                    },
                    borderRadius: BorderRadius.circular(4),
                    child: Padding(
                      padding: const EdgeInsets.all(4.0),
                      child: Icon(Icons.copy_rounded, size: 14, color: Colors.blue.withOpacity(0.6)),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildImageCard(String url) {
    // Correct URL for local testing or production
    final fullUrl = url.startsWith('http') ? url : '${AuthService.baseUrl.replaceAll('/api', '')}$url';

    return GestureDetector(
      onTap: () {
        Navigator.push(context, MaterialPageRoute(builder: (_) => _ImageViewer(url: fullUrl)));
      },
      child: Container(
        height: 200,
        width: double.infinity,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.white10),
          image: DecorationImage(image: NetworkImage(fullUrl), fit: BoxFit.cover),
        ),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            gradient: LinearGradient(begin: Alignment.bottomCenter, end: Alignment.topCenter, colors: [Colors.black54, Colors.transparent]),
          ),
          child: const Center(child: Icon(Icons.zoom_in_rounded, color: Colors.white, size: 40)),
        ),
      ),
    );
  }

  Widget _buildActionSection(bool isDark, ThemeData theme) {
    return Column(
      children: [
         TextField(
           controller: _notesController,
           maxLines: 2,
           decoration: InputDecoration(
             hintText: "Admin notes (customer will see this if rejected)...",
             border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
             filled: true,
             fillColor: isDark ? const Color(0xFF1E293B) : Colors.white,
           ),
         ),
         const SizedBox(height: 16),
          const SizedBox(height: 16),
          if (_currentStatus == 'PENDING' || _currentStatus == 'UNDER_REVIEW') ...[
             Container(
               padding: const EdgeInsets.all(12),
               decoration: BoxDecoration(
                 color: isDark ? const Color(0xFF1E293B) : Colors.white,
                 borderRadius: BorderRadius.circular(16),
                 border: Border.all(color: isDark ? Colors.white10 : Colors.black12),
               ),
               child: Column(
                 children: [
                   if (_receiptFile != null) ...[
                      ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Image.file(_receiptFile!, height: 100, width: double.infinity, fit: BoxFit.cover),
                      ),
                      const SizedBox(height: 10),
                   ],
                   TextButton.icon(
                     onPressed: () async {
                       final XFile? image = await _picker.pickImage(source: ImageSource.gallery);
                       if (image != null) setState(() => _receiptFile = File(image.path));
                     },
                     icon: Icon(_receiptFile == null ? Icons.add_a_photo_rounded : Icons.change_circle_rounded),
                     label: Text(_receiptFile == null ? "Attach Payment Receipt" : "Change Receipt"),
                   ),
                 ],
               ),
             ),
             const SizedBox(height: 16),
          ],
          Row(
            children: [
              Expanded(
                child: _actionButton(
                  "REJECT", 
                  Colors.red, 
                  () => _updateStatus("REJECTED"),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _actionButton(
                  "UNDER REVIEW", 
                  Colors.orange, 
                  () => _updateStatus("UNDER_REVIEW"),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: _actionButton(
              "MARK AS PAID", 
              const Color(0xFF10B981), 
              () => _updateStatus("PAID"),
            ),
          ),
      ],
    );
  }

  Widget _actionButton(String label, Color color, VoidCallback onPressed) {
    return ElevatedButton(
      onPressed: _isUpdating ? null : onPressed,
      style: ElevatedButton.styleFrom(
        backgroundColor: color,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(vertical: 16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        elevation: 0,
      ),
      child: _isUpdating 
        ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
        : Text(label, style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
    );
  }
}

class _ImageViewer extends StatelessWidget {
  final String url;
  const _ImageViewer({required this.url});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(backgroundColor: Colors.black, iconTheme: const IconThemeData(color: Colors.white)),
      body: PhotoView(
        imageProvider: NetworkImage(url),
        loadingBuilder: (context, event) => const Center(child: CircularProgressIndicator()),
      ),
    );
  }
}
