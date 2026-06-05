import 'package:flutter/foundation.dart';
import 'package:shorebird_code_push/shorebird_code_push.dart';
import 'dart:async';

class UpdateService extends ChangeNotifier {
  final _shorebirdCodePush = ShorebirdCodePush();
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
      _currentPatch = await _shorebirdCodePush.currentPatchNumber();
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
      final isUpdateAvailable = await _shorebirdCodePush.isNewPatchAvailableForDownload();
      debugPrint("UpdateService: New patch available: $isUpdateAvailable");

      if (isUpdateAvailable) {
        debugPrint("UpdateService: Downloading patch...");
        await _shorebirdCodePush.downloadUpdateIfAvailable();
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
