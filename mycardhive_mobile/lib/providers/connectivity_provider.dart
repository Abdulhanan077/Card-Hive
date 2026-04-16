import 'package:flutter/material.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'dart:async';

enum ConnectivityStatus { online, offline, wifi, mobile }

class ConnectivityProvider extends ChangeNotifier {
  ConnectivityStatus _status = ConnectivityStatus.online;
  late StreamSubscription<List<ConnectivityResult>> _subscription;

  ConnectivityStatus get status => _status;
  bool get isOffline => _status == ConnectivityStatus.offline;

  ConnectivityProvider() {
    _init();
  }

  void _init() async {
    final results = await Connectivity().checkConnectivity();
    _updateStatus(results);

    _subscription = Connectivity().onConnectivityChanged.listen((results) {
      _updateStatus(results);
    });
  }

  void _updateStatus(List<ConnectivityResult> results) {
    if (results.isEmpty || results.contains(ConnectivityResult.none)) {
      _status = ConnectivityStatus.offline;
    } else if (results.contains(ConnectivityResult.wifi)) {
      _status = ConnectivityStatus.wifi;
    } else if (results.contains(ConnectivityResult.mobile)) {
      _status = ConnectivityStatus.mobile;
    } else {
      _status = ConnectivityStatus.online;
    }
    notifyListeners();
  }

  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }
}
