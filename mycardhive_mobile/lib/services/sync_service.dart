import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:mycardhive_mobile/services/cache_service.dart';
import 'package:mycardhive_mobile/services/trade_service.dart';
import 'package:mycardhive_mobile/services/notification_service.dart';

class SyncService {
  static final TradeService _tradeService = TradeService();
  static bool _isSyncing = false;

  static Future<void> syncOfflineTrades() async {
    if (_isSyncing) return;
    
    final queue = CacheService.getTradeQueue();
    if (queue.isEmpty) return;

    _isSyncing = true;
    debugPrint("🔄 Starting sync for ${queue.length} offline trades...");

    List<Map<String, dynamic>> remainingQueue = List.from(queue);
    bool anySuccess = false;

    for (var tradeData in queue) {
      try {
        final List<Map<String, dynamic>> cards = List<Map<String, dynamic>>.from(tradeData['cards']);
        final String payoutMethod = tradeData['payoutMethod'];
        final Map<String, String> payoutDetails = Map<String, String>.from(tradeData['payoutDetails']);
        final List<String> imagePaths = List<String>.from(tradeData['imagePaths']);

        final result = await _tradeService.submitTrade(
          cards: cards,
          payoutMethod: payoutMethod,
          payoutDetails: payoutDetails,
          imagePaths: imagePaths,
        );

        if (result['success']) {
          debugPrint("✅ Successfully synced trade ${result['tradeId']}");
          remainingQueue.removeWhere((t) => t['queuedAt'] == tradeData['queuedAt']);
          anySuccess = true;
        } else {
          debugPrint("❌ Failed to sync trade: ${result['error']}");
        }
      } catch (e) {
        debugPrint("⚠️ error syncing trade: $e");
      }
    }

    // Update the queue in Hive with whatever is left
    final box = CacheService.getTradeQueueBox(); // I need to add this getter to CacheService
    await box.put('queue', remainingQueue);

    if (anySuccess) {
      NotificationService.showNotification(
        id: 999,
        title: "Sync Complete",
        body: "Your offline trades have been successfully submitted.",
      );
    }

    _isSyncing = false;
  }
}
