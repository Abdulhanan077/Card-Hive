import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mycardhive_mobile/services/trade_service.dart';
import 'package:mycardhive_mobile/services/chat_service.dart';
import 'package:mycardhive_mobile/services/admin_service.dart';
import 'package:mycardhive_mobile/services/auth_service.dart';
import 'package:intl/intl.dart';

class TradeDetailsScreen extends StatefulWidget {
  final Map<String, dynamic>? trade;
  final String? tradeId;

  const TradeDetailsScreen({super.key, this.trade, this.tradeId}) : assert(trade != null || tradeId != null);

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
  List<Map<String, dynamic>> _messages = [];
  bool _isLoadingChat = true;
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _chatScrollController = ScrollController();

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
      final user = await _authService.getCurrentUser();
      final isAdmin = user != null && user['role'] == 'ADMIN';
      
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
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _loadInitialData() async {
    final userData = await _authService.getCurrentUser();
    if (userData != null) {
      setState(() => _currentUserId = userData['id']);
    }
    _refreshChat();
  }

  Future<void> _refreshChat() async {
    if (_fullTrade == null) return;
    final tradeId = _fullTrade!['id'];
    
    final msgs = await _chatService.fetchMessages(tradeId);
    if (mounted) {
      setState(() {
        _messages = msgs;
        _isLoadingChat = false;
      });
      _scrollToBottom();
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_chatScrollController.hasClients) {
        _chatScrollController.animateTo(
          _chatScrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _sendMessage() async {
    final content = _messageController.text.trim();
    if (content.isEmpty) return;

    if (_fullTrade == null) return;
    final tradeId = _fullTrade!['id'];
    if (tradeId == null) return;

    _messageController.clear();
    final res = await _chatService.sendMessage(tradeId, content);
    
    if (res['success']) {
      _refreshChat();
    }
  }

  void _pickAndSendImage() async {
    final XFile? image = await _picker.pickImage(source: ImageSource.gallery);
    if (image == null) return;

    setState(() => _isUploadingFile = true);
    
    final uploadRes = await _chatService.uploadFile(File(image.path));
    if (uploadRes['success']) {
      await _chatService.sendMessage(
        _fullTrade!['id'], 
        "", 
        fileUrl: uploadRes['url'], 
        fileType: 'IMAGE'
      );
      _refreshChat();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Failed to upload image"), backgroundColor: Colors.red));
    }
    
    setState(() => _isUploadingFile = false);
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
              child: Container(
                width: double.infinity,
                height: double.infinity,
                color: Colors.black87,
              ),
            ),
            InteractiveViewer(
              child: Image.network(
                url, 
                fit: BoxFit.contain,
                errorBuilder: (_, __, ___) => const Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.broken_image, size: 64, color: Colors.white54),
                      SizedBox(height: 8),
                      Text("Image could not be loaded", style: TextStyle(color: Colors.white54)),
                    ],
                  ),
                ),
              ),
            ),
            Positioned(
              top: MediaQuery.of(context).padding.top + 10,
              right: 20,
              child: IconButton(
                icon: const Icon(Icons.close, color: Colors.white, size: 30),
                onPressed: () => Navigator.pop(context),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _confirmReceipt() async {
    final bool? confirm = await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text("Confirm Receipt"),
        content: const Text("Are you sure you have received the payment? This will finalize the trade and award your VIP points."),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text("Cancel")),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text("Confirm", style: TextStyle(color: Color(0xFF10B981)))),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _isConfirming = true);
    final res = await _tradeService.confirmTradeReceipt(_fullTrade!['tradeId']);
    setState(() => _isConfirming = false);

    if (!mounted) return;

    if (res['success']) {
      setState(() => _status = 'COMPLETED');
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Payment received! Your VIP points have been awarded.", style: TextStyle(color: Colors.white)), backgroundColor: Color(0xFF10B981)));
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(res['error']), backgroundColor: Colors.red));
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        appBar: AppBar(title: const Text("Loading Trade...")),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_fullTrade == null) {
      return Scaffold(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        appBar: AppBar(title: const Text("Error")),
        body: const Center(child: Text("Trade details could not be loaded.")),
      );
    }

    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    // Parse Image URLs
    List<String> imageUrls = [];
    try {
      final imgStr = _fullTrade!['imageUrls'];
      if (imgStr != null && imgStr is String) {
        final parsed = json.decode(imgStr);
        imageUrls = List<String>.from(parsed);
      }
    } catch (_) {}

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text(_fullTrade!['tradeId'] ?? "Trade Details", style: TextStyle(color: theme.colorScheme.onSurface, fontWeight: FontWeight.bold, fontSize: 16)),
        backgroundColor: theme.cardColor,
        elevation: 1,
        centerTitle: true,
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
            const SizedBox(height: 24),
            _buildChatSection(),
            const SizedBox(height: 40),
          ],
        ),
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
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: theme.cardColor, borderRadius: BorderRadius.circular(12), border: Border.all(color: theme.dividerColor)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text("Gift Card Details", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: theme.colorScheme.onSurface)),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: isDark ? theme.scaffoldBackgroundColor : Colors.white, borderRadius: BorderRadius.circular(8), border: Border.all(color: isDark ? theme.dividerColor : const Color(0xFFBFDBFE))),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text("#1: $brand", style: TextStyle(fontWeight: FontWeight.bold, color: isDark ? Colors.blue[300] : const Color(0xFF1E3A8A))),
                    _buildStatusBadge(_status),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text("Value: $faceValue $currency", style: TextStyle(color: isDark ? Colors.white54 : const Color(0xFF475569), fontSize: 13)),
                    Text("Type: $cardType", style: TextStyle(color: isDark ? Colors.white54 : const Color(0xFF475569), fontSize: 13)),
                  ],
                ),
                Padding(padding: const EdgeInsets.symmetric(vertical: 12), child: Divider(color: theme.dividerColor)),
                Text("Payout: GH₵ ${expectedPayout.toStringAsFixed(2)}", style: const TextStyle(color: Color(0xFF2563EB), fontWeight: FontWeight.bold, fontSize: 15)),
              ],
            ),
          )
        ],
      ),
    );
  }

  Widget _buildPayoutTargetCard() {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final method = _fullTrade!['payoutMethod'] ?? 'MOBILE_MONEY';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: theme.cardColor, borderRadius: BorderRadius.circular(12), border: Border.all(color: theme.dividerColor)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text("Payout Target", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF2563EB))),
          const SizedBox(height: 12),
          if (method == 'MOBILE_MONEY') ...[
            Text("${_fullTrade!['payoutNetwork']} Mobile Money", style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF2563EB), fontSize: 16)),
            const SizedBox(height: 8),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: isDark ? theme.scaffoldBackgroundColor : const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(8)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text("ACCOUNT NUMBER:", style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
                  const SizedBox(height: 4),
                  Text(_fullTrade!['payoutPhoneNumber'] ?? '', style: TextStyle(fontWeight: FontWeight.bold, color: theme.colorScheme.onSurface)),
                  const SizedBox(height: 12),
                  const Text("ACCOUNT NAME:", style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
                  const SizedBox(height: 4),
                  Text(_fullTrade!['payoutAccountName'] ?? 'Unknown', style: TextStyle(fontWeight: FontWeight.bold, color: theme.colorScheme.onSurface)),
                ],
              ),
            ),
          ] else ...[
            Text("${_fullTrade!['cryptoCoin']} (${_fullTrade!['cryptoNetwork']})", style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF2563EB), fontSize: 16)),
            const SizedBox(height: 4),
            Text("Exchange: ${_fullTrade!['cryptoExchange']}", style: const TextStyle(color: Color(0xFF475569))),
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: isDark ? theme.scaffoldBackgroundColor : const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(8)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text("EXCHANGE ID (${_fullTrade!['cryptoReceiverIdType']}):", style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
                  const SizedBox(height: 4),
                  Text(_fullTrade!['cryptoReceiverId'] ?? '', style: TextStyle(fontWeight: FontWeight.bold, color: theme.colorScheme.onSurface)),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildImagesCard(List<String> imageUrls) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: theme.cardColor, borderRadius: BorderRadius.circular(12), border: Border.all(color: theme.dividerColor)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text("Uploaded Proof (Shared)", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: theme.colorScheme.onSurface)),
          const SizedBox(height: 12),
          if (imageUrls.isEmpty)
            const Text("No images attached to this trade.", style: TextStyle(color: Color(0xFF94A3B8)))
          else
            LayoutBuilder(
              builder: (context, constraints) {
                return GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: imageUrls.length,
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    childAspectRatio: 0.8,
                  ),
                  itemBuilder: (context, index) {
                    final url = imageUrls[index];
                    return GestureDetector(
                      onTap: () => _viewImage(url),
                      child: Container(
                        decoration: BoxDecoration(
                          color: isDark ? theme.scaffoldBackgroundColor : const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: theme.dividerColor),
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: Stack(
                          fit: StackFit.expand,
                          children: [
                            Image.network(
                              url, 
                              fit: BoxFit.cover, 
                              loadingBuilder: (context, child, progress) {
                                if (progress == null) return child;
                                return Center(child: CircularProgressIndicator(value: progress.expectedTotalBytes != null ? progress.cumulativeBytesLoaded / progress.expectedTotalBytes! : null, strokeWidth: 2));
                              },
                              errorBuilder: (c, e, s) => Center(
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(Icons.broken_image, color: Colors.grey[400], size: 32),
                                    const SizedBox(height: 4),
                                    const Text("Error Loading", style: TextStyle(color: Colors.grey, fontSize: 10)),
                                  ],
                                )
                              ),
                            ),
                            Positioned(
                              top: 8,
                              right: 8,
                              child: Container(
                                padding: const EdgeInsets.all(4),
                                decoration: BoxDecoration(color: Colors.black45, shape: BoxShape.circle),
                                child: const Icon(Icons.fullscreen, color: Colors.white, size: 16),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                );
              }
            ),
        ],
      ),
    );
  }

  Widget _buildChatSection() {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text("Support Chat", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const Text("Message an admin directly about this trade.", style: TextStyle(color: Colors.grey, fontSize: 13)),
        const SizedBox(height: 16),
        Container(
          decoration: BoxDecoration(
            color: theme.cardColor,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: theme.dividerColor),
          ),
          child: Column(
            children: [
              // Chat Header
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text("Trade Workspace Chat", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    Row(
                      children: [
                        Container(width: 8, height: 8, decoration: const BoxDecoration(color: Colors.green, shape: BoxShape.circle)),
                        const SizedBox(width: 6),
                        const Text("Live", style: TextStyle(color: Colors.grey, fontSize: 12)),
                      ],
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),

              // Chat Messages list
              Container(
                height: 480, // Increased height to be more "standard"
                color: isDark ? Colors.black12 : Colors.grey.withOpacity(0.03),
                child: _isLoadingChat 
                  ? const Center(child: CircularProgressIndicator())
                  : _messages.isEmpty 
                    ? _buildEmptyChat()
                    : ListView.builder(
                        controller: _chatScrollController,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
                        itemCount: _messages.length,
                        itemBuilder: (context, index) => _buildChatMessage(_messages[index]),
                      ),
              ),

              const Divider(height: 1),

              // Chat Input
              Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    IconButton(
                      icon: Icon(Icons.image_outlined, color: _isUploadingFile ? Colors.grey : const Color(0xFF2563EB), size: 24),
                      onPressed: _isUploadingFile ? null : _pickAndSendImage,
                    ),
                    Expanded(
                      child: TextField(
                        controller: _messageController,
                        enabled: !_isUploadingFile,
                        maxLines: 4,
                        minLines: 1,
                        style: const TextStyle(fontSize: 14),
                        decoration: InputDecoration(
                          hintText: _isUploadingFile ? "Uploading..." : "Write a message...",
                          hintStyle: TextStyle(fontSize: 14, color: isDark ? Colors.white38 : Colors.black38),
                          isDense: true,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: BorderSide.none),
                          filled: true,
                          fillColor: isDark ? Colors.white10 : Colors.black.withOpacity(0.05),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      decoration: BoxDecoration(
                        color: _isUploadingFile ? Colors.grey : const Color(0xFF2563EB), 
                        shape: BoxShape.circle
                      ),
                      child: IconButton(
                        icon: const Icon(Icons.send, color: Colors.white, size: 20),
                        onPressed: _isUploadingFile ? null : _sendMessage,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildEmptyChat() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.chat_bubble_outline, size: 48, color: Colors.grey.withOpacity(0.3)),
          const SizedBox(height: 12),
          const Text("No messages yet.", style: TextStyle(color: Colors.grey, fontWeight: FontWeight.w500)),
          const Text("Send a greeting to start.", style: TextStyle(color: Colors.grey, fontSize: 12)),
        ],
      ),
    );
  }

  Widget _buildChatMessage(Map<String, dynamic> msg) {
    final sender = msg['sender'];
    final bool isMe = sender['id'] == _currentUserId;
    final bool isAdmin = sender['role'] == 'ADMIN';
    final theme = Theme.of(context);

    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.7),
        child: Column(
          crossAxisAlignment: isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (!isMe) ...[
                  CircleAvatar(radius: 8, backgroundColor: isAdmin ? Colors.red : Colors.blue, child: Text(isAdmin ? "A" : "U", style: const TextStyle(fontSize: 8, color: Colors.white))),
                  const SizedBox(width: 4),
                ],
                Text(
                  isMe ? "You" : "@${sender['username']}", 
                  style: TextStyle(
                    fontSize: 11, 
                    fontWeight: FontWeight.w600,
                    color: isMe ? const Color(0xFF2563EB) : (isAdmin ? Colors.red : Colors.grey)
                  )
                ),
                const SizedBox(width: 6),
                if (msg['createdAt'] != null)
                  Text(
                    DateFormat('HH:mm').format(DateTime.parse(msg['createdAt'])),
                    style: const TextStyle(fontSize: 9, color: Colors.grey),
                  ),
              ],
            ),
            const SizedBox(height: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: isMe ? const Color(0xFF2563EB) : (theme.brightness == Brightness.dark ? Colors.white10 : Colors.white),
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(16),
                  topRight: const Radius.circular(16),
                  bottomLeft: Radius.circular(isMe ? 16 : 4),
                  bottomRight: Radius.circular(isMe ? 4 : 16),
                ),
                border: isMe ? null : Border.all(color: theme.dividerColor),
                boxShadow: isMe ? [BoxShadow(color: Colors.blue.withOpacity(0.2), blurRadius: 8, offset: const Offset(0, 4))] : [],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (msg['fileUrl'] != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8.0),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: msg['fileType'] == 'IMAGE' 
                          ? Image.network(msg['fileUrl'], fit: BoxFit.fitWidth, errorBuilder: (_, __, ___) => const Icon(Icons.broken_image))
                          : Container(
                              padding: const EdgeInsets.all(10),
                              color: isMe ? Colors.white24 : Colors.grey[200],
                              child: Row(
                                children: [
                                  Icon(Icons.insert_drive_file, color: isMe ? Colors.white : Colors.blue),
                                  const SizedBox(width: 8),
                                  const Text("View Document", style: TextStyle(fontSize: 12)),
                                ],
                              ),
                            ),
                      ),
                    ),
                  if (msg['content'] != null && msg['content'].toString().isNotEmpty)
                    Text(msg['content'] ?? '', style: TextStyle(color: isMe ? Colors.white : theme.colorScheme.onSurface, fontSize: 14)),
                ],
              ),
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
    return Text(status, style: const TextStyle(color: Color(0xFF64748B), fontSize: 11, fontWeight: FontWeight.bold));
  }
}
