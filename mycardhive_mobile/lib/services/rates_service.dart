import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:mycardhive_mobile/models/rate.dart';
import 'package:mycardhive_mobile/services/auth_service.dart';
import 'package:mycardhive_mobile/services/cache_service.dart';

class RatesService {
  static const String baseUrl = AuthService.baseUrl;

  Future<RatesResponse> fetchRates() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/rates')).timeout(const Duration(seconds: 10));
      
      if (response.statusCode == 200) {
        final Map<String, dynamic> data = json.decode(response.body);
        // Cache the fresh data
        await CacheService.cacheRates(data);
        return RatesResponse.fromJson(data);
      } else {
        throw Exception('Server error');
      }
    } catch (e) {
      // Offline fallback: Attempt to load from cache
      final cachedData = CacheService.getCachedRates();
      if (cachedData != null) {
        return RatesResponse.fromJson(cachedData);
      }
      
      // Critical fallback: Static mock data if cache is also empty
      return RatesResponse(
        rates: [
          Rate(id: 1, cardBrand: "iTunes", cardCountry: "USD (10-500)", cardType: "Physical", rate: 12.5),
          Rate(id: 2, cardBrand: "iTunes", cardCountry: "USD (10-500)", cardType: "E-code", rate: 11.0),
          Rate(id: 3, cardBrand: "Amazon", cardCountry: "EUR (10-200)", cardType: "Physical", rate: 14.2),
          Rate(id: 4, cardBrand: "Steam", cardCountry: "GBP (£10-£100)", cardType: "Physical", rate: 15.5),
        ],
        usdtExchangeRate: 15.2,
      );
    }
  }
}
