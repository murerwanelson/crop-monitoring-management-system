import 'package:flutter/foundation.dart';
import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:geolocator/geolocator.dart';
import 'dart:async';
import '../services/api_service.dart';
import '../services/sync_service.dart';
import '../services/local_db.dart';
import '../services/map_downloader_service.dart';

class AppState with ChangeNotifier {
  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  final ApiService _api = ApiService();
  
  bool _isAuthenticated = false;
  Map<String, dynamic>? _user;
  String? _userRole;
  List<String> _permissions = [];
  double _mapCacheSizeMB = 0.0;
  
  ConnectivityResult _connectivity = ConnectivityResult.none;
  int _unsyncedCount = 0;
  int _syncedCount = 0;
  int _totalRecords = 0;
  double _storageSizeMB = 0.0;
  bool _isSyncing = false;
  bool _isBackendReachable = true;

  Position? _currentPosition;
  double? _gpsAccuracy;
  StreamSubscription<Position>? _gpsSubscription;
  bool _isMapCached = false;
  
  bool get isAuthenticated => _isAuthenticated;
  Map<String, dynamic>? get user => _user;
  String? get userRole => _userRole;
  List<String> get permissions => _permissions;
  bool get isOnline => _connectivity != ConnectivityResult.none && _isBackendReachable;
  bool get isBackendReachable => _isBackendReachable;
  int get unsyncedCount => _unsyncedCount;
  int get syncedCount => _syncedCount;
  int get totalRecords => _totalRecords;
  double get storageSizeMB => _storageSizeMB;
  bool get isSyncing => _isSyncing;

  Position? get currentPosition => _currentPosition;
  double? get gpsAccuracy => _gpsAccuracy;
  bool get isMapCached => _isMapCached;
  
  AppState() {
    _checkAuthStatus();
    _initConnectivity();
    _monitorConnectivity();
    checkUnsynced();
    _checkMapCache();
    _startHeartbeat();
  }

  Future<void> _initConnectivity() async {
    _connectivity = await Connectivity().checkConnectivity();
    await _checkBackendReachability();
    notifyListeners();
  }

  void _startHeartbeat() {
    // Check backend reachability every 30 seconds
    Timer.periodic(const Duration(seconds: 30), (timer) {
      _checkBackendReachability();
    });
  }

  Future<void> _checkBackendReachability() async {
    if (_connectivity == ConnectivityResult.none) {
      _isBackendReachable = false;
      notifyListeners();
      return;
    }

    try {
      // Perform a lightweight HEAD request to check if backend is actually accessible
      final response = await _api.authenticatedRequest('GET', '/users/me/').timeout(const Duration(seconds: 5));
      _isBackendReachable = response.statusCode == 200 || response.statusCode == 401; // 401 means reachable but unauthorized
    } catch (_) {
      _isBackendReachable = false;
    }
    notifyListeners();
  }
  
  Future<void> _checkAuthStatus() async {
    final token = await _storage.read(key: 'accessToken');
    _isAuthenticated = token != null;
    
    if (_isAuthenticated) {
      _userRole = await _storage.read(key: 'role');
      final username = await _storage.read(key: 'username');
      if (username != null) {
        _user = {'username': username};
      }
      
      // Load permissions if stored
      final permsJson = await _storage.read(key: 'permissions');
      if (permsJson != null) {
        try {
          _permissions = List<String>.from(jsonDecode(permsJson));
        } catch (_) {}
      }
    }
    
    notifyListeners();
  }
  
  void _monitorConnectivity() {
    Connectivity().onConnectivityChanged.listen((result) {
      _connectivity = result;
      
      _checkBackendReachability();
      
      // Auto-sync when connectivity is restored
      if (isOnline) {
        checkUnsynced().then((_) {
          if (_unsyncedCount > 0) startSync();
        });
      }
    });
  }

  Future<void> _checkMapCache() async {
    final localDb = LocalDB();
    final count = await localDb.getTotalRecordsCount();
    _isMapCached = count > 0;
    notifyListeners();
  }
  
  Future<bool> login(String username, String password) async {
    try {
      final success = await _api.login(username, password);
      
      if (success) {
        _isAuthenticated = true;
        
        _userRole = await _storage.read(key: 'role');
        final username = await _storage.read(key: 'username');
        if (username != null) {
          _user = {'username': username};
        }

        final permsJson = await _storage.read(key: 'permissions');
        if (permsJson != null) {
          try {
            _permissions = List<String>.from(jsonDecode(permsJson));
          } catch (_) {}
        }
        
        _isBackendReachable = true;
        notifyListeners();
      }
      
      return success;
    } catch (e) {
      return false;
    }
  }

  Future<bool> register(Map<String, dynamic> userData) async {
    try {
      final success = await _api.register(userData);
      return success;
    } catch (e) {
      return false;
    }
  }
  
  Future<void> logout() async {
    await _storage.deleteAll();
    _isAuthenticated = false;
    _user = null;
    _userRole = null;
    _permissions = [];
    notifyListeners();
  }
  
  Future<void> checkUnsynced() async {
    final localDb = LocalDB();
    _unsyncedCount = await localDb.getUnsyncedRecordsCount();
    _syncedCount = await localDb.getSyncedRecordsCount();
    _totalRecords = await localDb.getTotalRecordsCount();
    _storageSizeMB = await localDb.getLocalStorageSizeMB();
    
    final downloader = MapDownloaderService();
    _mapCacheSizeMB = await downloader.getCacheSizeMB();
    
    _checkMapCache();
    await _checkBackendReachability();
    notifyListeners();
  }

  double get mapCacheSizeMB => _mapCacheSizeMB;

  Stream<double> downloadMapArea({
    required double minLat,
    required double minLon,
    required double maxLat,
    required double maxLon,
  }) {
    final downloader = MapDownloaderService();
    return downloader.downloadRegion(
      minLat: minLat,
      minLon: minLon,
      maxLat: maxLat,
      maxLon: maxLon,
    ).map((progress) {
      if (progress >= 1.0) {
        checkUnsynced();
      }
      return progress;
    });
  }

  Future<void> startSync() async {
    if (_isSyncing || !isOnline) return;
    
    _isSyncing = true;
    notifyListeners();
    
    try {
      final syncService = SyncService();
      await syncService.syncAll();
      await checkUnsynced();
    } catch (e) {
      print('Manual sync error: $e');
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

  // --- GPS Tracking ---

  void startGpsTracking() {
    if (_gpsSubscription != null) return;

    _gpsSubscription = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 5,
      ),
    ).listen((position) {
      _currentPosition = position;
      _gpsAccuracy = position.accuracy;
      notifyListeners();
    });
  }

  void stopGpsTracking() {
    _gpsSubscription?.cancel();
    _gpsSubscription = null;
    _currentPosition = null;
    _gpsAccuracy = null;
    notifyListeners();
  }
}
