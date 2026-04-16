import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:mycardhive_mobile/services/auth_service.dart';

class RewardService {
  final AuthService _authService = AuthService();

  Future<Map<String, dynamic>> redeemRewards({
    required double points,
    required String payoutMethod,
    required String payoutDetails,
  }) async {
    try {
      final token = await _authService.getToken();
      final response = await http.post(
        Uri.parse('${AuthService.baseUrl}/mobile/user/redeem'),
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'next-auth.session-token=$token',
        },
        body: json.encode({
          'points': points,
          'payoutMethod': payoutMethod,
          'payoutDetails': payoutDetails,
        }),
      );

      return json.decode(response.body);
    } catch (e) {
      return {'success': false, 'error': 'Connection failed'};
    }
  }

  Future<List<Map<String, dynamic>>> getRedemptionHistory() async {
    try {
      final token = await _authService.getToken();
      final response = await http.get(
        Uri.parse('${AuthService.baseUrl}/mobile/user/redeem/history'),
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'next-auth.session-token=$token',
        },
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return List<Map<String, dynamic>>.from(data['history'] ?? []);
      }
      return [];
    } catch (e) {
      return [];
    }
  }
}
