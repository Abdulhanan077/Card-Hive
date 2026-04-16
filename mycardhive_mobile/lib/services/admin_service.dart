import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:mycardhive_mobile/services/auth_service.dart';

class AdminService {
  final AuthService _authService = AuthService();
  String get baseUrl => AuthService.baseUrl;

  Future<String?> getToken() => _authService.getToken();

  Future<Map<String, dynamic>?> getWithAuth(Uri url) async {
    try {
      final token = await getToken();
      if (token == null) return null;

      final response = await http.get(
        url,
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
          'Cookie': '${baseUrl.startsWith('https') ? '__Secure-' : ''}next-auth.session-token=$token',
        },
      );

      if (response.statusCode == 200) {
        return json.decode(response.body);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  Future<Map<String, dynamic>> fetchStats() async {
    try {
      final token = await _authService.getToken();
      if (token == null) return {};

      final response = await http.get(
        Uri.parse('${AuthService.baseUrl}/mobile/admin/stats'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
          'Cookie': '${AuthService.baseUrl.startsWith('https') ? '__Secure-' : ''}next-auth.session-token=$token',
        },
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return data['stats'] ?? {};
      }
      return {};
    } catch (e) {
      return {};
    }
  }

  Future<List<Map<String, dynamic>>> fetchAllTrades({String status = 'ALL'}) async {
    try {
      final token = await _authService.getToken();
      if (token == null) return [];

      final response = await http.get(
        Uri.parse('${AuthService.baseUrl}/mobile/admin/trades?status=$status'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
          'Cookie': '${AuthService.baseUrl.startsWith('https') ? '__Secure-' : ''}next-auth.session-token=$token',
        },
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return List<Map<String, dynamic>>.from(data['trades'] ?? []);
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  Future<Map<String, dynamic>> updateTradeStatus(String tradeId, String newStatus, String adminNotes) async {
    try {
      final token = await _authService.getToken();
      if (token == null) return {'success': false, 'error': 'Unauthorized'};

      final response = await http.post(
        Uri.parse('${AuthService.baseUrl}/mobile/admin/trades/status'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
          'Cookie': '${AuthService.baseUrl.startsWith('https') ? '__Secure-' : ''}next-auth.session-token=$token',
        },
        body: json.encode({
          'tradeId': tradeId,
          'status': newStatus,
          'adminNotes': adminNotes,
        }),
      );

      return json.decode(response.body);
    } catch (e) {
      return {'success': false, 'error': 'Connection failed'};
    }
  }
}
