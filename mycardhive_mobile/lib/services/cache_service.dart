import 'package:hive_flutter/hive_flutter.dart';
import 'dart:convert';
import 'package:path_provider/path_provider.dart';
import 'dart:io';
import 'package:path/path.dart' as p;

class CacheService {
  static const String ratesBoxName = 'rates_cache';
  static const String dashboardBoxName = 'dashboard_cache';
  static const String tradesBoxName = 'trades_cache';
  static const String tradeQueueBoxName = 'trade_queue';

  static Future<void> init() async {
    await Hive.initFlutter();
    await Hive.openBox(ratesBoxName);
    await Hive.openBox(dashboardBoxName);
    await Hive.openBox(tradesBoxName);
    await Hive.openBox(tradeQueueBoxName);
  }

  // --- Rates ---
  static Future<void> cacheRates(Map<String, dynamic> data) async {
    final box = Hive.box(ratesBoxName);
    await box.put('last_rates', json.encode(data));
    await box.put('last_updated', DateTime.now().toIso8601String());
  }

  static Map<String, dynamic>? getCachedRates() {
    if (!Hive.isBoxOpen(ratesBoxName)) return null;
    final box = Hive.box(ratesBoxName);
    final data = box.get('last_rates');
    if (data == null) return null;
    return json.decode(data);
  }

  // --- Dashboard ---
  static Future<void> cacheDashboard(Map<String, dynamic> data) async {
    final box = Hive.box(dashboardBoxName);
    await box.put('last_dashboard', json.encode(data));
  }

  static Map<String, dynamic>? getCachedDashboard() {
    if (!Hive.isBoxOpen(dashboardBoxName)) return null;
    final box = Hive.box(dashboardBoxName);
    final data = box.get('last_dashboard');
    if (data == null) return null;
    return json.decode(data);
  }

  // --- Trade History ---
  static Future<void> cacheTrades(List<Map<String, dynamic>> data) async {
    final box = Hive.box(tradesBoxName);
    await box.put('last_trades', json.encode(data));
  }

  static List<Map<String, dynamic>>? getCachedTrades() {
    if (!Hive.isBoxOpen(tradesBoxName)) return null;
    final box = Hive.box(tradesBoxName);
    final data = box.get('last_trades');
    if (data == null) return null;
    final List<dynamic> decoded = json.decode(data);
    return decoded.cast<Map<String, dynamic>>();
  }

  // --- Trade Queue (Offline Submissions) ---
  static Future<void> queueTrade(Map<String, dynamic> tradeData, List<String> imagePaths) async {
    final box = Hive.box(tradeQueueBoxName);
    
    // Copy images to a permanent directory if they are temp files
    final Directory appDocDir = await getApplicationDocumentsDirectory();
    final String offlineDir = p.join(appDocDir.path, 'offline_trades');
    await Directory(offlineDir).create(recursive: true);

    List<String> persistedImagePaths = [];
    for (String path in imagePaths) {
      final File file = File(path);
      final String fileName = p.basename(path);
      final String newPath = p.join(offlineDir, '${DateTime.now().millisecondsSinceEpoch}_$fileName');
      await file.copy(newPath);
      persistedImagePaths.add(newPath);
    }

    tradeData['imagePaths'] = persistedImagePaths;
    tradeData['queuedAt'] = DateTime.now().toIso8601String();

    List<dynamic> queue = box.get('queue', defaultValue: []);
    queue.add(tradeData);
    await box.put('queue', queue);
  }

  static List<Map<String, dynamic>> getTradeQueue() {
    final box = Hive.box(tradeQueueBoxName);
    List<dynamic> queue = box.get('queue', defaultValue: []);
    return List<Map<String, dynamic>>.from(queue);
  }

  static Box getTradeQueueBox() {
    return Hive.box(tradeQueueBoxName);
  }

  static Future<void> clearTradeQueue() async {
    final box = Hive.box(tradeQueueBoxName);
    await box.delete('queue');
  }
}
