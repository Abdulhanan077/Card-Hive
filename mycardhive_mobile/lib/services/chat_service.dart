import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:mycardhive_mobile/services/auth_service.dart';

class ChatService {
  final AuthService _authService = AuthService();

  Future<List<Map<String, dynamic>>> fetchMessages(int tradeId) async {
    try {
      final token = await _authService.getToken();
      final response = await http.get(
        Uri.parse('${AuthService.baseUrl}/mobile/chat/$tradeId'),
        headers: {
          'Content-Type': 'application/json',
          'Cookie': '${AuthService.baseUrl.startsWith('https') ? '__Secure-' : ''}next-auth.session-token=$token',
        },
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return List<Map<String, dynamic>>.from(data['messages'] ?? []);
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  Future<Map<String, dynamic>> sendMessage(int tradeId, String content, {String? fileUrl, String? fileType}) async {
    try {
      final token = await _authService.getToken();
      final response = await http.post(
        Uri.parse('${AuthService.baseUrl}/mobile/chat/$tradeId'),
        headers: {
          'Content-Type': 'application/json',
          'Cookie': '${AuthService.baseUrl.startsWith('https') ? '__Secure-' : ''}next-auth.session-token=$token',
        },
        body: json.encode({
          'content': content,
          'fileUrl': fileUrl,
          'fileType': fileType,
        }),
      );

      return json.decode(response.body);
    } catch (e) {
      return {'success': false, 'error': 'Connection failed'};
    }
  }

  Future<Map<String, dynamic>> uploadFile(File file) async {
    try {
      final token = await _authService.getToken();
      var uri = Uri.parse('${AuthService.baseUrl}/mobile/chat/upload');
      var request = http.MultipartRequest('POST', uri);
      request.headers.addAll({'Cookie': '${AuthService.baseUrl.startsWith('https') ? '__Secure-' : ''}next-auth.session-token=$token'});
      
      request.files.add(await http.MultipartFile.fromPath('file', file.path));
      
      var streamedResponse = await request.send();
      var response = await http.Response.fromStream(streamedResponse);
      
      return json.decode(response.body);
    } catch (e) {
      return {'success': false, 'error': 'Upload failed'};
    }
  }
}
