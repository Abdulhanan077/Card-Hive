import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:mycardhive_mobile/services/auth_service.dart';

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
      request.headers.addAll({
        'Cookie': 'next-auth.session-token=$token',
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

      // Send Request
      var streamedResponse = await request.send();
      var response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 201) {
        final data = json.decode(response.body);
        return {'success': true, 'tradeId': data['tradeId']};
      } else {
        String errMsg = 'Failed to submit trade';
        try {
          final errData = json.decode(response.body);
          errMsg = errData['message'] ?? errMsg;
        } catch (_) {}
        return {'success': false, 'error': errMsg};
      }
    } catch (e) {
      return {'success': false, 'error': 'Connection failed: $e'};
    }
  }
}
