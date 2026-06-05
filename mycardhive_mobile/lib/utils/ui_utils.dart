import 'package:flutter/material.dart';

Widget buildCategoryWithFlag(String category, TextStyle style, {Color? iconColor}) {
  if (category.isEmpty) return Text(category, style: style);

  final currencyMap = {
    'Global': 'Global',
    'USD': 'US Dollars',
    'GBP': 'British Pounds',
    'EUR': 'Euros',
    'AUD': 'Australian Dollars',
    'CAD': 'Canadian Dollars',
    'CHF': 'Swiss Francs',
  };

  final flagCodes = {
    'USD': 'us',
    'GBP': 'gb',
    'EUR': 'eu',
    'AUD': 'au',
    'CAD': 'ca',
    'CHF': 'ch',
  };

  final parts = category.split(' ');
  final firstWord = parts[0];
  final rest = parts.skip(1).join(' ');

  if (currencyMap.containsKey(firstWord)) {
    final fullName = currencyMap[firstWord]!;
    final displayStr = rest.isNotEmpty ? '$fullName $rest' : fullName;

    Widget flagWidget;
    if (firstWord == 'Global') {
      flagWidget = Padding(
        padding: const EdgeInsets.only(right: 8.0),
        child: Text('🌐', style: TextStyle(fontSize: (style.fontSize ?? 14) + 2)),
      );
    } else if (flagCodes.containsKey(firstWord)) {
      final code = flagCodes[firstWord]!;
      flagWidget = Padding(
        padding: const EdgeInsets.only(right: 8.0),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(3.0),
          child: Container(
            decoration: BoxDecoration(
              border: Border.all(color: Colors.white.withOpacity(0.15), width: 1.0),
            ),
            child: Image.network(
              'https://flagcdn.com/w80/$code.png',
              width: 24,
              height: 18,
              fit: BoxFit.fill,
              errorBuilder: (context, error, stackTrace) {
                return Icon(Icons.flag, size: 16, color: iconColor ?? Colors.grey);
              },
            ),
          ),
        ),
      );
    } else {
      flagWidget = const SizedBox.shrink();
    }

    return Row(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        flagWidget,
        Flexible(
          child: Text(
            displayStr,
            style: style,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }

  return Text(category, style: style, overflow: TextOverflow.ellipsis);
}
