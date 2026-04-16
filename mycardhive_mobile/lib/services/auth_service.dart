import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:io';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:mycardhive_mobile/services/cache_service.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:mycardhive_mobile/config.dart';

class AuthService {
  // Base URL managed in lib/config.dart
  static const String baseUrl = AppConfig.baseUrl;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  final DeviceInfoPlugin _deviceInfo = DeviceInfoPlugin();

  Future<String> _getDeviceString() async {
    try {
      if (Platform.isAndroid) {
        final androidInfo = await _deviceInfo.androidInfo;
        return 'Android ${androidInfo.version.release} (${androidInfo.model})';
      } else if (Platform.isIOS) {
        final iosInfo = await _deviceInfo.iosInfo;
        return 'iOS ${iosInfo.systemVersion} (${iosInfo.name})';
      }
    } catch (_) {}
    return 'Mobile App (Unknown Device)';
  }

  Future<Map<String, dynamic>> login(String username, String password, {bool rememberMe = false}) async {
    try {
      final deviceString = await _getDeviceString();
      final response = await http.post(
        Uri.parse('$baseUrl/mobile/login'),
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'CardHiveMobile/1.0.0 ($deviceString)',
        },
        body: json.encode({
          'username': username,
          'password': password,
        }),
      ).timeout(const Duration(seconds: 10));

      final data = json.decode(response.body);

      if (response.statusCode == 200) {
        // Save the JWT token securely
        await _storage.write(key: 'jwt_token', value: data['token']);
        await _storage.write(key: 'user_id', value: data['user']['id'].toString());
        await _storage.write(key: 'username', value: data['user']['username']);
        await _storage.write(key: 'role', value: data['user']['role']);
        
        // Handle "Remember Me" - if enabled, save credentials for auto-login fallback
        if (rememberMe) {
          await _storage.write(key: 'saved_username', value: username);
          await _storage.write(key: 'saved_password', value: password);
          await _storage.write(key: 'remember_me', value: 'true');
        } else {
          await _storage.delete(key: 'saved_username');
          await _storage.delete(key: 'saved_password');
          await _storage.write(key: 'remember_me', value: 'false');
        }

        return {'success': true, 'user': data['user']};
      } else {
        return {'success': false, 'error': data['error'] ?? 'Login failed'};
      }
    } catch (e) {
      return {'success': false, 'error': 'Connection failed. Please check your internet connectivity.'};
    }
  }

  // --- Auto Login Logic ---
  Future<Map<String, dynamic>> tryAutoLogin() async {
    final token = await _storage.read(key: 'jwt_token');
    final rememberMe = await _storage.read(key: 'remember_me') == 'true';
    
    if (token != null) {
      try {
        final deviceString = await _getDeviceString();
        final response = await http.get(
          Uri.parse('$baseUrl/mobile/user/validate'),
          headers: {
            'Content-Type': 'application/json',
            'Cookie': 'next-auth.session-token=$token',
            'User-Agent': 'CardHiveMobile/1.0.0 ($deviceString)',
          },
        ).timeout(const Duration(seconds: 5));

        if (response.statusCode == 200) {
          final data = json.decode(response.body);
          if (data['success'] == true) {
            // Update cached stats while we are at it
            await CacheService.cacheDashboard(data['user']);
            
            return {
              'success': true,
              'user': data['user'],
            };
          }
        }
        
        // If 401/403 or invalid, we should clear the token
        if (response.statusCode == 401 || response.statusCode == 403) {
           await logout();
        }

      } catch (e) {
        final cachedDashboard = CacheService.getCachedDashboard() ?? {};
        final userId = await _storage.read(key: 'user_id');
        final username = await _storage.read(key: 'username');
        final role = await _storage.read(key: 'role');
        
        if (userId != null && username != null) {
          return {
            'success': true, 
            'user': {
              'id': int.tryParse(userId),
              'username': username,
              'role': role ?? 'USER',
              ...cachedDashboard,
            }
          };
        }
      }
    }
    
    // Fallback to "Remember Me" credentials if token expired but user wanted to stay logged in
    if (rememberMe) {
        final u = await _storage.read(key: 'saved_username');
        final p = await _storage.read(key: 'saved_password');
        if (u != null && p != null) {
            return await login(u, p, rememberMe: true);
        }
    }

    return {'success': false};
  }

  // --- Biometrics Preferences ---
  Future<void> setBiometricsEnabled(bool enabled) async {
    await _storage.write(key: 'biometrics_enabled', value: enabled.toString());
  }

  Future<bool> isBiometricsEnabled() async {
    final val = await _storage.read(key: 'biometrics_enabled');
    return val == 'true';
  }

  Future<void> setBiometricPromptShown(bool shown) async {
    await _storage.write(key: 'biometric_prompt_shown', value: shown.toString());
  }

  Future<bool> wasBiometricPromptShown() async {
    final val = await _storage.read(key: 'biometric_prompt_shown');
    return val == 'true';
  }

  Future<Map<String, String?>> getSavedCredentials() async {
    return {
      'username': await _storage.read(key: 'saved_username'),
      'password': await _storage.read(key: 'saved_password'),
    };
  }

  Future<void> logout() async {
    await _storage.delete(key: 'jwt_token');
    await _storage.delete(key: 'user_id');
    await _storage.delete(key: 'username');
    await _storage.delete(key: 'role');
  }

  Future<Map<String, dynamic>> sendOTP(String email, String username) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/send-otp'),
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
        await _storage.write(key: 'role', value: data['user']['role']);
        return {'success': true, 'user': data['user']};
      } else {
        return {'success': false, 'error': data['error'] ?? 'Registration failed'};
      }
    } catch (e) {
      return {'success': false, 'error': 'Cannot connect to server.'};
    }
  }

  Future<bool> isLoggedIn() async {
    final token = await _storage.read(key: 'jwt_token');
    return token != null;
  }

  Future<String?> getToken() async {
    return await _storage.read(key: 'jwt_token');
  }

  Future<Map<String, dynamic>?> getCurrentUser() async {
    final userId = await _storage.read(key: 'user_id');
    final username = await _storage.read(key: 'username');
    final role = await _storage.read(key: 'role');
    if (userId != null && username != null) {
      return {
        'id': int.tryParse(userId),
        'username': username,
        'role': role ?? 'USER',
      };
    }
    return null;
  }

  Future<void> updateFcmToken(String fcmToken) async {
    final token = await getToken();
    if (token == null) return;

    try {
      await http.post(
        Uri.parse('$baseUrl/mobile/user/fcm-token'),
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'next-auth.session-token=$token',
        },
        body: json.encode({'fcmToken': fcmToken}),
      ).timeout(const Duration(seconds: 10));
    } catch (_) {}
  }
}
