import 'package:flutter/foundation.dart';
import 'package:shorebird_code_push/shorebird_code_push.dart';
import 'dart:async';

class UpdateService extends ChangeNotifier {
  final _updater = ShorebirdUpdater();
  bool _isChecking = false;
  bool _updateAvailable = false;
  int? _currentPatch;

  bool get isChecking => _isChecking;
  bool get updateAvailable => _updateAvailable;
  int? get currentPatch => _currentPatch;

  // Singleton pattern
  static final UpdateService _instance = UpdateService._internal();
  factory UpdateService() => _instance;
  UpdateService._internal();

  /// Initialize and check for updates silently
  Future<void> init() async {
    // Only Shorebird on Android/iOS
    if (kIsWeb || (defaultTargetPlatform != TargetPlatform.android && defaultTargetPlatform != TargetPlatform.iOS)) {
      return;
    }

    try {
      // Shorebird legacy patch number check if needed
      // Note: version 2.0 uses different ways to track patches, but we can still try to get patch number
      // For now, let's focus on the update flow.
      
      // Initial check
      await checkForUpdates();
    } catch (e) {
      debugPrint("UpdateService Error: $e");
    }
  }

  /// Manually trigger an update check
  Future<void> checkForUpdates() async {
    if (_isChecking) return;

    _isChecking = true;
    notifyListeners();

    try {
      final status = await _updater.checkForUpdate();
      debugPrint("UpdateService: Status: $status");

      if (status == UpdateStatus.outdated) {
        debugPrint("UpdateService: New patch available! Downloading...");
        // Automatically download and install (apply for next restart)
        await _updater.update();
        
        _updateAvailable = true;
        notifyListeners();
      }
    } catch (e) {
      debugPrint("UpdateService Error during check: $e");
    } finally {
      _isChecking = false;
      notifyListeners();
    }
  }
}
