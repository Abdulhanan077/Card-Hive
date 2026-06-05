class CategoryUtils {
  static int sortCategories(String a, String b) {
    String getCurrency(String str) => (str.split(' ').first).toUpperCase();

    int getValue(String str) {
      final regExp = RegExp(r'\((?:\$|£|€)?(\d+)');
      final match = regExp.firstMatch(str);
      return match != null ? int.parse(match.group(1)!) : 0;
    }

    int getPriority(String curr) {
      if (curr == 'USD') return 1;
      if (curr == 'GBP') return 2;
      if (curr == 'EUR') return 3;
      if (curr == 'CAD') return 4;
      if (curr == 'AUD') return 5;
      return 99;
    }

    final currencyA = getCurrency(a);
    final currencyB = getCurrency(b);

    final priorityA = getPriority(currencyA);
    final priorityB = getPriority(currencyB);

    if (priorityA != priorityB) {
      return priorityA - priorityB;
    }

    if (currencyA != currencyB) {
      return currencyA.compareTo(currencyB);
    }

    return getValue(a) - getValue(b);
  }

  static String validateCategoryAmount(double value, String categoryName) {
    final matchRange = RegExp(r'\((?:\$|£|€)?(\d+)\s*-\s*(?:\$|£|€)?(\d+)\)').firstMatch(categoryName);
    final matchMin = RegExp(r'\((?:\$|£|€)?(\d+)\+\)').firstMatch(categoryName);
    final matchExact = RegExp(r'\((?:\$|£|€)?(\d+)\)').firstMatch(categoryName);

    if (matchRange != null) {
      final min = double.parse(matchRange.group(1)!);
      final max = double.parse(matchRange.group(2)!);
      if (value < min || value > max) {
        return "Amount must be between $min and $max for this category.";
      }
    } else if (matchMin != null) {
      final min = double.parse(matchMin.group(1)!);
      if (value < min) {
        return "Amount must be at least $min for this category.";
      }
    } else if (matchExact != null) {
      final exact = double.parse(matchExact.group(1)!);
      if (value != exact) {
        return "Amount must be exactly $exact for this category.";
      }
    }

    return "";
  }

  static double? getExactCategoryAmount(String categoryName) {
    if (categoryName.isEmpty) return null;
    final matchRange = RegExp(r'\((?:\$|£|€)?(\d+)\s*-\s*(?:\$|£|€)?(\d+)\)').hasMatch(categoryName);
    final matchMin = RegExp(r'\((?:\$|£|€)?(\d+)\+\)').hasMatch(categoryName);
    final matchExact = RegExp(r'\((?:\$|£|€)?(\d+)\)').firstMatch(categoryName);

    if (matchRange || matchMin) return null;

    if (matchExact != null) {
      return double.parse(matchExact.group(1)!);
    }
    return null;
  }

  static List<dynamic> searchAndSortRates(
    List<dynamic> rates,
    String searchQuery,
    String typeFilter,
    String sortBy,
  ) {
    // 1. Filter by card type
    var result = rates.where((r) {
      final rType = r['cardType'] ?? "Physical";
      if (typeFilter == "Physical") return rType == "Physical";
      if (typeFilter == "E-code") return rType == "E-code";
      return true;
    }).toList();

    // 2. Perform dynamic search and scoring
    final query = searchQuery.trim().toLowerCase();
    if (query.isNotEmpty) {
      final fillerWords = {"gift", "card", "cards", "payout", "rate", "rates", "trade", "trades"};
      final rawKeywords = query.split(RegExp(r'\s+')).where((w) => w.isNotEmpty).toList();
      final keywords = rawKeywords.where((w) => !fillerWords.contains(w)).toList();
      
      final activeKeywords = keywords.isNotEmpty ? keywords : rawKeywords;

      final synonymMap = {
        'us': ['usd', 'us dollars', 'united states', 'america'],
        'usa': ['usd', 'us dollars', 'united states', 'america'],
        'america': ['usd', 'us dollars', 'united states', 'america'],
        'aus': ['aud', 'australian dollars', 'australia'],
        'australia': ['aud', 'australian dollars', 'australia'],
        'can': ['cad', 'canadian dollars', 'canada'],
        'canada': ['cad', 'canadian dollars', 'canada'],
        'uk': ['gbp', 'british pounds', 'pound', 'pounds', 'british', 'england'],
        'gb': ['gbp', 'british pounds', 'pound', 'pounds', 'british', 'england'],
        'england': ['gbp', 'british pounds', 'pound', 'pounds', 'british', 'england'],
        'pound': ['gbp', 'british pounds'],
        'pounds': ['gbp', 'british pounds'],
        'eu': ['eur', 'euros', 'euro', 'europe', 'germany', 'france', 'austria', 'italy', 'spain'],
        'eur': ['eur', 'euros', 'euro', 'europe', 'germany', 'france', 'austria', 'italy', 'spain'],
        'euro': ['eur', 'euros', 'europe'],
        'euros': ['eur', 'euros', 'europe'],
        'europe': ['eur', 'euros', 'europe'],
        'austria': ['eur', 'euros', 'europe', 'austria'],
        'germany': ['eur', 'euros', 'europe', 'germany'],
        'france': ['eur', 'euros', 'europe', 'france'],
        'swiss': ['chf', 'swiss francs', 'switzerland'],
        'switzerland': ['chf', 'swiss francs', 'switzerland'],
        'franc': ['chf', 'swiss francs'],
        'francs': ['chf', 'swiss francs'],
      };

      final scoredItems = result.map((r) {
        double score = 0;
        final brand = (r['cardBrand'] ?? "").toString().toLowerCase();
        final country = (r['cardCountry'] ?? "").toString().toLowerCase();
        final type = (r['cardType'] ?? "Physical").toString().toLowerCase();

        final fullString = "$brand $type $country";

        for (final kw in activeKeywords) {
          var matchesKw = false;
          
          if (fullString.contains(kw)) {
            matchesKw = true;
            if (brand.startsWith(kw)) score += 0.5;
            if (country.contains(kw)) score += 0.2;
          }

          if (!matchesKw && synonymMap.containsKey(kw)) {
            final synonyms = synonymMap[kw]!;
            if (synonyms.any((syn) => fullString.contains(syn))) {
              matchesKw = true;
              score += 0.5;
            }
          }

          if (matchesKw) {
            score += 1.0;
          }
        }

        return _ScoredItem(r, score);
      }).toList();

      scoredItems.retainWhere((item) => item.score > 0);
      scoredItems.sort((a, b) {
        if (b.score != a.score) {
          return b.score.compareTo(a.score);
        }
        if (sortBy == "Type") {
          final typeA = a.rate['cardType'] ?? "Physical";
          final typeB = b.rate['cardType'] ?? "Physical";
          if (typeA != typeB) return typeA.compareTo(typeB);
        }
        final brandA = (a.rate['cardBrand'] ?? "").toString().toLowerCase();
        final brandB = (b.rate['cardBrand'] ?? "").toString().toLowerCase();
        if (brandA != brandB) return brandA.compareTo(brandB);
        return sortCategories((a.rate['cardCountry'] ?? "").toString(), (b.rate['cardCountry'] ?? "").toString());
      });

      result = scoredItems.map((item) => item.rate).toList();
    } else {
      if (sortBy == "Type") {
        result.sort((a, b) {
          final typeA = a['cardType'] ?? "Physical";
          final typeB = b['cardType'] ?? "Physical";
          if (typeA != typeB) return typeA.compareTo(typeB);
          final brandA = (a['cardBrand'] ?? "").toString().toLowerCase();
          final brandB = (b['cardBrand'] ?? "").toString().toLowerCase();
          if (brandA != brandB) return brandA.compareTo(brandB);
          return sortCategories((a['cardCountry'] ?? "").toString(), (b['cardCountry'] ?? "").toString());
        });
      } else if (sortBy == "Brand") {
        result.sort((a, b) {
          final brandA = (a['cardBrand'] ?? "").toString().toLowerCase();
          final brandB = (b['cardBrand'] ?? "").toString().toLowerCase();
          if (brandA != brandB) return brandA.compareTo(brandB);
          return sortCategories((a['cardCountry'] ?? "").toString(), (b['cardCountry'] ?? "").toString());
        });
      } else {
        result.sort((a, b) {
          final brandA = (a['cardBrand'] ?? "").toString().toLowerCase();
          final brandB = (b['cardBrand'] ?? "").toString().toLowerCase();
          if (brandA != brandB) return brandA.compareTo(brandB);
          return sortCategories((a['cardCountry'] ?? "").toString(), (b['cardCountry'] ?? "").toString());
        });
      }
    }

    return result;
  }
}

class _ScoredItem {
  final dynamic rate;
  final double score;
  _ScoredItem(this.rate, this.score);
}
