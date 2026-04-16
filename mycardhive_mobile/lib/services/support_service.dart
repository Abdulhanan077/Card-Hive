import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:uuid/uuid.dart';
import 'package:mycardhive_mobile/config.dart';
import 'package:mycardhive_mobile/services/auth_service.dart';

class SupportService {
  static const String baseUrl = AppConfig.baseUrl; // http://192.168.10.52:3000/api
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  // Get or Create Session ID
  Future<String> getSessionId() async {
    String? id = await _storage.read(key: 'support_session_id');
    if (id == null) {
      id = const Uuid().v4();
      await _storage.write(key: 'support_session_id', value: id);
    }
    return id!;
  }

  // Fetch Message History
  Future<List<dynamic>> getMessages({String? sid}) async {
    try {
      final sessionId = sid ?? await getSessionId();
      final response = await http.get(Uri.parse('$baseUrl/support?sessionId=$sessionId'));
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return data['messages'] ?? [];
      }
    } catch (e) {
      print("Support Service Error: $e");
    }
    return [];
  }

  // Send Message
  Future<bool> sendMessage(String content, {String? sessionId, int? userId, String? userName, bool isAdmin = false}) async {
    try {
      final sid = sessionId ?? await getSessionId();
      
      Map<String, String> requestHeaders = {'Content-Type': 'application/json'};
      
      // If admin, we must authenticate using our stored token
      if (isAdmin) {
        final authService = AuthService();
        final token = await authService.getToken();
        if (token != null) {
          final cookieName = baseUrl.startsWith('https') ? '__Secure-next-auth.session-token' : 'next-auth.session-token';
          requestHeaders['Cookie'] = '$cookieName=$token';
        }
      }
      
      final response = await http.post(
        Uri.parse(isAdmin ? '$baseUrl/admin/support' : '$baseUrl/support'),
        headers: requestHeaders,
        body: json.encode({
          'sessionId': sid,
          'content': content,
          'senderName': userName ?? (isAdmin ? 'Admin' : 'User'),
          'userId': userId,
          'isAdmin': isAdmin
        }),
      );
      
      return response.statusCode == 200;
    } catch (e) {
      print("Support Service Send Error: $e");
      return false;
    }
  }
}
