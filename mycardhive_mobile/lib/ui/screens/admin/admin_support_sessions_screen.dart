import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mycardhive_mobile/services/support_service.dart';
import 'package:mycardhive_mobile/ui/screens/general_support_chat_screen.dart';
import 'package:mycardhive_mobile/config.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:mycardhive_mobile/services/auth_service.dart';

class AdminSupportSessionsScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  const AdminSupportSessionsScreen({super.key, required this.user});

  @override
  State<AdminSupportSessionsScreen> createState() => _AdminSupportSessionsScreenState();
}

class _AdminSupportSessionsScreenState extends State<AdminSupportSessionsScreen> {
  final String _baseUrl = AppConfig.baseUrl;
  List<dynamic> _sessions = [];
  bool _isLoading = true;
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    _fetchSessions();
    _refreshTimer = Timer.periodic(const Duration(seconds: 10), (_) => _fetchSessions(silent: true));
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  Future<void> _fetchSessions({bool silent = false}) async {
    if (!silent) setState(() => _isLoading = true);
    try {
      final authService = AuthService();
      final token = await authService.getToken();
      
      if (token == null) {
        if (mounted && !silent) setState(() => _isLoading = false);
        return;
      }
      
      final cookieName = _baseUrl.startsWith('https') ? '__Secure-next-auth.session-token' : 'next-auth.session-token';
      final response = await http.get(
        Uri.parse('$_baseUrl/admin/support'),
        headers: {
          'Cookie': '$cookieName=$token',
        }
      );
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (mounted) {
          setState(() {
            _sessions = data['sessions'] ?? [];
            _isLoading = false;
          });
        }
      }
    } catch (e) {
      print("Admin Support Sessions Error: $e");
    } finally {
      if (mounted && !silent) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: Text("Support Inbox", style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        elevation: 0,
        backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
      ),
      body: _isLoading 
        ? const Center(child: CircularProgressIndicator())
        : _sessions.isEmpty
          ? _buildEmptyState()
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _sessions.length,
              itemBuilder: (context, index) {
                final session = _sessions[index];
                return _buildSessionCard(session, isDark);
              },
            ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.forum_outlined, size: 60, color: Colors.grey),
          const SizedBox(height: 16),
          Text("No active support sessions", style: GoogleFonts.outfit(color: Colors.grey)),
        ],
      ),
    );
  }

  Widget _buildSessionCard(dynamic session, bool isDark) {
    final lastMsg = session['lastMessage'] ?? "";
    final senderName = session['senderName'] ?? "Guest";
    final unread = session['unreadCount'] ?? 0;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: BorderSide(color: isDark ? Colors.white12 : Colors.black12)),
      elevation: 0,
      color: isDark ? const Color(0xFF1E293B) : Colors.white,
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: CircleAvatar(
          backgroundColor: const Color(0xFF2563EB).withOpacity(0.1),
          child: Text(senderName[0].toUpperCase(), style: const TextStyle(color: Color(0xFF2563EB), fontWeight: FontWeight.bold)),
        ),
        title: Text(senderName, style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 15)),
        subtitle: Text(lastMsg, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13, color: Colors.grey)),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (unread > 0)
              Container(
                padding: const EdgeInsets.all(6),
                decoration: const BoxDecoration(color: Color(0xFF2563EB), shape: BoxShape.circle),
                child: Text(unread.toString(), style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
              ),
            const Icon(Icons.chevron_right, color: Colors.grey),
          ],
        ),
        onTap: () async {
          await Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => GeneralSupportChatScreen(
                user: widget.user,
                sessionId: session['sessionId'],
                isAdmin: true,
              ),
            ),
          );
          _fetchSessions(silent: true);
        },
      ),
    );
  }
}
