import 'package:flutter/material.dart';

class UIProvider with ChangeNotifier {
  bool _isFieldMode = false;

  bool get isFieldMode => _isFieldMode;

  void toggleFieldMode() {
    _isFieldMode = !_isFieldMode;
    notifyListeners();
  }
}
