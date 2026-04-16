import 'dart:io';
import 'dart:convert';
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
import 'package:mycardhive_mobile/utils/image_utils.dart';

class AdminTradeDetailScreen extends StatefulWidget {
  final Map<String, dynamic>? trade;
  final String? tradeId;
  const AdminTradeDetailScreen({super.key, this.trade, this.tradeId});

  @override
  State<AdminTradeDetailScreen> createState() => _AdminTradeDetailScreenState();
}

class _AdminTradeDetailScreenState extends State<AdminTradeDetailScreen> {
  final AdminService _adminService = AdminService();
  bool _isUpdating = false;
  late String _currentStatus;
  Map<String, dynamic>? _tradeData;
  bool _isLoading = false;
  final TextEditingController _notesController = TextEditingController();
  final TextEditingController _refController = TextEditingController();
  final ChatService _chatService = ChatService();
  final ImagePicker _picker = ImagePicker();
  File? _receiptFile;
  bool _isUploadingFile = false;

  @override
  void initState() {
    super.initState();
    if (widget.trade != null) {
      _tradeData = widget.trade;
      _currentStatus = _tradeData!['status'];
    } else if (widget.tradeId != null) {
      _isLoading = true;
      _currentStatus = 'PENDING';
      _fetchTrade();
    }
  }

  Future<void> _fetchTrade() async {
    final res = await _adminService.fetchTradeById(widget.tradeId!);
    if (mounted) {
      if (res['success'] == true) {
        setState(() {
          _tradeData = res['trade'];
          _currentStatus = _tradeData!['status'];
          _isLoading = false;
        });
      } else {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(res['error'] ?? "Failed to load trade"), backgroundColor: Colors.red));
      }
    }
  }

  Future<void> _updateStatus(String newStatus) async {
    if (_tradeData == null) return;
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
      _tradeData!['tradeId'], 
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
    if (_isLoading) {
      return Scaffold(appBar: AppBar(title: const Text("Loading Trade...")), body: const Center(child: CircularProgressIndicator()));
    }
    
    if (_tradeData == null) {
      return Scaffold(appBar: AppBar(title: const Text("Error")), body: const Center(child: Text("Trade details could not be loaded.")));
    }

    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final trade = _tradeData!;
    final isBatch = trade['isBatch'] ?? false;
    final date = DateTime.parse(trade['createdAt'] ?? DateTime.now().toIso8601String());

    // Multiple Images Support
    List<String> imageUrls = [];
    final imgData = trade['imageUrls'];
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

            Text("Card Credentials", style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 18)),
            const SizedBox(height: 12),
            _buildCardCredentialsCard(isDark),
            const SizedBox(height: 24),

            if (imageUrls.isNotEmpty) ...[
              Text("Uploaded Proofs", style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 18)),
              const SizedBox(height: 12),
              _buildImagesGrid(imageUrls),
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
                  "Trade ID: ${_tradeData!['tradeId']}",
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
    final user = _tradeData!['user'];
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
    final trade = _tradeData!;
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
            _dataRow("Phone Number", trade['payoutPhoneNumber']?.toString() ?? '', isCopyable: true),
            if (trade['payoutAccountName'] != null)
              _dataRow("Account Name", trade['payoutAccountName'].toString(), isCopyable: true),
          ],
          if (trade['cryptoReceiverId'] != null && trade['cryptoReceiverId'].toString().isNotEmpty) ...[
            _dataRow("Crypto Coin", trade['cryptoCoin'] ?? "N/A"),
            _dataRow("Network", trade['cryptoNetwork'] ?? "N/A"),
            _dataRow("Receiver ID", trade['cryptoReceiverId'].toString(), isCopyable: true),
          ],
          const Divider(height: 24),
          _dataRow("Amount Payable", "GHS ${double.tryParse(trade['calculatedPayout']?.toString() ?? '0')?.toStringAsFixed(2) ?? '0.00'}", isHighlight: true, isCopyable: true),
          const Divider(height: 24),
          _dataRow("Submitted", DateFormat('MMM dd, yyyy - HH:mm').format(DateTime.parse(trade['createdAt'] ?? DateTime.now().toIso8601String()))),
        ],
      ),
    );
  }

  Widget _buildCardCredentialsCard(bool isDark) {
    final trade = _tradeData!;
    final cardCode = trade['cardCode']?.toString() ?? "N/A";
    final serialNumber = trade['serialNumber']?.toString() ?? "";

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF2563EB).withOpacity(0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF2563EB).withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.key_rounded, color: Color(0xFF2563EB), size: 18),
                  const SizedBox(width: 8),
                  Text("GIFT CARD CODE", style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 13, color: const Color(0xFF2563EB))),
                ],
              ),
              InkWell(
                onTap: () {
                  Clipboard.setData(ClipboardData(text: cardCode));
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text("Card Code Copied!"), duration: Duration(seconds: 1)),
                    );
                  }
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(color: const Color(0xFF2563EB), borderRadius: BorderRadius.circular(8)),
                  child: Row(
                    children: [
                      const Icon(Icons.copy_rounded, size: 12, color: Colors.white),
                      const SizedBox(width: 4),
                      Text("COPY", style: GoogleFonts.outfit(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          SelectableText(
            cardCode,
            style: GoogleFonts.outfit(
              fontSize: 22, 
              fontWeight: FontWeight.w900, 
              color: isDark ? Colors.white : Colors.black87, 
              letterSpacing: 1.2,
            ),
          ),
          if (serialNumber.isNotEmpty) ...[
            const Divider(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text("SERIAL NUMBER:", style: GoogleFonts.outfit(fontSize: 11, color: Colors.grey, fontWeight: FontWeight.bold)),
                InkWell(
                  onTap: () {
                    Clipboard.setData(ClipboardData(text: serialNumber));
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text("Serial Copied!"), duration: Duration(seconds: 1)),
                      );
                    }
                  },
                  child: Text(serialNumber, style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.bold, color: isDark ? Colors.white70 : Colors.black54)),
                ),
              ],
            ),
          ],
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

  Widget _buildImagesGrid(List<String> urls) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: urls.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2, 
        crossAxisSpacing: 12, 
        mainAxisSpacing: 12,
        childAspectRatio: 1,
      ),
      itemBuilder: (context, index) {
        final url = urls[index].startsWith('http') ? urls[index] : '${AuthService.baseUrl.replaceAll('/api', '')}${urls[index]}';
        return GestureDetector(
          onTap: () {
            Navigator.push(context, MaterialPageRoute(builder: (_) => _ImageViewer(url: url)));
          },
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.white10),
              image: DecorationImage(image: NetworkImage(url), fit: BoxFit.cover),
            ),
            child: Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                gradient: const LinearGradient(begin: Alignment.bottomCenter, end: Alignment.topCenter, colors: [Colors.black54, Colors.transparent]),
              ),
              child: const Center(child: Icon(Icons.zoom_in_rounded, color: Colors.white, size: 24)),
            ),
          ),
        );
      },
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
      appBar: AppBar(
        backgroundColor: Colors.black, 
        iconTheme: const IconThemeData(color: Colors.white),
        actions: [
          IconButton(
            icon: const Icon(Icons.download_rounded, color: Colors.white),
            onPressed: () => ImageUtils.saveNetworkImage(context, url),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: PhotoView(
        imageProvider: NetworkImage(url),
        loadingBuilder: (context, event) => const Center(child: CircularProgressIndicator()),
      ),
    );
  }
}
