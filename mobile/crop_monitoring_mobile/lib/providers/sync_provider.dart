import 'package:flutter/material.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'dart:async';
import '../services/sync_service.dart';
import '../services/local_db.dart';
import '../services/supabase_service.dart';
import '../models/observation_models.dart';

class SyncProvider with ChangeNotifier {
  ConnectivityResult _connectivity = ConnectivityResult.none;
  int _unsyncedCount = 0;
  int _syncedCount = 0;
  int _totalRecords = 0;
  double _storageSizeMB = 0.0;
  bool _isSyncing = false;
  bool _isBackendReachable = true;
  bool _showSyncSuccess = false;

  List<BlockModel> _availableBlocks = [];
  StreamSubscription? _blocksSubscription;

  int get unsyncedCount => _unsyncedCount;
  int get syncedCount => _syncedCount;
  int get totalRecords => _totalRecords;
  double get storageSizeMB => _storageSizeMB;
  bool get isSyncing => _isSyncing;
  bool get isOnline => _connectivity != ConnectivityResult.none && _isBackendReachable;
  bool get showSyncSuccess => _showSyncSuccess;
  List<BlockModel> get availableBlocks => _availableBlocks;

  SyncProvider() {
    _initConnectivity();
    _monitorConnectivity();
    checkUnsynced();
    _startHeartbeat();
    _initBlocksStream();
  }

  @override
  void dispose() {
    _blocksSubscription?.cancel();
    super.dispose();
  }

  void _initBlocksStream() {
    final supabase = SupabaseService();
    final localDb = LocalDB();
    
    // Initial load from local DB
    localDb.getAllBlocks().then((blocks) {
      if (blocks.isNotEmpty) {
        _availableBlocks = blocks.map((e) => BlockModel.fromMap(e)).toList();
        notifyListeners();
      }
    });

    // FAIL-SAFE: Manual fetch on startup
    // This ensures new devices/accounts pull data even if Realtime isn't configured yet
    refreshBlocks();

    // Real-time stream from Supabase
    _blocksSubscription = supabase.getBlocksStream().listen((blocks) {
      _availableBlocks = blocks.map((e) => BlockModel.fromMap(e)).toList();
      localDb.syncBlocks(blocks); // Keep local DB updated
      notifyListeners();
    }, onError: (error) {
      debugPrint('SyncProvider: Blocks Stream Error: $error');
    });
  }

  Future<void> refreshBlocks() async {
    try {
      final supabase = SupabaseService();
      final localDb = LocalDB();
      final blocks = await supabase.fetchBlocks();
      
      if (blocks.isNotEmpty) {
        _availableBlocks = blocks.map((e) => BlockModel.fromMap(e)).toList();
        await localDb.syncBlocks(blocks);
        notifyListeners();
      }
    } catch (e) {
      debugPrint('SyncProvider: Error fetching blocks manually: $e');
    }
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
      final oldOnline = isOnline;
      _connectivity = result;
      _checkBackendReachability();
      
      if (isOnline && !oldOnline) {
        // Just came online - refresh everything from DB
        refreshAll();
        
        checkUnsynced().then((_) {
          if (_unsyncedCount > 0) startSync();
        });
      }
    });
  }

  Future<void> refreshAll() async {
    await refreshBlocks();
    // In the future, we can add refreshObservations() here 
    // to update the local cache of history items.
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
