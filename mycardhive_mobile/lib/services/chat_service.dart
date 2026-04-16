import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:mycardhive_mobile/services/auth_service.dart';
import 'package:mycardhive_mobile/config.dart';
import 'package:pusher_channels_flutter/pusher_channels_flutter.dart';

class ChatService {
  final AuthService _authService = AuthService();
  PusherChannelsFlutter? _pusher;

  Future<void> initPusher(int tradeId, {
    required Function(Map<String, dynamic>) onNewMessage,
    required Function(Map<String, dynamic>) onTyping,
    required Function(Map<String, dynamic>) onSeen,
  }) async {
    _pusher = PusherChannelsFlutter.getInstance();
    try {
      await _pusher!.init(
        apiKey: AppConfig.pusherKey,
        cluster: AppConfig.pusherCluster,
        onEvent: (event) {
          final data = json.decode(event.data);
          if (event.eventName == 'new-message') {
            onNewMessage(data);
          } else if (event.eventName == 'typing') {
            onTyping(data);
          } else if (event.eventName == 'message-seen') {
            onSeen(data);
          }
        },
      );
      await _pusher!.subscribe(channelName: 'trade-$tradeId');
      await _pusher!.connect();
    } catch (e) {
      print("Pusher Error: $e");
    }
  }

  Future<void> disconnectPusher(int tradeId) async {
    if (_pusher != null) {
      await _pusher!.unsubscribe(channelName: 'trade-$tradeId');
      await _pusher!.disconnect();
    }
  }

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

  Future<void> sendTypingStatus(int tradeId, bool isTyping) async {
    try {
      final token = await _authService.getToken();
      await http.post(
        Uri.parse('${AuthService.baseUrl}/mobile/chat/$tradeId/typing'),
        headers: {
          'Content-Type': 'application/json',
          'Cookie': '${AuthService.baseUrl.startsWith('https') ? '__Secure-' : ''}next-auth.session-token=$token',
        },
        body: json.encode({'isTyping': isTyping}),
      );
    } catch (_) {}
  }

  Future<void> markAsSeen(int tradeId, {int? messageId}) async {
    try {
      final token = await _authService.getToken();
      await http.post(
        Uri.parse('${AuthService.baseUrl}/mobile/chat/$tradeId/seen'),
        headers: {
          'Content-Type': 'application/json',
          'Cookie': '${AuthService.baseUrl.startsWith('https') ? '__Secure-' : ''}next-auth.session-token=$token',
        },
        body: json.encode({'messageId': messageId}),
      );
    } catch (_) {}
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
