import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:mycardhive_mobile/services/auth_service.dart';

class LeaderboardService {
  final AuthService _authService = AuthService();

  Future<Map<String, dynamic>> getLeaderboardData() async {
    try {
      final token = await _authService.getToken();
      if (token == null) {
        throw Exception('Unauthorized. Please login again.');
      }

      final response = await http.get(
        Uri.parse('${AuthService.baseUrl}/user/leaderboard'),
        headers: {
          'Content-Type': 'application/json',
          'Cookie': '${AuthService.baseUrl.startsWith('https') ? '__Secure-' : ''}next-auth.session-token=$token',
        },
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['success'] == true) {
          return data['data'];
        } else {
          throw Exception(data['message'] ?? 'Failed to load leaderboard.');
        }
      } else {
        throw Exception('Failed to load leaderboard. Server returned ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to fetch leaderboard: $e');
    }
  }
}
