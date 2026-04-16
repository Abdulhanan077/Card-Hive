import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:mycardhive_mobile/services/auth_service.dart';

class PublicService {
  Future<List<Map<String, dynamic>>> getStatusUpdates() async {
    try {
      final response = await http.get(
        Uri.parse('${AuthService.baseUrl}/status-updates'),
        headers: {'Content-Type': 'application/json'},
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final Map<String, dynamic> data = json.decode(response.body);
        return List<Map<String, dynamic>>.from(data['updates'] ?? []);
      }
      return [];
    } catch (e) {
      return [];
    }
  }
}
