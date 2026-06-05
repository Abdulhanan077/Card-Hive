import 'dart:async';
import 'package:mycardhive_mobile/services/trade_service.dart';
import 'package:mycardhive_mobile/services/notification_service.dart';
import 'package:mycardhive_mobile/services/cache_service.dart';

class StatusPollingService {
  static final TradeService _tradeService = TradeService();
  static Timer? _timer;
  static List<Map<String, dynamic>> _lastTrades = [];

  static void startPolling() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(minutes: 5), (_) => checkUpdates());
    // Initial check
    checkUpdates();
  }

  static void stopPolling() {
    _timer?.cancel();
  }

  static Future<void> checkUpdates() async {
    try {
      final trades = await _tradeService.getTrades();
      
      if (_lastTrades.isNotEmpty) {
        for (var trade in trades) {
          final oldTrade = _lastTrades.firstWhere(
            (t) => t['tradeId'] == trade['tradeId'],
            orElse: () => {},
          );

          if (oldTrade.isNotEmpty && oldTrade['status'] != trade['status']) {
            // Status changed! Show a friendly display label
            final rawStatus = trade['status'] as String? ?? '';
            final displayStatus = rawStatus == 'UNDER_REVIEW'
                ? 'Processing...'
                : rawStatus.replaceAll('_', ' ');

            NotificationService.showNotification(
              id: trade['id'] ?? DateTime.now().millisecondsSinceEpoch % 10000,
              title: "Trade $displayStatus",
              body: "Your ${trade['cardBrand'] ?? ''} trade (${trade['tradeId']}) is now $displayStatus.",
            );
          }
        }
      }

      _lastTrades = trades;
    } catch (e) {
      // Ignore errors during background polling
    }
  }
}
