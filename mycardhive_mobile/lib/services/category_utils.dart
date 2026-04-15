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
}
