import 'package:flutter/foundation.dart';
import 'package:shorebird_code_push/shorebird_code_push.dart';
import 'dart:async';

class UpdateService extends ChangeNotifier {
  final _shorebirdCodePush = ShorebirdCodePush();
  bool _isChecking = false;
  bool _isDownloading = false;
  bool _newPatchAvailable = false; // Succeeded check, not yet downloaded
  bool _updateAvailable = false;   // Downloaded, ready to install (requires restart)
  int? _currentPatch;

  bool get isChecking => _isChecking;
  bool get isDownloading => _isDownloading;
  bool get newPatchAvailable => _newPatchAvailable;
  bool get updateAvailable => _updateAvailable;
  int? get currentPatch => _currentPatch;

  // Singleton pattern
  static final UpdateService _instance = UpdateService._internal();
  factory UpdateService() => _instance;
  UpdateService._internal();

  /// Initialize and read current patch + perform silent check without downloading
  Future<void> init() async {
    if (kIsWeb || (defaultTargetPlatform != TargetPlatform.android && defaultTargetPlatform != TargetPlatform.iOS)) {
      return;
    }

    try {
      _currentPatch = await _shorebirdCodePush.currentPatchNumber();
      // Silently check if an update is available on start
      await checkForUpdates();
    } catch (e) {
      debugPrint("UpdateService Error during init: $e");
    }
  }

  /// Manually check if a new patch is available on the server
  Future<bool> checkForUpdates() async {
    if (_isChecking) return false;

    _isChecking = true;
    _newPatchAvailable = false;
    notifyListeners();

    try {
      final isUpdateAvailable = await _shorebirdCodePush.isNewPatchAvailableForDownload();
      debugPrint("UpdateService: New patch available: $isUpdateAvailable");
      _newPatchAvailable = isUpdateAvailable;
      return isUpdateAvailable;
    } catch (e) {
      debugPrint("UpdateService Error during check: $e");
      return false;
    } finally {
      _isChecking = false;
      notifyListeners();
    }
  }

  /// Manually download and prepare the available patch
  Future<bool> downloadAndInstall() async {
    if (_isDownloading) return false;

    _isDownloading = true;
    notifyListeners();

    try {
      debugPrint("UpdateService: Downloading patch...");
      await _shorebirdCodePush.downloadUpdateIfAvailable();
      _updateAvailable = true;
      _newPatchAvailable = false;
      return true;
    } catch (e) {
      debugPrint("UpdateService Error during download: $e");
      return false;
    } finally {
      _isDownloading = false;
      notifyListeners();
    }
  }
}
