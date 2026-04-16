import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:mycardhive_mobile/services/auth_service.dart';

class RateService {
  Future<List<Map<String, dynamic>>> getTopRates() async {
    try {
      final response = await http.get(
        Uri.parse('${AuthService.baseUrl}/rates'),
        headers: {'Content-Type': 'application/json'},
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final Map<String, dynamic> data = json.decode(response.body);
        final List<dynamic> ratesList = data['rates'] ?? [];
        
        // 1. Calculate effective rate for each (publicRate ?? rate)
        // 2. Group by brand to keep only the highest rate per brand
        final Map<String, Map<String, dynamic>> topBrandedRates = {};
        
        for (var r in ratesList) {
          final String brand = r['cardBrand'] ?? 'Unknown';
          final double rate = (r['publicRate'] ?? r['rate'] ?? 0.0).toDouble();
          
          if (!topBrandedRates.containsKey(brand) || rate > (topBrandedRates[brand]?['effectiveRate'] ?? 0.0)) {
            final rateMap = Map<String, dynamic>.from(r);
            rateMap['effectiveRate'] = rate;
            topBrandedRates[brand] = rateMap;
          }
        }

        final List<Map<String, dynamic>> sortedRates = topBrandedRates.values.toList();
        sortedRates.sort((a, b) => (b['effectiveRate'] as num).compareTo(a['effectiveRate'] as num));
        
        return sortedRates.take(5).toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }
}
