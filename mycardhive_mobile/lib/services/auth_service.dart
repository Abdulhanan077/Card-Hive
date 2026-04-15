import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class AuthService {
  // Replace with your computer's local IP address when testing on a physical device
  // e.g., 'http://192.168.1.10:3000/api'
  static const String baseUrl = 'http://192.168.168.52:3000/api';
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  Future<Map<String, dynamic>> login(String username, String password) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/mobile/login'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'username': username,
          'password': password,
        }),
      );

      final data = json.decode(response.body);

      if (response.statusCode == 200) {
        // Save the JWT token securely
        await _storage.write(key: 'jwt_token', value: data['token']);
        // Save minimal user details
        await _storage.write(key: 'user_id', value: data['user']['id'].toString());
        await _storage.write(key: 'username', value: data['user']['username']);
        
        return {'success': true, 'user': data['user']};
      } else {
        return {'success': false, 'error': data['error'] ?? 'Login failed'};
      }
    } catch (e) {
      return {'success': false, 'error': 'Cannot connect to server. Check your computer IP.'};
    }
  }

  Future<Map<String, dynamic>> sendOTP(String email, String username) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/send-otp'), // Points directly to the web app's existing OTP route
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'email': email, 'username': username, 'isSignup': true}),
      );

      final data = json.decode(response.body);

      if (response.statusCode == 200) {
        return {'success': true, 'message': data['message'] ?? 'OTP sent successfully!'};
      } else {
        return {'success': false, 'error': data['message'] ?? 'Failed to send OTP.'};
      }
    } catch (e) {
      return {'success': false, 'error': 'Cannot connect to server.'};
    }
  }

  Future<Map<String, dynamic>> forgotPassword(String email) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/forgot-password'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'email': email}),
      );

      final data = json.decode(response.body);

      if (response.statusCode == 200) {
        return {'success': true, 'message': data['message'] ?? 'Reset code sent!'};
      } else {
        return {'success': false, 'error': data['message'] ?? 'Failed to send reset code.'};
      }
    } catch (e) {
      return {'success': false, 'error': 'Cannot connect to server.'};
    }
  }

  Future<Map<String, dynamic>> resetPassword(String email, String otp, String newPassword) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/reset-password'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'email': email, 'otp': otp, 'newPassword': newPassword}),
      );

      final data = json.decode(response.body);

      if (response.statusCode == 200) {
        return {'success': true, 'message': data['message'] ?? 'Password reset successfully!'};
      } else {
        return {'success': false, 'error': data['message'] ?? 'Failed to reset password.'};
      }
    } catch (e) {
      return {'success': false, 'error': 'Cannot connect to server.'};
    }
  }

  Future<Map<String, dynamic>> signup(String username, String email, String phoneNumber, String password, String confirmPassword, String referralCode, String otp) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/mobile/signup'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'username': username,
          'email': email,
          'phoneNumber': phoneNumber,
          'password': password,
          'confirmPassword': confirmPassword,
          'referralCode': referralCode,
          'otp': otp,
        }),
      );

      final data = json.decode(response.body);

      if (response.statusCode == 201) {
        await _storage.write(key: 'jwt_token', value: data['token']);
        await _storage.write(key: 'user_id', value: data['user']['id'].toString());
        await _storage.write(key: 'username', value: data['user']['username']);
        
        return {'success': true, 'user': data['user']};
      } else {
        return {'success': false, 'error': data['error'] ?? 'Registration failed'};
      }
    } catch (e) {
      return {'success': false, 'error': 'Cannot connect to server.'};
    }
  }

  Future<void> logout() async {
    await _storage.delete(key: 'jwt_token');
    await _storage.delete(key: 'user_id');
    await _storage.delete(key: 'username');
  }

  Future<bool> isLoggedIn() async {
    final token = await _storage.read(key: 'jwt_token');
    return token != null;
  }

  Future<String?> getToken() async {
    return await _storage.read(key: 'jwt_token');
  }
}
