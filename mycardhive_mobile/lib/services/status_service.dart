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
            // Status changed!
            NotificationService.showNotification(
              id: trade['id'] ?? DateTime.now().millisecondsSinceEpoch % 10000,
              title: "Trade Update",
              body: "Trade ${trade['tradeId']} is now ${trade['status']}.",
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
