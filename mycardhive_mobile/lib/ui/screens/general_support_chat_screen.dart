import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mycardhive_mobile/services/support_service.dart';
import 'package:intl/intl.dart';

class GeneralSupportChatScreen extends StatefulWidget {
  final Map<String, dynamic>? user;
  final String? sessionId;
  final bool isAdmin;
  
  const GeneralSupportChatScreen({super.key, this.user, this.sessionId, this.isAdmin = false});

  @override
  State<GeneralSupportChatScreen> createState() => _GeneralSupportChatScreenState();
}

class _GeneralSupportChatScreenState extends State<GeneralSupportChatScreen> {
  final SupportService _supportService = SupportService();
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  
  List<dynamic> _messages = [];
  bool _isLoading = true;
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    _loadMessages();
    // Poll for new messages every 5 seconds (simulating Pusher for now if Pusher-Dart is not configured)
    _refreshTimer = Timer.periodic(const Duration(seconds: 5), (_) => _loadMessages(silent: true));
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _loadMessages({bool silent = false}) async {
    if (!silent) setState(() => _isLoading = true);
    final sid = widget.sessionId ?? await _supportService.getSessionId();
    final msgs = await _supportService.getMessages(sid: sid);
    if (mounted) {
      setState(() {
        _messages = msgs;
        _isLoading = false;
      });
      _scrollToBottom();
    }
  }

  void _scrollToBottom() {
    Future.delayed(const Duration(milliseconds: 100), () {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _handleSend() async {
    final text = _messageController.text.trim();
    if (text.isEmpty) return;

    _messageController.clear();
    final sid = widget.sessionId ?? await _supportService.getSessionId();
    
    final success = await _supportService.sendMessage(
      text,
      sessionId: sid,
      userId: widget.user?['id'],
      userName: widget.isAdmin ? (widget.user?['username'] ?? 'Admin') : (widget.user?['username'] ?? 'Guest User'),
      isAdmin: widget.isAdmin
    );

    if (success) {
      _loadMessages(silent: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text("Card Hive Support", style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold)),
            Text("We usually reply instantly", style: GoogleFonts.outfit(fontSize: 11, color: Colors.grey)),
          ],
        ),
        elevation: 0,
        backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
      ),
      body: Column(
        children: [
          Expanded(
            child: _isLoading 
              ? const Center(child: CircularProgressIndicator())
              : _messages.isEmpty
                ? _buildEmptyState()
                : ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.all(20),
                    itemCount: _messages.length,
                    itemBuilder: (context, index) {
                      final msg = _messages[index];
                      // If I am admin, then 'isMe' is true if msg['isAdmin'] is true.
                      // If I am user, then 'isMe' is true if msg['isAdmin'] is false.
                      final bool isMe = widget.isAdmin ? (msg['isAdmin'] == true) : (msg['isAdmin'] == false);
                      return _buildMessageBubble(msg, isMe, isDark);
                    },
                  ),
          ),
          _buildInputArea(isDark),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.support_agent_rounded, size: 64, color: Colors.grey),
          const SizedBox(height: 16),
          Text("How can we help you today?", style: GoogleFonts.outfit(fontSize: 16, color: Colors.grey)),
        ],
      ),
    );
  }

  Widget _buildMessageBubble(dynamic msg, bool isMe, bool isDark) {
    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: isMe ? const Color(0xFF2563EB) : (isDark ? const Color(0xFF334155) : const Color(0xFFF1F5F9)),
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: Radius.circular(isMe ? 16 : 0),
            bottomRight: Radius.circular(isMe ? 0 : 16),
          ),
        ),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              msg['content'],
              style: GoogleFonts.outfit(
                color: isMe ? Colors.white : (isDark ? Colors.white : Colors.black87),
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              DateFormat('HH:mm').format(DateTime.parse(msg['createdAt'])),
              style: TextStyle(
                color: isMe ? Colors.white70 : Colors.grey,
                fontSize: 10,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInputArea(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        border: Border(top: BorderSide(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0))),
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _messageController,
              decoration: InputDecoration(
                hintText: "Type your message...",
                hintStyle: GoogleFonts.outfit(color: Colors.grey),
                border: InputBorder.none,
              ),
              style: GoogleFonts.outfit(),
              textCapitalization: TextCapitalization.sentences,
            ),
          ),
          IconButton(
            onPressed: _handleSend,
            icon: const Icon(Icons.send_rounded, color: Color(0xFF2563EB)),
          ),
        ],
      ),
    );
  }
}
