import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:io';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mycardhive_mobile/services/cache_service.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/foundation.dart';
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

  // --- Storage Helper with Fallback ---
  Future<void> _writeSecure(String key, String value) async {
    // Aggressive Fallback for iOS Simulators (Appetize.io)
    if (Platform.isIOS) {
       final iosInfo = await _deviceInfo.iosInfo;
       if (!iosInfo.isPhysicalDevice) {
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString(key, value);
          return;
       }
    }

    try {
      await _storage.write(key: key, value: value);
    } catch (e) {
      debugPrint("Secure Storage Write Fallback for $key: $e");
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(key, value);
    }
  }

  Future<String?> _readSecure(String key) async {
    // Simulator Check
    bool isSimulator = false;
    if (Platform.isIOS) {
       final iosInfo = await _deviceInfo.iosInfo;
       isSimulator = !iosInfo.isPhysicalDevice;
    }

    if (isSimulator) {
       final prefs = await SharedPreferences.getInstance();
       final val = prefs.getString(key);
       if (val != null) {
         debugPrint("AuthService: Retreived $key from Prefs (Simulator)");
         return val;
       }
    }

    try {
      final val = await _storage.read(key: key);
      if (val != null) return val;
    } catch (e) {
      debugPrint("AuthService: SecureStorage Read Error for $key: $e");
    }
    
    // Final Fallback
    final prefs = await SharedPreferences.getInstance();
    final val = prefs.getString(key);
    if (val != null) debugPrint("AuthService: Retreived $key from Prefs (Final Fallback)");
    return val;
  }

  Future<void> _deleteSecure(String key) async {
    try {
      await _storage.delete(key: key);
    } catch (_) {}
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(key);
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
        await _writeSecure('jwt_token', data['token']);
        await _writeSecure('user_id', data['user']['id'].toString());
        await _writeSecure('username', data['user']['username']);
        await _writeSecure('role', data['user']['role']);
        
        // Handle "Remember Me" - if enabled, save credentials for auto-login fallback
        if (rememberMe) {
          await _writeSecure('saved_username', username);
          await _writeSecure('saved_password', password);
          await _writeSecure('remember_me', 'true');
        } else {
          await _deleteSecure('saved_username');
          await _deleteSecure('saved_password');
          await _writeSecure('remember_me', 'false');
        }

        return {'success': true, 'user': data['user']};
      } else {
        return {'success': false, 'error': data['error'] ?? data['message'] ?? 'Invalid username or password'};
      }
    } catch (e) {
      String message = 'Service temporarily unavailable. Please try again later.';
      if (e.toString().contains('SocketException') || e.toString().contains('Connection failed')) {
        message = 'Connection error. Please check your internet and try again.';
      } else if (e.toString().contains('TimeoutException')) {
        message = 'Request timed out. The server is taking too long to respond.';
      }
      debugPrint("Login Error: $e");
      return {'success': false, 'error': message};
    }
  }

  // --- Auto Login Logic ---
  Future<Map<String, dynamic>> tryAutoLogin() async {
    String? token;
    bool rememberMe = false;
    
    token = await _readSecure('jwt_token');
    rememberMe = await _readSecure('remember_me') == 'true';
    
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
        final userId = await _readSecure('user_id');
        final username = await _readSecure('username');
        final role = await _readSecure('role');
        
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
        final u = await _readSecure('saved_username');
        final p = await _readSecure('saved_password');
        if (u != null && p != null) {
            return await login(u, p, rememberMe: true);
        }
    }

    return {'success': false};
  }

  // --- Biometrics Preferences ---
  Future<void> setBiometricsEnabled(bool enabled) async {
    await _writeSecure('biometrics_enabled', enabled.toString());
  }

  Future<bool> isBiometricsEnabled() async {
    final val = await _readSecure('biometrics_enabled');
    return val == 'true';
  }

  Future<void> setBiometricPromptShown(bool shown) async {
    await _writeSecure('biometric_prompt_shown', shown.toString());
  }

  Future<bool> wasBiometricPromptShown() async {
    final val = await _readSecure('biometric_prompt_shown');
    return val == 'true';
  }

  Future<Map<String, String?>> getSavedCredentials() async {
    return {
      'username': await _readSecure('saved_username'),
      'password': await _readSecure('saved_password'),
    };
  }

  Future<void> logout() async {
    await _deleteSecure('jwt_token');
    await _deleteSecure('user_id');
    await _deleteSecure('username');
    await _deleteSecure('role');
  }

  Future<Map<String, dynamic>> deleteAccount() async {
    try {
      final token = await getToken();
      if (token == null) return {'success': false, 'error': 'Unauthorized'};

      final deviceString = await _getDeviceString();
      final response = await http.post(
        Uri.parse('$baseUrl/mobile/user/delete'),
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'next-auth.session-token=$token',
          'User-Agent': 'CardHiveMobile/1.0.0 ($deviceString)',
        },
      ).timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['success'] == true) {
          await logout(); // Clear local session
          return {'success': true, 'message': data['message']};
        }
      }
      
      final data = json.decode(response.body);
      return {'success': false, 'error': data['message'] ?? 'Failed to delete account'};
    } catch (e) {
      debugPrint("Delete Account Error: $e");
      return {'success': false, 'error': 'Connection failed ($e). Please check your internet.'};
    }
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
        await _writeSecure('jwt_token', data['token']);
        await _writeSecure('user_id', data['user']['id'].toString());
        await _writeSecure('username', data['user']['username']);
        await _writeSecure('role', data['user']['role']);
        return {'success': true, 'user': data['user']};
      } else {
        return {'success': false, 'error': data['error'] ?? 'Registration failed. Please check your details.'};
      }
    } catch (e) {
      String message = 'Registration failed due to a service error.';
      if (e.toString().contains('SocketException')) {
        message = 'Network error. Please check your internet connection.';
      }
      debugPrint("Signup Error: $e");
      return {'success': false, 'error': message};
    }
  }

  Future<bool> isLoggedIn() async {
    final token = await _readSecure('jwt_token');
    return token != null;
  }

  Future<String?> getToken() async {
    final token = await _readSecure('jwt_token');
    if (token == null) {
      debugPrint("CRITICAL: getToken() returned NULL");
    }
    return token;
  }

  Future<Map<String, dynamic>?> getCurrentUser() async {
    final userId = await _readSecure('user_id');
    final username = await _readSecure('username');
    final role = await _readSecure('role');
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
