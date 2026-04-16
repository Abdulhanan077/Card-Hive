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
        return json.decode(response.body);
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

  Future<Map<String, dynamic>> updateTradeStatus(String tradeId, String newStatus, String adminNotes, {String? paymentReceiptUrl}) async {
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
          'paymentReceiptUrl': paymentReceiptUrl,
        }),
      );

      return json.decode(response.body);
    } catch (e) {
      return {'success': false, 'error': 'Connection failed'};
    }
  }

  Future<List<Map<String, dynamic>>> fetchAllUsers({String query = '', String sort = 'newest'}) async {
    try {
      final token = await _authService.getToken();
      if (token == null) return [];

      final response = await http.get(
        Uri.parse('${AuthService.baseUrl}/mobile/admin/users?query=$query&sort=$sort'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
          'Cookie': '${AuthService.baseUrl.startsWith('https') ? '__Secure-' : ''}next-auth.session-token=$token',
        },
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return List<Map<String, dynamic>>.from(data['users'] ?? []);
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  Future<Map<String, dynamic>> performUserAction(int userId, String action, dynamic value) async {
    try {
      final token = await _authService.getToken();
      if (token == null) return {'success': false, 'error': 'Unauthorized'};

      final response = await http.post(
        Uri.parse('${AuthService.baseUrl}/mobile/admin/users/action'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
          'Cookie': '${AuthService.baseUrl.startsWith('https') ? '__Secure-' : ''}next-auth.session-token=$token',
        },
        body: json.encode({
          'userId': userId,
          'action': action,
          'value': value,
        }),
      );

      return json.decode(response.body);
    } catch (e) {
      return {'success': false, 'error': 'Connection failed'};
    }
  }

  Future<List<Map<String, dynamic>>> fetchRates() async {
    try {
      final token = await _authService.getToken();
      if (token == null) return [];

      final response = await http.get(
        Uri.parse('${AuthService.baseUrl}/mobile/admin/rates'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
          'Cookie': '${AuthService.baseUrl.startsWith('https') ? '__Secure-' : ''}next-auth.session-token=$token',
        },
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return List<Map<String, dynamic>>.from(data['rates'] ?? []);
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  Future<Map<String, dynamic>> saveRate(Map<String, dynamic> rateData) async {
    try {
      final token = await _authService.getToken();
      if (token == null) return {'success': false, 'error': 'Unauthorized'};

      final response = await http.post(
        Uri.parse('${AuthService.baseUrl}/mobile/admin/rates'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
          'Cookie': '${AuthService.baseUrl.startsWith('https') ? '__Secure-' : ''}next-auth.session-token=$token',
        },
        body: json.encode(rateData),
      );

      return json.decode(response.body);
    } catch (e) {
      return {'success': false, 'error': 'Connection failed'};
    }
  }

  Future<Map<String, dynamic>> deleteRate(int id) async {
    try {
      final token = await _authService.getToken();
      if (token == null) return {'success': false, 'error': 'Unauthorized'};

      final response = await http.delete(
        Uri.parse('${AuthService.baseUrl}/mobile/admin/rates?id=$id'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
          'Cookie': '${AuthService.baseUrl.startsWith('https') ? '__Secure-' : ''}next-auth.session-token=$token',
        },
      );

      return json.decode(response.body);
    } catch (e) {
      return {'success': false, 'error': 'Connection failed'};
    }
  }

  Future<List<Map<String, dynamic>>> fetchLoginLogs({String? portal, String? success, String? query}) async {
    try {
      final token = await _authService.getToken();
      if (token == null) return [];

      final queryParams = <String, String>{};
      if (portal != null) queryParams['portal'] = portal;
      if (success != null) queryParams['success'] = success;
      if (query != null) queryParams['query'] = query;

      final uri = Uri.parse('${AuthService.baseUrl}/mobile/admin/logins').replace(queryParameters: queryParams);

      final response = await http.get(
        uri,
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
          'Cookie': '${AuthService.baseUrl.startsWith('https') ? '__Secure-' : ''}next-auth.session-token=$token',
        },
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return List<Map<String, dynamic>>.from(data['logs'] ?? []);
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  Future<Map<String, dynamic>> fetchLeaderboardAdmin() async {
    try {
      final token = await _authService.getToken();
      if (token == null) return {'success': false, 'error': 'Unauthorized'};

      final response = await http.get(
        Uri.parse('${AuthService.baseUrl}/mobile/admin/leaderboard'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
          'Cookie': '${AuthService.baseUrl.startsWith('https') ? '__Secure-' : ''}next-auth.session-token=$token',
        },
      );

      return json.decode(response.body);
    } catch (e) {
      return {'success': false, 'error': 'Connection failed'};
    }
  }

  Future<Map<String, dynamic>> leaderboardAction({required String action, String? boardType, double? basePoints, Map<String, dynamic>? config}) async {
    try {
      final token = await _authService.getToken();
      if (token == null) return {'success': false, 'error': 'Unauthorized'};

      final response = await http.post(
        Uri.parse('${AuthService.baseUrl}/mobile/admin/leaderboard'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
          'Cookie': '${AuthService.baseUrl.startsWith('https') ? '__Secure-' : ''}next-auth.session-token=$token',
        },
        body: json.encode({
          'action': action,
          'boardType': boardType,
          'basePoints': basePoints,
          'config': config,
        }),
      );

      return json.decode(response.body);
    } catch (e) {
      return {'success': false, 'error': 'Connection failed'};
    }
  }

  Future<Map<String, dynamic>> fetchSettingsAdmin() async {
    try {
      final token = await _authService.getToken();
      if (token == null) return {'success': false, 'error': 'Unauthorized'};

      final response = await http.get(
        Uri.parse('${AuthService.baseUrl}/mobile/admin/settings'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
          'Cookie': '${AuthService.baseUrl.startsWith('https') ? '__Secure-' : ''}next-auth.session-token=$token',
        },
      );

      return json.decode(response.body);
    } catch (e) {
      return {'success': false, 'error': 'Connection failed'};
    }
  }

  Future<Map<String, dynamic>> updateSettings(Map<String, dynamic> settingsData) async {
    try {
      final token = await _authService.getToken();
      if (token == null) return {'success': false, 'error': 'Unauthorized'};

      final response = await http.post(
        Uri.parse('${AuthService.baseUrl}/mobile/admin/settings'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
          'Cookie': '${AuthService.baseUrl.startsWith('https') ? '__Secure-' : ''}next-auth.session-token=$token',
        },
        body: json.encode(settingsData),
      );

      return json.decode(response.body);
    } catch (e) {
      return {'success': false, 'error': 'Connection failed'};
    }
  }

  Future<Map<String, dynamic>> fetchStorageImages() async {
    try {
      final token = await _authService.getToken();
      if (token == null) return {'success': false, 'error': 'Unauthorized'};

      final response = await http.get(
        Uri.parse('${AuthService.baseUrl}/mobile/admin/storage'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
          'Cookie': '${AuthService.baseUrl.startsWith('https') ? '__Secure-' : ''}next-auth.session-token=$token',
        },
      );

      return json.decode(response.body);
    } catch (e) {
      return {'success': false, 'error': 'Connection failed'};
    }
  }

  Future<Map<String, dynamic>> deleteStorageImages(List<String> urls) async {
    try {
      final token = await _authService.getToken();
      if (token == null) return {'success': false, 'error': 'Unauthorized'};

      final response = await http.post(
        Uri.parse('${AuthService.baseUrl}/mobile/admin/storage'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
          'Cookie': '${AuthService.baseUrl.startsWith('https') ? '__Secure-' : ''}next-auth.session-token=$token',
        },
        body: json.encode({'urls': urls}),
      );

      return json.decode(response.body);
    } catch (e) {
      return {'success': false, 'error': 'Connection failed'};
    }
  }
}
