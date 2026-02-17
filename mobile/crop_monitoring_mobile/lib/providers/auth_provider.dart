import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../services/supabase_service.dart';

class AuthProvider with ChangeNotifier {
  final SupabaseService _supabase = SupabaseService();
  bool _isAuthenticated = false;
  Map<String, dynamic>? _user;
  String? _userRole;

  bool get isAuthenticated => _isAuthenticated;
  Map<String, dynamic>? get user => _user;
  String? get userRole => _userRole;

  AuthProvider() {
    _initSupabaseAuth();
  }

  void _initSupabaseAuth() {
    _supabase.client.auth.onAuthStateChange.listen((data) async {
      final Session? session = data.session;
      _isAuthenticated = session != null;
      if (_isAuthenticated) {
        _user = {'username': session!.user.email?.split('@').first ?? 'User'};
        try {
          final profileData = await _supabase.client
              .from('profiles')
              .select('role')
              .eq('id', session.user.id)
              .maybeSingle();
          if (profileData != null) {
            _userRole = profileData['role'];
          } else {
            _userRole = session.user.appMetadata['role'] ?? session.user.userMetadata?['role'] ?? 'collector';
          }
        } catch (e) {
          debugPrint('Error fetching profile role: $e');
          _userRole = 'collector';
        }
      } else {
        _user = null;
        _userRole = null;
      }
      notifyListeners();
    });
  }

  Future<bool> login(String email, String password) async {
    try {
      final response = await _supabase.signIn(email, password);
      return response.session != null;
    } catch (e) {
      debugPrint('Supabase Login Error: $e');
      return false;
    }
  }

  Future<bool> register(Map<String, dynamic> userData) async {
    try {
      final response = await _supabase.signUp(
        userData['email'],
        userData['password'],
        data: {
          'first_name': userData['first_name'],
          'last_name': userData['last_name'],
        },
      );
      return response.user != null;
    } catch (e) {
      debugPrint('Supabase Register Error: $e');
      return false;
    }
  }

  Future<void> logout() async {
    await _supabase.signOut();
  }
}
