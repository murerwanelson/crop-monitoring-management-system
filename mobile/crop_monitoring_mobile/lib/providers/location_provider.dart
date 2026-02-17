import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'dart:async';

class LocationProvider with ChangeNotifier {
  Position? _currentPosition;
  double? _gpsAccuracy;
  StreamSubscription<Position>? _gpsSubscription;
  bool _isMapCached = false;

  Position? get currentPosition => _currentPosition;
  double? get gpsAccuracy => _gpsAccuracy;
  bool get isMapCached => _isMapCached;

  void startGpsTracking({LocationAccuracy accuracy = LocationAccuracy.high}) {
    if (_gpsSubscription != null) return;

    _gpsSubscription = Geolocator.getPositionStream(
      locationSettings: LocationSettings(
        accuracy: accuracy,
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

  void setMapCached(bool cached) {
    _isMapCached = cached;
    notifyListeners();
  }
}
