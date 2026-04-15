class Rate {
  final int id;
  final String cardBrand;
  final String cardCountry;
  final String cardType;
  final double rate;
  final double? publicRate;

  Rate({
    required this.id,
    required this.cardBrand,
    required this.cardCountry,
    required this.cardType,
    required this.rate,
    this.publicRate,
  });

  factory Rate.fromJson(Map<String, dynamic> json) {
    return Rate(
      id: json['id'],
      cardBrand: json['cardBrand'],
      cardCountry: json['cardCountry'],
      cardType: json['cardType'],
      rate: (json['rate'] as num).toDouble(),
      publicRate: json['publicRate'] != null ? (json['publicRate'] as num).toDouble() : null,
    );
  }

  double get displayRate => publicRate ?? rate;
}

class RatesResponse {
  final List<Rate> rates;
  final double usdtExchangeRate;

  RatesResponse({required this.rates, required this.usdtExchangeRate});

  factory RatesResponse.fromJson(Map<String, dynamic> json) {
    return RatesResponse(
      rates: (json['rates'] as List).map((r) => Rate.fromJson(r)).toList(),
      usdtExchangeRate: (json['usdtExchangeRate'] as num).toDouble(),
    );
  }
}
