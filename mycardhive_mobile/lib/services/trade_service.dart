import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:path/path.dart' as path;
import 'package:flutter/foundation.dart';
import 'package:mycardhive_mobile/services/auth_service.dart';
import 'package:mycardhive_mobile/services/cache_service.dart';

class TradeService {
  final AuthService _authService = AuthService();

  Future<Map<String, dynamic>> submitTrade({
    required List<Map<String, dynamic>> cards,
    required String payoutMethod,
    required Map<String, String> payoutDetails,
    required List<String> imagePaths,
    String? notes,
  }) async {
    try {
      final token = await _authService.getToken();
      if (token == null) {
        return {'success': false, 'error': 'Unauthorized. Please login again.'};
      }

      final cookieHeader = 'next-auth.session-token=$token';

      // --- New Direct Upload Strategy ---
      List<String> uploadedUrls = [];
      for (var imgPath in imagePaths) {
         try {
            final url = await _uploadImageDirectly(imgPath, token, cookieHeader);
           if (url != null) uploadedUrls.add(url);
         } catch (e) {
           debugPrint("Failed to upload image $imgPath directly: $e");
         }
      }

      var uri = Uri.parse('${AuthService.baseUrl}/trades');
      var request = http.MultipartRequest('POST', uri);

      request.headers.addAll({
        'Cookie': cookieHeader,
        'Authorization': 'Bearer $token', // Fallback for API routes
      });

      // Payload strings
      request.fields['payoutMethod'] = payoutMethod;
      payoutDetails.forEach((key, value) {
        request.fields[key] = value;
      });

      if (notes != null && notes.isNotEmpty) {
        request.fields['notes'] = notes;
      }

      // Restore cardsList mapping logic
      final cardsList = cards.map((c) {
        final category = c['cardCategory'] as String;
        final curr = category.contains(' ') ? category.split(' ')[0] : 'USD';
        
        return {
          'cardBrand': c['cardBrand'],
          'cardCountry': c['cardCategory'],
          'cardType': c['cardType'],
          'faceValue': double.parse(c['faceValue'].toString()),
          'currency': curr,
          'cardCode': c['cardCode'],
          'serialNumber': c['serialNumber'] ?? '',
        };
      }).toList();

      request.fields['cards'] = json.encode(cardsList);
      
      // Pass the pre-uploaded URLs to the server
      request.fields['preUploadedUrls'] = json.encode(uploadedUrls);

      final streamedResponse = await request.send().timeout(const Duration(seconds: 120));
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 201) {
        final data = json.decode(response.body);
        return {'success': true, 'tradeId': data['tradeId']};
      } else {
        String errMsg = 'Failed to submit trade';
        try {
          if (response.body.isNotEmpty) {
            final errData = json.decode(response.body);
            errMsg = errData['message'] ?? errData['error'] ?? 'Server Error: ${response.statusCode}';
          } else {
             errMsg = 'Server Error (Empty Response): ${response.statusCode}';
          }
        } catch (_) {
          errMsg = response.body.length > 100 
            ? response.body.substring(0, 100) + "..." 
            : response.body.isNotEmpty ? response.body : 'Server Error ${response.statusCode}';
        }
        return {'success': false, 'error': errMsg};
      }
    } catch (e) {
      String message = 'Failed to submit trade due to a connection error.';
      if (e.toString().contains('TimeoutException')) {
        message = 'Trade submission timed out. Please check your history before trying again.';
      } else if (e.toString().contains('SocketException')) {
        message = 'Connectivity issue detected. Please check your internet.';
      }
      debugPrint("Submit Trade Error: $e");
      return {'success': false, 'error': message};
    }
  }

  // Helper to upload image directly to R2 using a presigned URL
  Future<String?> _uploadImageDirectly(String localPath, String token, String cookieHeader) async {
    try {
       final file = File(localPath);
       final fileName = path.basename(localPath);
       final fileType = 'image/${path.extension(localPath).replaceAll('.', '') == 'jpg' ? 'jpeg' : path.extension(localPath).replaceAll('.', '')}';

       // 1. Get presigned URL
       final presignedRes = await http.post(
         Uri.parse('${AuthService.baseUrl}/uploads/presigned'),
          headers: {
            'Content-Type': 'application/json',
            'Cookie': cookieHeader,
            'Authorization': 'Bearer $token',
          },
         body: json.encode({
           'fileName': fileName,
           'fileType': fileType,
         }),
       );

       if (presignedRes.statusCode != 200) return null;
       final presignedData = json.decode(presignedRes.body);
       final String uploadUrl = presignedData['uploadUrl'];
       final String publicUrl = presignedData['publicUrl'];

       // 2. Upload binary to R2
       final binaryData = await file.readAsBytes();
       final uploadRes = await http.put(
         Uri.parse(uploadUrl),
         headers: { 'Content-Type': fileType },
         body: binaryData,
       );

       if (uploadRes.statusCode == 200 || uploadRes.statusCode == 201) {
         return publicUrl;
       }
    } catch (e) {
      debugPrint("Direct Upload Error: $e");
    }
    return null;
  }

  Future<List<Map<String, dynamic>>> getTrades() async {
    try {
      final token = await _authService.getToken();
      if (token == null) {
        throw Exception('Unauthorized. Please login again.');
      }

      final response = await http.get(
        Uri.parse('${AuthService.baseUrl}/trades'),
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'next-auth.session-token=$token',
          'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        final List<Map<String, dynamic>> trades = data.cast<Map<String, dynamic>>();
        
        // Cache the fresh data
        await CacheService.cacheTrades(trades);
        
        return trades;
      } else {
        // If server returns error, try to fallback to cache
        final cached = CacheService.getCachedTrades();
        if (cached != null) return cached;
        
        throw Exception('Failed to load trades. Server returned ${response.statusCode}');
      }
    } catch (e) {
      // On network failure, always try to fallback to cache
      final cached = CacheService.getCachedTrades();
      if (cached != null) return cached;
      
      throw Exception('Failed to fetch trades: $e');
    }
  }

  Future<List<Map<String, dynamic>>> getRecentTrades() async {
    final trades = await getTrades();
    return trades.take(3).toList();
  }

  Future<Map<String, dynamic>> getTradeById(String id) async {
    final trades = await getTrades();
    return trades.firstWhere(
      (t) => t['id'].toString() == id || t['tradeId'] == id,
      orElse: () => throw Exception('Trade not found'),
    );
  }

  Future<Map<String, dynamic>> confirmTradeReceipt(String tradeId) async {
    try {
      final token = await _authService.getToken();
      if (token == null) return {'success': false, 'error': 'Unauthorized'};

      final response = await http.post(
        Uri.parse('${AuthService.baseUrl}/mobile/trades/confirm'),
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'next-auth.session-token=$token',
        },
        body: json.encode({'tradeId': tradeId}),
      ).timeout(const Duration(seconds: 15));

      final data = json.decode(response.body);
      if (response.statusCode == 200 && data['success'] == true) {
        return {'success': true};
      } else {
        return {'success': false, 'error': data['message'] ?? 'Failed to confirm trade'};
      }
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }
}
