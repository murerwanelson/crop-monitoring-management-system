import 'package:flutter/material.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'dart:async';
import '../services/sync_service.dart';
import '../services/local_db.dart';

class SyncProvider with ChangeNotifier {
  ConnectivityResult _connectivity = ConnectivityResult.none;
  int _unsyncedCount = 0;
  int _syncedCount = 0;
  int _totalRecords = 0;
  double _storageSizeMB = 0.0;
  bool _isSyncing = false;
  bool _isBackendReachable = true;
  bool _showSyncSuccess = false;

  int get unsyncedCount => _unsyncedCount;
  int get syncedCount => _syncedCount;
  int get totalRecords => _totalRecords;
  double get storageSizeMB => _storageSizeMB;
  bool get isSyncing => _isSyncing;
  bool get isOnline => _connectivity != ConnectivityResult.none && _isBackendReachable;
  bool get showSyncSuccess => _showSyncSuccess;

  SyncProvider() {
    _initConnectivity();
    _monitorConnectivity();
    checkUnsynced();
    _startHeartbeat();
  }

  void dismissSyncSuccess() {
    _showSyncSuccess = false;
    notifyListeners();
  }

  Future<void> _initConnectivity() async {
    _connectivity = await Connectivity().checkConnectivity();
    _checkBackendReachability();
    notifyListeners();
  }

  void _monitorConnectivity() {
    Connectivity().onConnectivityChanged.listen((result) {
      _connectivity = result;
      _checkBackendReachability();
      if (isOnline) {
        checkUnsynced().then((_) {
          if (_unsyncedCount > 0) startSync();
        });
      }
    });
  }

  void _startHeartbeat() {
    Timer.periodic(const Duration(seconds: 30), (timer) {
      _checkBackendReachability();
    });
  }

  Future<void> _checkBackendReachability() async {
    if (_connectivity == ConnectivityResult.none) {
      _isBackendReachable = false;
    } else {
      _isBackendReachable = true;
    }
    notifyListeners();
  }

  Future<void> checkUnsynced() async {
    final localDb = LocalDB();
    _unsyncedCount = await localDb.getUnsyncedRecordsCount();
    _syncedCount = await localDb.getSyncedRecordsCount();
    _totalRecords = await localDb.getTotalRecordsCount();
    _storageSizeMB = await localDb.getLocalStorageSizeMB();
    notifyListeners();
  }

  Future<void> startSync() async {
    if (_isSyncing || !isOnline) return;
    _isSyncing = true;
    _showSyncSuccess = false;
    notifyListeners();
    try {
      final syncService = SyncService();
      await syncService.syncAll();
      _showSyncSuccess = true;
      await checkUnsynced();
    } catch (e) {
      debugPrint('Manual sync error: $e');
    } finally {
      _isSyncing = false;
      notifyListeners();
    }
  }

  Future<void> clearLocalData() async {
    final localDb = LocalDB();
    await localDb.clearAllData();
    await checkUnsynced();
  }
}
