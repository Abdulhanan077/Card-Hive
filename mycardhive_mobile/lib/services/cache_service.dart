import 'package:hive_flutter/hive_flutter.dart';
import 'dart:convert';
import 'package:path_provider/path_provider.dart';
import 'dart:io';
import 'package:path/path.dart' as p;

class CacheService {
  static const String ratesBoxName = 'rates_cache';
  static const String dashboardBoxName = 'dashboard_cache';
  static const String settingsBoxName = 'site_settings_cache';
  static const String tradesBoxName = 'trades_cache';
  static const String tradeQueueBoxName = 'trade_queue';
  static const String referralBoxName = 'referral_cache';
  static const String leaderboardBoxName = 'leaderboard_cache';
  static const String rewardsBoxName = 'rewards_cache';

  static Future<void> init() async {
    await Hive.initFlutter();
    await Hive.openBox(ratesBoxName);
    await Hive.openBox(dashboardBoxName);
    await Hive.openBox(settingsBoxName);
    await Hive.openBox(tradesBoxName);
    await Hive.openBox(tradeQueueBoxName);
    await Hive.openBox(referralBoxName);
    await Hive.openBox(leaderboardBoxName);
    await Hive.openBox(rewardsBoxName);
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

  // --- Site Settings ---
  static Future<void> cacheSiteSettings(Map<String, dynamic> data) async {
    final box = Hive.box(settingsBoxName);
    await box.put('last_settings', json.encode(data));
  }

  static Map<String, dynamic>? getCachedSiteSettings() {
    if (!Hive.isBoxOpen(settingsBoxName)) return null;
    final box = Hive.box(settingsBoxName);
    final data = box.get('last_settings');
    if (data == null) return null;
    return json.decode(data);
  }

  static bool isReviewMode() {
    final settings = getCachedSiteSettings();
    if (settings == null) return false;
    return settings['isReviewMode'] == true;
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

  // --- Referrals ---
  static Future<void> cacheReferralData(Map<String, dynamic> data) async {
    final box = Hive.box(referralBoxName);
    await box.put('last_referrals', json.encode(data));
  }

  static Map<String, dynamic>? getCachedReferralData() {
    if (!Hive.isBoxOpen(referralBoxName)) return null;
    final box = Hive.box(referralBoxName);
    final data = box.get('last_referrals');
    if (data == null) return null;
    return json.decode(data);
  }

  // --- Leaderboard ---
  static Future<void> cacheLeaderboardData(Map<String, dynamic> data) async {
    final box = Hive.box(leaderboardBoxName);
    await box.put('last_leaderboard', json.encode(data));
  }

  static Map<String, dynamic>? getCachedLeaderboardData() {
    if (!Hive.isBoxOpen(leaderboardBoxName)) return null;
    final box = Hive.box(leaderboardBoxName);
    final data = box.get('last_leaderboard');
    if (data == null) return null;
    return json.decode(data);
  }

  // --- Rewards ---
  static Future<void> cacheRewardsHistory(List<Map<String, dynamic>> data) async {
    final box = Hive.box(rewardsBoxName);
    await box.put('last_rewards', json.encode(data));
  }

  static List<Map<String, dynamic>>? getCachedRewardsHistory() {
    if (!Hive.isBoxOpen(rewardsBoxName)) return null;
    final box = Hive.box(rewardsBoxName);
    final data = box.get('last_rewards');
    if (data == null) return null;
    final List<dynamic> decoded = json.decode(data);
    return decoded.cast<Map<String, dynamic>>();
  }
}
