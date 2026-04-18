import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:mycardhive_mobile/services/auth_service.dart';
import 'package:mycardhive_mobile/services/cache_service.dart';

class TradeService {
  final AuthService _authService = AuthService();

  Future<Map<String, dynamic>> submitTrade({
    required List<Map<String, dynamic>> cards,
    required String payoutMethod,
    required Map<String, String> payoutDetails, // Either Mobile Money or Crypto params
    required List<String> imagePaths,
    String? notes,
  }) async {
    try {
      final token = await _authService.getToken();
      if (token == null) {
        return {'success': false, 'error': 'Unauthorized. Please login again.'};
      }

      var uri = Uri.parse('${AuthService.baseUrl}/trades');
      var request = http.MultipartRequest('POST', uri);

      // NextAuth determines session via Cookie headers usually
      // Because we use encode() from next-auth/jwt to create our JWT, the web /api/trades route
      // expects it in the "next-auth.session-token" cookie.
      final cookieName = AuthService.baseUrl.startsWith('https') 
          ? '__Secure-next-auth.session-token' 
          : 'next-auth.session-token';

      request.headers.addAll({
        'Cookie': '$cookieName=$token',
      });

      // Payload strings
      request.fields['payoutMethod'] = payoutMethod;
      payoutDetails.forEach((key, value) {
        request.fields[key] = value;
      });

      if (notes != null && notes.isNotEmpty) {
        request.fields['notes'] = notes;
      }

      // Encode cards exactly like web does:
      // const extractedCurrency = c.cardCategory.split(' ')[0] || "USD";
      // and map properties matching exactly
      
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

      // Attach Files (Images)
      for (var imgPath in imagePaths) {
        request.files.add(await http.MultipartFile.fromPath(
          'images',
          imgPath,
        ));
      }

      // Send Request (120s timeout because we are not compressing images)
      var streamedResponse = await request.send().timeout(const Duration(seconds: 120));
      var response = await http.Response.fromStream(streamedResponse);

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
          // If body is not JSON, show the first 100 chars of the body for debugging
          errMsg = response.body.length > 100 
            ? response.body.substring(0, 100) + "..." 
            : response.body.isNotEmpty ? response.body : 'Server Error ${response.statusCode}';
        }
        return {'success': false, 'error': errMsg};
      }
    } catch (e) {
      return {'success': false, 'error': 'Connection failed: $e'};
    }
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
          'Cookie': '${AuthService.baseUrl.startsWith('https') ? '__Secure-' : ''}next-auth.session-token=$token',
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
