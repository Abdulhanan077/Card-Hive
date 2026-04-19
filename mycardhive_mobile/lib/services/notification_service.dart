import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter/material.dart';
import 'package:mycardhive_mobile/services/auth_service.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:timezone/timezone.dart' as tz;
import 'package:timezone/data/latest.dart' as tz;
import 'dart:math';
import 'package:firebase_messaging/firebase_messaging.dart';

class NotificationService {
  static final FlutterLocalNotificationsPlugin _notificationsPlugin = FlutterLocalNotificationsPlugin();
  static final Set<String> _seenNotifIds = {};
  static bool _initialCheckDone = false;
  static bool _notifIdsLoaded = false;

  static Future<void> init() async {
    const AndroidInitializationSettings initializationSettingsAndroid = AndroidInitializationSettings('@mipmap/ic_launcher');
    
    const DarwinInitializationSettings initializationSettingsIOS = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    const InitializationSettings initializationSettings = InitializationSettings(
      android: initializationSettingsAndroid,
      iOS: initializationSettingsIOS,
    );

    await _notificationsPlugin.initialize(settings: initializationSettings);
    
    // Initialize timezone data
    tz.initializeTimeZones();

    // 1. Setup Firebase Messaging listeners
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      debugPrint("FCM Foreground Message: ${message.notification?.title}");
      if (message.notification != null) {
        showNotification(
          id: message.hashCode,
          title: message.notification!.title!,
          body: message.notification!.body!,
        );
      }
    });

    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

    // Request permissions for Android 13+
    await _notificationsPlugin
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.requestNotificationsPermission();

    // Schedule daily reminder
    await scheduleDailyReminder();
  }

  @pragma('vm:entry-point')
  static Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
    debugPrint("Handling background FCM message: ${message.messageId}");
  }

  static Future<void> syncFcmToken(AuthService authService) async {
    try {
      final messaging = FirebaseMessaging.instance;
      final token = await messaging.getToken();
      
      if (token != null) {
        debugPrint("FCM Token: $token");
        await authService.updateFcmToken(token);
      }
    } catch (e) {
      debugPrint("FCM Token Sync Error: $e");
    }
  }

  static Set<String> _seenStatusLocally = {};

  static Future<void> markStatusAsSeenLocally(String id) async {
    _seenStatusLocally.add(id);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList('seen_status_ids', _seenStatusLocally.toList());
  }

  static Future<void> _loadSeenStatus() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final list = prefs.getStringList('seen_status_ids');
      if (list != null) _seenStatusLocally = list.toSet();
    } catch (_) {}
  }

  static Future<List<Map<String, dynamic>>> getFilteredNotifications(AuthService authService) async {
    final all = await checkAndNotify(authService);
    if (_seenStatusLocally.isEmpty) await _loadSeenStatus();
    
    return all.where((n) {
      return !_seenStatusLocally.contains(n['id']);
    }).toList();
  }

  static Future<void> _loadSeenIds() async {
    if (_notifIdsLoaded) return;
    try {
      final prefs = await SharedPreferences.getInstance();
      final list = prefs.getStringList('notified_ids');
      if (list != null) _seenNotifIds.addAll(list);
      _notifIdsLoaded = true;
    } catch (_) {}
  }

  static Future<void> _saveSeenIds() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setStringList('notified_ids', _seenNotifIds.toList());
    } catch (_) {}
  }

  static Future<List<Map<String, dynamic>>> checkAndNotify(AuthService authService, {bool isBackgroundTask = false}) async {
    try {
      if (_seenStatusLocally.isEmpty) await _loadSeenStatus();
      if (!_notifIdsLoaded) await _loadSeenIds();

      final token = await authService.getToken();
      if (token == null) {
        debugPrint("Notification Check: No token available");
        return [];
      }

      final userData = await authService.getCurrentUser();
      final isAdmin = userData != null && userData['role'] == 'ADMIN';
      
      final endpoint = isAdmin ? '/mobile/admin/notifications' : '/mobile/user/notifications';

      debugPrint("Notification Check: Fetching from $endpoint...");
      final response = await http.get(
        Uri.parse('${AuthService.baseUrl}$endpoint'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
          'Cookie': '${AuthService.baseUrl.startsWith('https') ? '__Secure-' : ''}next-auth.session-token=$token',
        },
      ).timeout(const Duration(seconds: 20));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final List<dynamic> notifications = data['notifications'] ?? [];
        debugPrint("Notification Check: Found ${notifications.length} total notifications");
        
        bool hasNew = false;
        for (var notif in notifications) {
          final id = notif['id'].toString();
          if (!_seenNotifIds.contains(id)) {
            _seenNotifIds.add(id);
            hasNew = true;
            debugPrint("Notification Check: New ID found: $id");
            
             // Trigger notification if it's not the very first app load
             // OR if it's running in a background task (where process is always fresh)
             if (_initialCheckDone || isBackgroundTask) {
              debugPrint("Notification Check: Triggering system alert for $id");
              await showNotification(
                id: id.hashCode.abs(),
                title: notif['title'],
                body: notif['body'],
              );
            }
          }
        }
        
        if (hasNew) await _saveSeenIds();
        _initialCheckDone = true;
        return List<Map<String, dynamic>>.from(notifications);
      }
    } catch (e) {
      debugPrint("Notification Check Error: $e");
    }
    return [];
  }

  static Future<void> showNotification({
    required int id,
    required String title,
    required String body,
  }) async {
    debugPrint("PUSHING NOTIF: $id - $title");
    const AndroidNotificationDetails androidDetails = AndroidNotificationDetails(
      'critical_alerts_v5', 
      'Priority Admin Alerts',
      channelDescription: 'Heads-up notifications for trade updates and messages',
      importance: Importance.max,
      priority: Priority.high,
      showWhen: true,
      enableVibration: true,
      playSound: true,
      fullScreenIntent: true,
      color: Color(0xFF2563EB),
      category: AndroidNotificationCategory.message,
    );

    const NotificationDetails platformDetails = NotificationDetails(android: androidDetails);
    
    await _notificationsPlugin.show(
      id: id,
      title: title,
      body: body,
      notificationDetails: platformDetails,
    );
  }

  static Future<void> scheduleDailyReminder() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      
      // Re-randomize the time every time the app is opened to keep it feeling fresh.

      // Pick a random time between 9 AM and 8 PM
      final random = Random();
      final hour = 9 + random.nextInt(12); // 9 to 20
      final minute = random.nextInt(60);

      debugPrint("SCHEDULING DAILY REMINDER AT $hour:$minute");

      const AndroidNotificationDetails androidDetails = AndroidNotificationDetails(
        'daily_reminders',
        'Daily Trade Reminders',
        channelDescription: 'Gentle reminders to trade your gift cards',
        importance: Importance.defaultImportance,
        priority: Priority.defaultPriority,
      );

      const NotificationDetails platformDetails = NotificationDetails(android: androidDetails);

      // Schedule it to repeat daily
      await _notificationsPlugin.zonedSchedule(
        id: 888,
        title: 'Time to Trade!',
        body: 'Don\'t let your gift cards go to waste. Check today\'s best rates and trade them for instant cash!',
        scheduledDate: _nextInstanceOfTime(hour, minute),
        notificationDetails: platformDetails,
        androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
        matchDateTimeComponents: DateTimeComponents.time,
      );

      await prefs.setBool('daily_reminder_set', true);
    } catch (e) {
      debugPrint("Schedule Reminder Error: $e");
    }
  }

  static tz.TZDateTime _nextInstanceOfTime(int hour, int minute) {
    final tz.TZDateTime now = tz.TZDateTime.now(tz.local);
    tz.TZDateTime scheduledDate = tz.TZDateTime(tz.local, now.year, now.month, now.day, hour, minute);
    if (scheduledDate.isBefore(now)) {
      scheduledDate = scheduledDate.add(const Duration(days: 1));
    }
    return scheduledDate;
  }
}
