import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../services/api_service.dart';
import '../services/sync_service.dart';
import '../services/local_db.dart';

class AppState with ChangeNotifier {
  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  final ApiService _api = ApiService();
  
  bool _isAuthenticated = false;
  Map<String, dynamic>? _user;
  String? _userRole;
  
  ConnectivityResult _connectivity = ConnectivityResult.none;
  int _unsyncedCount = 0;
  bool _isSyncing = false;
  
  bool get isAuthenticated => _isAuthenticated;
  Map<String, dynamic>? get user => _user;
  String? get userRole => _userRole;
  bool get isOnline => _connectivity != ConnectivityResult.none;
  int get unsyncedCount => _unsyncedCount;
  bool get isSyncing => _isSyncing;
  
  AppState() {
    _checkAuthStatus();
    _monitorConnectivity();
    checkUnsynced();
  }
  
  Future<void> _checkAuthStatus() async {
    final token = await _storage.read(key: 'accessToken');
    _isAuthenticated = token != null;
    
    if (_isAuthenticated) {
      final role = await _storage.read(key: 'user_role');
      _userRole = role;
    }
    
    notifyListeners();
  }
  
  void _monitorConnectivity() {
    Connectivity().onConnectivityChanged.listen((result) {
      _connectivity = result as ConnectivityResult;
      notifyListeners();
      
      // Auto-sync when connectivity is restored
      if (_connectivity != ConnectivityResult.none) {
        checkUnsynced().then((_) {
          if (_unsyncedCount > 0) startSync();
        });
      }
    });
  }
  
  Future<bool> login(String username, String password) async {
    try {
      final success = await _api.login(username, password);
      
      if (success) {
        _isAuthenticated = true;
        
        // Fetch and store user profile/role
        // Note: You'll need to add a get_profile endpoint to the backend
        // For now, we'll store username
        await _storage.write(key: 'username', value: username);
        
        notifyListeners();
      }
      
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
    notifyListeners();
  }
  
  Future<void> checkUnsynced() async {
    final localDb = LocalDB();
    final unsyncedFields = await localDb.getUnsyncedFields();
    final unsyncedObs = await localDb.getUnsyncedObservations();
    _unsyncedCount = unsyncedFields.length + unsyncedObs.length;
    notifyListeners();
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
}
