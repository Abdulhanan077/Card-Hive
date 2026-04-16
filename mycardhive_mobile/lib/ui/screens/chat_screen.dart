import 'dart:io';
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mycardhive_mobile/services/chat_service.dart';
import 'package:mycardhive_mobile/services/auth_service.dart';
import 'package:intl/intl.dart';
import 'package:google_fonts/google_fonts.dart';

class ChatScreen extends StatefulWidget {
  final dynamic tradeId;
  final String tradeDisplayId;

  const ChatScreen({
    super.key, 
    required this.tradeId, 
    required this.tradeDisplayId
  });

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final ChatService _chatService = ChatService();
  final AuthService _authService = AuthService();
  
  List<Map<String, dynamic>> _messages = [];
  bool _isLoading = true;
  int? _currentUserId;
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final ImagePicker _picker = ImagePicker();
  bool _isUploading = false;
  
  // Real-time states
  String? _typingUser;
  Timer? _typingTimer;
  late int _parsedTradeId;

  @override
  void initState() {
    super.initState();
    _parsedTradeId = widget.tradeId is int ? widget.tradeId : int.parse(widget.tradeId.toString());
    _loadInitialData();
  }

  @override
  void dispose() {
    _chatService.disconnectPusher(_parsedTradeId);
    _typingTimer?.cancel();
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _loadInitialData() async {
    final userData = await _authService.getCurrentUser();
    if (userData != null) {
      setState(() => _currentUserId = userData['id']);
    }
    
    // 1. Fetch historical messages
    await _refreshChat();
    
    // 2. Initialize Pusher for real-time
    _chatService.initPusher(
      _parsedTradeId,
      onNewMessage: (data) {
        if (mounted) {
          setState(() {
            // Avoid duplicates if already polled
            if (!_messages.any((m) => m['id'] == data['id'])) {
              _messages.add(data);
              _scrollToBottom();
            }
          });
          // Mark as seen immediately when received while chat is open
          if (data['senderId'] != _currentUserId) {
            _chatService.markAsSeen(_parsedTradeId, messageId: data['id']);
          }
        }
      },
      onTyping: (data) {
        if (mounted && data['userId'].toString() != _currentUserId.toString()) {
          setState(() {
            if (data['isTyping'] == true) {
              _typingUser = data['username'];
            } else {
              _typingUser = null;
            }
          });
        }
      },
      onSeen: (data) {
        if (mounted) {
          setState(() {
            for (var m in _messages) {
              if (data['messageId'] == null || m['id'] == data['messageId']) {
                if (m['senderId'] == _currentUserId) {
                  m['isRead'] = true;
                }
              }
            }
          });
        }
      },
    );

    // 3. Mark all as seen upon opening
    _chatService.markAsSeen(_parsedTradeId);
  }

  Future<void> _refreshChat() async {
    final msgs = await _chatService.fetchMessages(_parsedTradeId);
    if (mounted) {
      setState(() {
        _messages = msgs;
        _isLoading = false;
      });
      _scrollToBottom();
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _handleTyping(String value) {
    if (value.isNotEmpty) {
      _chatService.sendTypingStatus(_parsedTradeId, true);
      _typingTimer?.cancel();
      _typingTimer = Timer(const Duration(seconds: 3), () {
        _chatService.sendTypingStatus(_parsedTradeId, false);
      });
    }
  }

  Future<void> _sendMessage() async {
    if (_messageController.text.trim().isEmpty) return;
    final content = _messageController.text;
    _messageController.clear();
    _chatService.sendTypingStatus(_parsedTradeId, false);

    // Optimistic Update
    final tempId = DateTime.now().millisecondsSinceEpoch;
    final tempMsg = {
      'id': tempId,
      'content': content,
      'senderId': _currentUserId,
      'createdAt': DateTime.now().toIso8601String(),
      'sender': {'id': _currentUserId, 'username': 'You', 'role': 'USER'},
      'isSending': true,
    };

    setState(() {
      _messages.add(tempMsg);
      _scrollToBottom();
    });

    final result = await _chatService.sendMessage(_parsedTradeId, content);
    
    if (mounted) {
      setState(() {
        _messages.removeWhere((m) => m['id'] == tempId);
        if (result['success'] == true) {
          // The Pusher event will handle adding the real message to avoid duplicates, 
          // or we can add it here if it's missing.
          if (!_messages.any((m) => m['id'] == result['message']['id'])) {
            _messages.add(result['message']);
          }
        }
      });
      _scrollToBottom();
    }
  }

  Future<void> _pickAndSendImage() async {
    final XFile? image = await _picker.pickImage(source: ImageSource.gallery, imageQuality: 70);
    if (image == null) return;

    final tempId = DateTime.now().millisecondsSinceEpoch;
    final tempMsg = {
      'id': tempId,
      'content': "Sending image...",
      'senderId': _currentUserId,
      'createdAt': DateTime.now().toIso8601String(),
      'sender': {'id': _currentUserId, 'username': 'You', 'role': 'USER'},
      'isSending': true,
      'localFile': File(image.path), // Add local file for preview
    };

    setState(() {
      _messages.add(tempMsg);
      _isUploading = true;
      _scrollToBottom();
    });
    
    final uploadResponse = await _chatService.uploadFile(File(image.path));
    if (uploadResponse['success'] == true) {
      final fileUrl = uploadResponse['url']; // Fixed: Server returns 'url', not 'fileUrl'
      final result = await _chatService.sendMessage(_parsedTradeId, "Sent an image", fileUrl: fileUrl, fileType: 'IMAGE');
      
      if (mounted) {
        setState(() {
          _messages.removeWhere((m) => m['id'] == tempId);
          if (result['success'] == true && !_messages.any((m) => m['id'] == result['message']['id'])) {
            _messages.add(result['message']);
          }
        });
      }
    } else {
      if (mounted) {
        setState(() => _messages.removeWhere((m) => m['id'] == tempId));
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(uploadResponse['error'] ?? "Upload failed")));
      }
    }
    
    if (mounted) setState(() => _isUploading = false);
    _scrollToBottom();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text("Support Chat", style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 18)),
            Text("Trade #${widget.tradeDisplayId}", style: GoogleFonts.outfit(fontSize: 12, color: Colors.grey)),
          ],
        ),
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
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
                    itemCount: _messages.length,
                    itemBuilder: (context, index) => _buildChatMessage(_messages[index], isDark),
                  ),
          ),
          if (_typingUser != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              child: Row(
                children: [
                  Text("$_typingUser is typing...", style: const TextStyle(fontSize: 11, fontStyle: FontStyle.italic, color: Colors.grey)),
                  const SizedBox(width: 8),
                  SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.grey.withOpacity(0.5))),
                ],
              ),
            ),
          _buildInputArea(isDark, theme),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.chat_bubble_outline_rounded, size: 64, color: Colors.grey.withOpacity(0.2)),
          const SizedBox(height: 16),
          const Text("No messages yet", style: TextStyle(color: Colors.grey)),
        ],
      ),
    );
  }

  Widget _buildChatMessage(Map<String, dynamic> msg, bool isDark) {
    final sender = msg['sender'];
    final bool isMe = sender['id'] == _currentUserId;
    final bool isAdmin = sender['role'] == 'ADMIN';
    final bool isRead = msg['isRead'] == true;
    final bool isSending = msg['isSending'] == true;
    final String? fileUrl = msg['fileUrl'] ?? msg['url']; // Handle both keys
    final File? localFile = msg['localFile'];

    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
        child: Column(
          crossAxisAlignment: isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(left: 4, right: 4, bottom: 4),
              child: Text(
                isMe ? "You" : "@${sender['username']}",
                style: GoogleFonts.outfit(
                  fontSize: 11, 
                  fontWeight: FontWeight.bold,
                  color: isMe ? const Color(0xFF2563EB) : (isAdmin ? Colors.red : Colors.grey),
                ),
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                color: isMe ? const Color(0xFF2563EB).withOpacity(isSending ? 0.6 : 1.0) : (isDark ? const Color(0xFF1E293B) : Colors.white),
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(16),
                  topRight: const Radius.circular(16),
                  bottomLeft: Radius.circular(isMe ? 16 : 4),
                  bottomRight: Radius.circular(isMe ? 4 : 16),
                ),
                border: isMe ? null : Border.all(color: Colors.black.withOpacity(0.05)),
                boxShadow: (isMe && !isSending) ? [BoxShadow(color: Colors.blue.withOpacity(0.2), blurRadius: 8, offset: const Offset(0, 4))] : [],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (localFile != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8.0),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.file(localFile, fit: BoxFit.fitWidth),
                      ),
                    )
                  else if (fileUrl != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8.0),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.network(fileUrl, fit: BoxFit.fitWidth, errorBuilder: (_, __, ___) => const Icon(Icons.broken_image)),
                      ),
                    ),
                  Text(
                    msg['content'] ?? '',
                    style: TextStyle(
                      color: isMe ? Colors.white : (isDark ? Colors.white : Colors.black87),
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.only(top: 4, left: 4, right: 4),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (isSending)
                    const Text(
                      "Sending...",
                      style: TextStyle(fontSize: 9, color: Colors.grey, fontStyle: FontStyle.italic),
                    )
                  else ...[
                    Text(
                      DateFormat('HH:mm').format(DateTime.parse(msg['createdAt'].toString())),
                      style: const TextStyle(fontSize: 9, color: Colors.grey),
                    ),
                    if (isMe) ...[
                      const SizedBox(width: 4),
                      Icon(
                        isRead ? Icons.done_all : Icons.done,
                        size: 12,
                        color: isRead ? Colors.green : Colors.grey,
                      ),
                    ]
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInputArea(bool isDark, ThemeData theme) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        border: Border(top: BorderSide(color: isDark ? Colors.white10 : Colors.black12)),
      ),
      child: SafeArea(
        child: Row(
          children: [
            IconButton(
              icon: Icon(Icons.add_photo_alternate_rounded, color: _isUploading ? Colors.grey : const Color(0xFF2563EB)),
              onPressed: _isUploading ? null : _pickAndSendImage,
            ),
            Expanded(
              child: TextField(
                controller: _messageController,
                onChanged: _handleTyping,
                maxLines: 4,
                minLines: 1,
                decoration: InputDecoration(
                  hintText: _isUploading ? "Uploading..." : "Type a message...",
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: BorderSide.none),
                  filled: true,
                  fillColor: isDark ? Colors.white.withOpacity(0.05) : Colors.black.withOpacity(0.05),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Container(
              decoration: BoxDecoration(
                color: _isUploading ? Colors.grey : const Color(0xFF2563EB), 
                shape: BoxShape.circle
              ),
              child: IconButton(
                icon: const Icon(Icons.send_rounded, color: Colors.white),
                onPressed: _isUploading ? null : _sendMessage,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
