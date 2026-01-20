import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:io';

class ApiService {
  final String serverUrl = 'http://10.72.49.103:8000'; // Django server root
  final String apiUrl = 'http://10.72.49.103:8000/api'; // Django API root
  final storage = FlutterSecureStorage();

  // Register a new user
  Future<bool> register(Map<String, dynamic> userData) async {
    final response = await http.post(
      Uri.parse('$apiUrl/register/'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(userData),
    );

    return response.statusCode == 201;
  }

  // Login and store JWT tokens
  Future<bool> login(String username, String password) async {
    final response = await http.post(
      Uri.parse('$serverUrl/api/token/'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'username': username, 'password': password}),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      await storage.write(key: 'accessToken', value: data['access']);
      await storage.write(key: 'refreshToken', value: data['refresh']);
      
      // Fetch user profile and store role
      try {
        final profile = await getUserProfile();
        await storage.write(key: 'role', value: profile['role']);
        await storage.write(key: 'username', value: profile['username']);
      } catch (e) {
        print('Failed to fetch user profile during login: $e');
      }
      
      return true;
    }
    return false;
  }

  // GET current user profile
  Future<Map<String, dynamic>> getUserProfile() async {
    final response = await authenticatedRequest('GET', '/users/me/');

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to load user profile');
    }
  }

  // Get headers with Bearer token
  Future<Map<String, String>> getHeaders() async {
    String? token = await storage.read(key: 'accessToken');
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  // Refresh the access token using the refresh token
  Future<bool> refreshToken() async {
    print('Attempting to refresh token...');
    String? refresh = await storage.read(key: 'refreshToken');
    if (refresh == null) {
      print('No refresh token found in storage.');
      return false;
    }

    try {
      final response = await http.post(
        Uri.parse('$serverUrl/api/token/refresh/'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'refresh': refresh}),
      );

      print('Refresh token response status: ${response.statusCode}');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        await storage.write(key: 'accessToken', value: data['access']);
        print('Token refreshed successfully.');
        return true;
      } else {
        print('Failed to refresh token: ${response.body}');
      }
    } catch (e) {
      print('Token refresh error: $e');
    }
    return false;
  }

  // Generic authenticated request wrapper with auto-refresh logic
  Future<http.Response> authenticatedRequest(
      String method, String path, {Map<String, dynamic>? body, bool isServerPath = false}) async {
    final String url = isServerPath ? '$serverUrl$path' : '$apiUrl$path';
    
    // First attempt
    var headers = await getHeaders();
    http.Response response;
    
    if (method == 'GET') {
      response = await http.get(Uri.parse(url), headers: headers);
    } else if (method == 'POST') {
      response = await http.post(Uri.parse(url), headers: headers, body: body != null ? jsonEncode(body) : null);
    } else {
      throw Exception('Unsupported HTTP method');
    }

    // If unauthorized, try to refresh token and retry ONCE
    if (response.statusCode == 401) {
      print('401 Unauthorized at $url. Attempting refresh...');
      bool refreshed = await refreshToken();
      if (refreshed) {
        print('Retrying request with new token...');
        headers = await getHeaders(); // Get new headers with new token
        if (method == 'GET') {
          response = await http.get(Uri.parse(url), headers: headers);
        } else if (method == 'POST') {
          response = await http.post(Uri.parse(url), headers: headers, body: body != null ? jsonEncode(body) : null);
        }
      } else {
        print('Token refresh failed. User might need to re-login.');
        // Refresh failed, user needs to login again
        // Here you could trigger a logout event if you had a stream or notifier
      }
    }

    return response;
  }

  // GET list of fields
  Future<List<dynamic>> getFields() async {
    final response = await authenticatedRequest('GET', '/fields/');

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to load fields');
    }
  }

  // POST new field
  Future<void> createField(Map<String, dynamic> data) async {
    final response = await authenticatedRequest('POST', '/fields/', body: data);

    if (response.statusCode != 201) {
      throw Exception('Failed to create field: ${response.body}');
    }
  }

  // POST new observation
  Future<int> createObservation(Map<String, dynamic> data) async {
    final response = await authenticatedRequest('POST', '/observations/', body: data);

    if (response.statusCode == 201) {
      final responseData = jsonDecode(response.body);
      return responseData['id'];
    } else {
      throw Exception('Failed to create observation: ${response.body}');
    }
  }

  // GET list of observations
  Future<List<dynamic>> getObservations() async {
    final response = await authenticatedRequest('GET', '/observations/', isServerPath: false);

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to load observations');
    }
  }

  // GET single observation detail
  Future<Map<String, dynamic>> getObservationDetail(int id) async {
    final response = await authenticatedRequest('GET', '/observations/$id/');

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to load observation details');
    }
  }

  // POST upload media for an observation (Requirement 4.2 D)
  Future<void> uploadMedia(int observationId, List<File> images, {double? lat, double? lon}) async {
    if (images.isEmpty) return;

    final String url = '$apiUrl/observations/$observationId/upload_media/';
    String? token = await storage.read(key: 'accessToken');

    var request = http.MultipartRequest('POST', Uri.parse(url));
    request.headers['Authorization'] = 'Bearer $token';

    if (lat != null && lon != null) {
      request.fields['latitude'] = lat.toString();
      request.fields['longitude'] = lon.toString();
    }

    for (var image in images) {
      request.files.add(await http.MultipartFile.fromPath(
        'images', // Field name expected by backend
        image.path,
      ));
    }

    final response = await request.send();

    if (response.statusCode != 201) {
      throw Exception('Failed to upload media');
    }
  }
  
  // Get weather from Open-Meteo
  Future<String> getWeather(double lat, double lon) async {
    try {
      final url = 'https://api.open-meteo.com/v1/forecast?latitude=$lat&longitude=$lon&current_weather=true';
      final response = await http.get(Uri.parse(url));
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final code = data['current_weather']['weathercode'];
        return _mapWeatherCode(code);
      }
    } catch (e) {
      print('Weather fetch error: $e');
    }
    return '';
  }

  String _mapWeatherCode(int code) {
    if (code == 0) return 'Clear sky';
    if (code == 1 || code == 2 || code == 3) return 'Partly cloudy';
    if (code == 45 || code == 48) return 'Fog';
    if (code >= 51 && code <= 55) return 'Drizzle';
    if (code >= 56 && code <= 57) return 'Freezing Drizzle';
    if (code >= 61 && code <= 65) return 'Rain';
    if (code >= 66 && code <= 67) return 'Freezing Rain';
    if (code >= 71 && code <= 77) return 'Snow fall';
    if (code >= 80 && code <= 82) return 'Rain showers';
    if (code >= 85 && code <= 86) return 'Snow showers';
    if (code >= 95) return 'Thunderstorm';
    return 'Unknown';
  }
}
