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
  static const String _weatherApiKey = 'YOUR_OPENWEATHERMAP_API_KEY';
  
  double _temperature = 28.5;
  double _humidity = 72.0;
  String _weatherCondition = 'Partly Cloudy';
  double _rainfallChance = 15.0;
  double _windSpeed = 5.0;
  String _locationName = 'Searching...';
  DateTime _lastWeatherUpdate = DateTime.now();
  bool _isWeatherLoading = false;

  double get temperature => _temperature;
  double get humidity => _humidity;
  String get weatherCondition => _weatherCondition;
  double get rainfallChance => _rainfallChance;
  double get windSpeed => _windSpeed;
  String get locationName => _locationName;
  DateTime get lastWeatherUpdate => _lastWeatherUpdate;
  bool get isWeatherLoading => _isWeatherLoading;

  Future<void> refreshWeather(Position? currentPosition, bool isOnline) async {
    if (!isOnline) return;
    
    // Check if API key is still the placeholder
    if (_weatherApiKey == 'YOUR_OPENWEATHERMAP_API_KEY') {
      debugPrint('Weather API Key not configured. Using simulation.');
      _simulateWeather();
      return;
    }

    // Don't show loading if we already have data
    if (_temperature == 0 || _locationName == 'Searching...') {
      _isWeatherLoading = true;
      notifyListeners();
    }

    final lat = currentPosition?.latitude ?? -25.9692;
    final lon = currentPosition?.longitude ?? 32.5732;

    try {
      final url = 'https://api.openweathermap.org/data/2.5/weather?lat=$lat&lon=$lon&appid=$_weatherApiKey&units=metric';
      
      final response = await http.get(Uri.parse(url)).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        _temperature = (data['main']['temp'] as num).toDouble();
        _humidity = (data['main']['humidity'] as num).toDouble();
        _weatherCondition = data['weather'][0]['main'];
        _windSpeed = (data['wind']['speed'] as num).toDouble() * 3.6;
        _locationName = data['name'];
        if (data.containsKey('rain')) {
          _rainfallChance = 80.0;
        } else {
          _rainfallChance = (data['clouds']['all'] as num).toDouble() * 0.5;
        }
        _lastWeatherUpdate = DateTime.now();
      } else {
        debugPrint('Weather API Error: Status ${response.statusCode}');
        // Fallback to simulation if we have no valid location name yet
        if (_locationName == 'Searching...') _simulateWeather();
      }
    } catch (e) {
      debugPrint('Weather API Exception: $e');
      // Fallback to simulation if we have no valid location name yet
      if (_locationName == 'Searching...') _simulateWeather();
    } finally {
      _isWeatherLoading = false;
      notifyListeners();
    }
  }

  void _simulateWeather() {
    _temperature = 22.0;
    _humidity = 63.0;
    _rainfallChance = 0.0;
    _windSpeed = 5.0;
    _locationName = 'Harare Central';
    _weatherCondition = 'Sunny';
    _lastWeatherUpdate = DateTime.now();
    notifyListeners();
  }

  List<CropRecommendation> getRecommendedCrops() {
    List<CropRecommendation> recommendations = [];
    if (_temperature >= 20 && _humidity >= 60) {
      recommendations.add(CropRecommendation(
        name: 'Sugarcane',
        description: 'Excellent humidity and temperature for rapid vegetative growth.',
        icon: Icons.grass_rounded,
      ));
    }
    if (_temperature >= 18 && _temperature <= 30 && _humidity >= 40) {
      recommendations.add(CropRecommendation(
        name: 'Maize',
        description: 'Ideal temperature range for pollination and kernel development.',
        icon: Icons.agriculture_rounded,
      ));
    }
    return recommendations;
  }
}
