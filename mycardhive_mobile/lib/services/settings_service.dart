import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:mycardhive_mobile/services/auth_service.dart';

class SettingsService {
  final AuthService _authService = AuthService();

  Future<Map<String, dynamic>> getSettings() async {
    try {
      final token = await _authService.getToken();
      if (token == null) throw Exception('Unauthorized');

      final response = await http.get(
        Uri.parse('${AuthService.baseUrl}/mobile/user/settings'),
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'next-auth.session-token=$token',
        },
      );

      final data = json.decode(response.body);
      if (response.statusCode == 200 && data['success'] == true) {
        return data['user'];
      } else {
        throw Exception(data['message'] ?? 'Failed to load settings');
      }
    } catch (e) {
      throw Exception('Failed to fetch settings: $e');
    }
  }

  Future<bool> updateSettings({bool? emailNotifications, String? username}) async {
    try {
      final token = await _authService.getToken();
      if (token == null) throw Exception('Unauthorized');

      final body = {};
      if (emailNotifications != null) body['emailNotificationsEnabled'] = emailNotifications;
      if (username != null) body['username'] = username;

      final response = await http.post(
        Uri.parse('${AuthService.baseUrl}/mobile/user/settings'),
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'next-auth.session-token=$token',
        },
        body: json.encode(body),
      );

      final data = json.decode(response.body);
      return response.statusCode == 200 && data['success'] == true;
    } catch (e) {
      return false;
    }
  }
}
