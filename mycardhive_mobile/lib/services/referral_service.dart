import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:mycardhive_mobile/services/auth_service.dart';

class ReferralService {
  final AuthService _authService = AuthService();

  Future<Map<String, dynamic>> getReferralStats() async {
    try {
      final token = await _authService.getToken();
      if (token == null) {
        throw Exception('Unauthorized. Please login again.');
      }

      final response = await http.get(
        Uri.parse('${AuthService.baseUrl}/user/referral-stats'),
        headers: {
          'Content-Type': 'application/json',
          'Cookie': '${AuthService.baseUrl.startsWith('https') ? '__Secure-' : ''}next-auth.session-token=$token',
        },
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['success'] == true) {
          return data;
        } else {
          throw Exception(data['message'] ?? 'Failed to load referral stats.');
        }
      } else {
        throw Exception('Failed to load referral stats. Server returned ${response.statusCode}');
      }
    } catch (e) {
      rethrow;
    }
  }
}
