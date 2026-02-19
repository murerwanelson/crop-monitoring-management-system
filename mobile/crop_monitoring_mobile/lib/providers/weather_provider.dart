import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:geolocator/geolocator.dart';

class CropRecommendation {
  final String name;
  final String description;
  final IconData icon;

  CropRecommendation({required this.name, required this.description, required this.icon});
}

class WeatherProvider with ChangeNotifier {
  
  double _temperature = 0;
  double _humidity = 0;
  String _weatherCondition = 'Unknown';
  double _rainfallChance = 0; // Cloud cover or calculated
  double _windSpeed = 0;
  String _locationName = 'Locating...';
  DateTime? _lastWeatherUpdate;
  bool _isWeatherLoading = false;

  double get temperature => _temperature;
  double get humidity => _humidity;
  String get weatherCondition => _weatherCondition;
  double get rainfallChance => _rainfallChance;
  double get windSpeed => _windSpeed;
  String get locationName => _locationName;
  DateTime? get lastWeatherUpdate => _lastWeatherUpdate;
  bool get isWeatherLoading => _isWeatherLoading;

  Future<void> refreshWeather(Position? currentPosition, bool isOnline) async {
    if (!isOnline) {
      debugPrint('Offline mode: Cannot fetch weather.');
      return;
    }

    _isWeatherLoading = true;
    notifyListeners();

    final lat = currentPosition?.latitude ?? -17.824858; // Harare default
    final lon = currentPosition?.longitude ?? 31.053028;

    try {
      await Future.wait([
        _fetchWeatherData(lat, lon),
        _fetchLocationName(lat, lon),
      ]);
      _lastWeatherUpdate = DateTime.now();
    } catch (e) {
      debugPrint('Weather Update Error: $e');
    } finally {
      _isWeatherLoading = false;
      notifyListeners();
    }
  }

  Future<void> _fetchWeatherData(double lat, double lon) async {
    try {
      // Added daily=precipitation_probability_max and timezone=auto to get real rain chance
      final url = 'https://api.open-meteo.com/v1/forecast?latitude=$lat&longitude=$lon&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=precipitation_probability_max&wind_speed_unit=kmh&timezone=auto';
      
      final response = await http.get(Uri.parse(url)).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final current = data['current'];
        final daily = data['daily'];
        
        _temperature = (current['temperature_2m'] as num).toDouble();
        _humidity = (current['relative_humidity_2m'] as num).toDouble();
        _windSpeed = (current['wind_speed_10m'] as num).toDouble();
        
        // Get today's max precipitation probability
        if (daily != null && daily['precipitation_probability_max'] != null && (daily['precipitation_probability_max'] as List).isNotEmpty) {
           _rainfallChance = (daily['precipitation_probability_max'][0] as num).toDouble();
        } else {
           _rainfallChance = 0.0;
        }
        
        final code = current['weather_code'] as int;
        _weatherCondition = _mapWmoCodeToCondition(code);
      } else {
        debugPrint('Open-Meteo Error: ${response.statusCode}');
      }
    } catch (e) {
      debugPrint('Open-Meteo Exception: $e');
      rethrow;
    }
  }

  Future<void> _fetchLocationName(double lat, double lon) async {
    try {
      // Switch to BigDataCloud API (Free, no restrictive headers needed)
      final url = 'https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=$lat&longitude=$lon&localityLanguage=en';
      
      final response = await http.get(Uri.parse(url)).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        // BigDataCloud structure
        _locationName = data['locality'] ?? 
                        data['city'] ?? 
                        data['principalSubdivision'] ?? 
                        'Unknown Location';
      } else {
        debugPrint('Geocoding Error: ${response.statusCode}');
        _locationName = 'Unknown Location';
      }
    } catch (e) {
      debugPrint('Geocoding Exception: $e');
      _locationName = 'Unknown Location';
    }
  }

  String _mapWmoCodeToCondition(int code) {
    if (code == 0) return 'Clear';
    if (code == 1 || code == 2 || code == 3) return 'Partly Cloudy';
    if (code == 45 || code == 48) return 'Foggy';
    if (code >= 51 && code <= 55) return 'Drizzle';
    if (code >= 61 && code <= 67) return 'Rainy';
    if (code >= 71 && code <= 77) return 'Snowy';
    if (code >= 80 && code <= 82) return 'Showers';
    if (code >= 95 && code <= 99) return 'Thunderstorm';
    return 'Unknown';
  }

  List<CropRecommendation> getRecommendedCrops() {
    // Return empty list if data hasn't loaded (avoid 0-based recommendations)
    if (_temperature == 0 && _humidity == 0) return [];

    List<CropRecommendation> recommendations = [];
    
    // 1. Sugarcane: Hot & Humid
    if (_temperature >= 20 && _humidity >= 60) {
      recommendations.add(CropRecommendation(
        name: 'Sugarcane',
        description: 'Excellent humidity and temperature for rapid vegetative growth.',
        icon: Icons.grass_rounded,
      ));
    }

    // 2. Maize (Corn): Moderate Temp, Moderate Humidity
    if (_temperature >= 18 && _temperature <= 33 && _humidity >= 40) {
      recommendations.add(CropRecommendation(
        name: 'Maize',
        description: 'Ideal temperature range for pollination and kernel development.',
        icon: Icons.agriculture_rounded,
      ));
    }

    // 3. Wheat: Cooler temps, lower humidity tolerance
    if (_temperature >= 15 && _temperature <= 25) {
      recommendations.add(CropRecommendation(
        name: 'Wheat',
        description: 'Cooler temperatures detected, suitable for wheat cultivation.',
        icon: Icons.bakery_dining_rounded,
      ));
    }

    // 4. Rice: High Temp, High Water (Rain or Humidity)
    if (_temperature >= 25 && (_rainfallChance > 60 || _humidity > 70)) {
       recommendations.add(CropRecommendation(
        name: 'Rice',
        description: 'High moisture levels and warmth create perfect paddy conditions.',
        icon: Icons.grain_rounded,
      ));
    }

    // 5. Cotton: Warm, Moderate Humidity, Lower Rain (needs dry periods)
    if (_temperature >= 25 && _humidity < 70 && _rainfallChance < 40) {
      recommendations.add(CropRecommendation(
        name: 'Cotton',
        description: 'Warm and relatively dry conditions favor cotton boll development.',
        icon: Icons.checkroom_rounded,
      ));
    }

    // 6. Soybeans: Warm, Moderate Humidity
    if (_temperature >= 20 && _temperature <= 30 && _humidity >= 50) {
      recommendations.add(CropRecommendation(
        name: 'Soybeans',
        description: 'Balanced warmth and humidity support healthy pod formation.',
        icon: Icons.eco_rounded,
      ));
    }

    return recommendations;
  }
}
