import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:mycardhive_mobile/models/rate.dart';

class RatesService {
  // Use your production URL here once the API is ready
  static const String baseUrl = 'https://mycardhive.com/api';

  Future<RatesResponse> fetchRates() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/rates'));
      
      if (response.statusCode == 200) {
        return RatesResponse.fromJson(json.decode(response.body));
      } else {
        throw Exception('Failed to load rates');
      }
    } catch (e) {
      // Return mock data if API fails or isn't ready
      return RatesResponse(
        rates: [
          Rate(id: 1, cardBrand: "iTunes", cardCountry: "USA (10-500)", cardType: "Physical", rate: 12.5),
          Rate(id: 2, cardBrand: "iTunes", cardCountry: "USA (10-500)", cardType: "E-code", rate: 11.0),
          Rate(id: 3, cardBrand: "Amazon", cardCountry: "Germany (10-200)", cardType: "Physical", rate: 14.2),
          Rate(id: 4, cardBrand: "Steam", cardCountry: "UK (£10-£100)", cardType: "Physical", rate: 15.5),
        ],
        usdtExchangeRate: 15.2,
      );
    }
  }
}
