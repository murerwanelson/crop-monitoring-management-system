import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:provider/provider.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:image_picker/image_picker.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:latlong2/latlong.dart';

import '../providers/app_state.dart';
import '../services/api_service.dart';
import '../services/local_db.dart';

class ObservationFormScreen extends StatefulWidget {
  final String? fieldId;
  const ObservationFormScreen({super.key, this.fieldId});

  @override
  State<ObservationFormScreen> createState() =>
      _ObservationFormScreenState();
}

class _ObservationFormScreenState extends State<ObservationFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _api = ApiService();
  final _localDb = LocalDB();
  final _picker = ImagePicker();
  final _mapController = MapController();

  /* ================= TEXT CONTROLLERS ================= */

  final _collectorCtrl = TextEditingController();
  final _fieldNameCtrl = TextEditingController();
  final _cropCtrl = TextEditingController();
  final _varietyCtrl = TextEditingController();

  final _heightCtrl = TextEditingController();
  final _stalkCtrl = TextEditingController();
  final _leavesCtrl = TextEditingController();
  final _populationCtrl = TextEditingController();
  final _canopyCtrl = TextEditingController();
  final _areaCtrl = TextEditingController();
  
  final _fertilizerAmountCtrl = TextEditingController();
  final _pestTypeCtrl = TextEditingController();
  final _pestAffectedCtrl = TextEditingController();
  final _weatherCtrl = TextEditingController();
  final _wateringCtrl = TextEditingController();
  final _pesticideCtrl = TextEditingController();
  final _fertilizerTypeCtrl = TextEditingController();
  
  final _pageController = PageController();
  int _currentPage = 0;

  /* ================= STATE ================= */

  DateTime _obsDate = DateTime.now();
  DateTime? _plantingDate;
  DateTime? _fertDate;
  String _growthStage = 'Seedling';

  String _vigor = 'Good';
  String _soilMoisture = 'Moist';
  String _weedPressure = 'Medium';
  
  bool _sprayed = false;
  bool _fertilized = false;
  bool _irrigationApplied = false;
  bool _pestPresent = false;
  
  String _pestSeverity = 'Medium';
  bool _urgentAttention = false;
  
  bool _submitting = false;

  Position? _position;
  final List<File> _images = [];

  /* ================= POLYGON ================= */

  final List<LatLng> _points = [];
  final List<LatLng> _redoStack = [];
  Set<Polygon> _polygons = {};
  bool _showMap = false;

  double _areaHa = 0;
  double _areaAcres = 0;

  /* ================= INIT ================= */

  @override
  void initState() {
    super.initState();
    _loadDraft();
    _getLocation();
    
    // Auto-fill collector from AppState if empty
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_collectorCtrl.text.isEmpty) {
        final user = context.read<AppState>().user;
        if (user != null && user['username'] != null) {
          setState(() {
            _collectorCtrl.text = user['username'];
          });
        }
      }
    });
  }

  /* ================= LOCATION ================= */

  Future<void> _getLocation() async {
    if (!await Permission.location.request().isGranted) {
       _snack('Location permission denied');
       return;
    }
    
    // Show loading indicator if needed or just snack
    _snack('Getting location...');

    try {
      _position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high, timeLimit: const Duration(seconds: 10)
      );
      
      if (mounted) {
        setState(() {});
        if (_position != null) {
           _mapController.move(LatLng(_position!.latitude, _position!.longitude), 16);
           _snack('Location updated');
           
           // Auto-fetch weather
           final weather = await _api.getWeather(_position!.latitude, _position!.longitude);
           if (weather.isNotEmpty && _weatherCtrl.text.isEmpty) {
             setState(() => _weatherCtrl.text = weather);
           }
        }
      }
    } catch (e) {
      debugPrint('Error getting location: $e');
      _snack('Could not get location. Check GPS.');
    }
  }

  /* ================= DRAFT AUTOSAVE ================= */

  Future<void> _saveDraft() async {
    // Skip on web - sqflite/path_provider not supported
    if (kIsWeb) return;

    final draft = {
      'collector': _collectorCtrl.text,
      'crop': _cropCtrl.text,
      'variety': _varietyCtrl.text,
      'growth': _growthStage,
      'planting_date': _plantingDate?.toIso8601String(),
      'vigor': _vigor,
      'soil_moisture': _soilMoisture,
      'weed_pressure': _weedPressure,
      'canopy': _canopyCtrl.text,
      'sprayed': _sprayed,
      'pesticide': _pesticideCtrl.text,
      'fertilized': _fertilized,
      'fertilizer_type': _fertilizerTypeCtrl.text,
      'fertilizer_amount': _fertilizerAmountCtrl.text,
      'fertilizer_date': _fertDate?.toIso8601String(),
      'irrigation': _irrigationApplied,
      'pest_present': _pestPresent,
      'pest_type': _pestTypeCtrl.text,
      'pest_severity': _pestSeverity,
      'pest_affected': _pestAffectedCtrl.text,
      'urgent': _urgentAttention,
      'height': _heightCtrl.text,
      'stalk': _stalkCtrl.text,
      'leaves': _leavesCtrl.text,
      'population': _populationCtrl.text,
      'weather': _weatherCtrl.text,
      'polygon': _points.map((p) => [p.longitude, p.latitude]).toList(),
      'images': _images.map((f) => f.path).toList(),
      'current_page': _currentPage,
    };
    await _localDb.saveDraft('observation_draft', draft);
  }

  Future<void> _saveStickyFields() async {
    if (kIsWeb) return;
    final sticky = {
      'collector': _collectorCtrl.text,
      'crop': _cropCtrl.text,
      'variety': _varietyCtrl.text,
    };
    await _localDb.saveDraft('sticky_observation_fields', sticky);
  }

  Future<void> _loadStickyFields() async {
    if (kIsWeb) return;
    final sticky = await _localDb.getDraft('sticky_observation_fields');
    if (sticky != null) {
      _collectorCtrl.text = sticky['collector'] ?? _collectorCtrl.text;
      _cropCtrl.text = sticky['crop'] ?? '';
      _varietyCtrl.text = sticky['variety'] ?? '';
    }
  }

  Future<void> _loadDraft() async {
    // Skip on web - sqflite/path_provider not supported
    if (kIsWeb) return;
    
    final draft = await _localDb.getDraft('observation_draft');
    if (draft == null) {
      await _loadStickyFields();
      return;
    }

    setState(() {
      _currentPage = draft['current_page'] ?? 0;
      if (_currentPage > 0) {
        // Jump to page after a short delay
        WidgetsBinding.instance.addPostFrameCallback((_) {
           _pageController.jumpToPage(_currentPage);
        });
      }
      _collectorCtrl.text = draft['collector'] ?? '';
      _cropCtrl.text = draft['crop'] ?? '';
      _varietyCtrl.text = draft['variety'] ?? '';
      _growthStage = draft['growth'] ?? 'Seedling';
      if (draft['planting_date'] != null) {
        _plantingDate = DateTime.tryParse(draft['planting_date']);
      }

      _vigor = draft['vigor'] ?? 'Good';
      _soilMoisture = draft['soil_moisture'] ?? 'Moist';
      _weedPressure = draft['weed_pressure'] ?? 'Medium';
      _canopyCtrl.text = draft['canopy'] ?? '';

      _sprayed = draft['sprayed'] ?? false;
      _pesticideCtrl.text = draft['pesticide'] ?? '';
      _fertilized = draft['fertilized'] ?? false;
      _fertilizerTypeCtrl.text = draft['fertilizer_type'] ?? '';
      _fertilizerAmountCtrl.text = draft['fertilizer_amount'] ?? '';
      if (draft['fertilizer_date'] != null) {
        _fertDate = DateTime.tryParse(draft['fertilizer_date']);
      }
      
      _irrigationApplied = draft['irrigation'] ?? false;
      _pestPresent = draft['pest_present'] ?? false;
      _pestTypeCtrl.text = draft['pest_type'] ?? '';
      _pestSeverity = draft['pest_severity'] ?? 'Medium';
      _pestAffectedCtrl.text = draft['pest_affected'] ?? '';
      _urgentAttention = draft['urgent'] ?? false;

      _heightCtrl.text = draft['height'] ?? '';
      _stalkCtrl.text = draft['stalk'] ?? '';
      _leavesCtrl.text = draft['leaves'] ?? '';
      _populationCtrl.text = draft['population'] ?? '';
      _weatherCtrl.text = draft['weather'] ?? '';

      if (draft['polygon'] != null) {
        _points.clear();
        for (var c in draft['polygon']) {
          _points.add(LatLng(c[1], c[0]));
        }
        _updatePolygon();
      }

      if (draft['images'] != null) {
        _images.clear();
        for (var path in draft['images']) {
          final file = File(path);
          if (file.existsSync()) {
            _images.add(file);
          }
        }
      }
    });
  }

  /* ================= POLYGON ================= */

  void _onTap(LatLng p) {
    setState(() {
      _points.add(p);
      _redoStack.clear();
      _updatePolygon();
      _saveDraft();
    });
  }

  void _undo() {
    if (_points.isEmpty) return;
    setState(() {
      _redoStack.add(_points.removeLast());
      _updatePolygon();
      _saveDraft();
    });
  }

  void _redo() {
    if (_redoStack.isEmpty) return;
    setState(() {
      _points.add(_redoStack.removeLast());
      _updatePolygon();
      _saveDraft();
    });
  }

  void _updatePolygon() {
    if (_points.length < 3) return;

    _polygons = {
      Polygon(
        points: _points,
        borderStrokeWidth: 2,
        borderColor: Colors.green,
        color: Colors.green.withOpacity(0.25),
      )
    };
    _calculateArea();
  }

  void _clearPolygon() {
    setState(() {
      _points.clear();
      _redoStack.clear();
      _polygons.clear();
      _areaHa = 0;
      _areaAcres = 0;
      _areaCtrl.clear();
      _saveDraft();
    });
  }


  /* ================= AREA ================= */

  void _calculateArea() {
    if (_points.length < 3) {
      setState(() {
        _areaHa = 0;
        _areaAcres = 0;
        _areaCtrl.clear();
      });
      return;
    }

    const double radius = 6378137.0; // Earth's radius in meters
    double area = 0.0;

    for (int i = 0; i < _points.length; i++) {
        final p1 = _points[i];
        final p2 = _points[(i + 1) % _points.length];

        final lat1 = p1.latitude * pi / 180.0;
        final lon1 = p1.longitude * pi / 180.0;
        final lat2 = p2.latitude * pi / 180.0;
        final lon2 = p2.longitude * pi / 180.0;

        area += (lon2 - lon1) * (2 + sin(lat1) + sin(lat2));
    }

    area = (area.abs() * radius * radius / 2.0);
    
    setState(() {
      _areaHa = area / 10000.0;
      _areaAcres = _areaHa * 2.47105;
      _areaCtrl.text = _areaHa.toStringAsFixed(4);
    });
  }

  /* ================= VALIDATION ================= */

  bool _validatePolygon() {
    if (_points.length < 3) {
      _snack('Polygon must have at least 3 points');
      return false;
    }
    return true;
  }

  /* ================= FULLSCREEN MAP ================= */

  Future<void> _openMapEditor() async {
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => _FullScreenMapEditor(
          points: _points,
          onChanged: (pts) {
            setState(() {
              _points
                ..clear()
                ..addAll(pts);
              _updatePolygon();
            });
          },
        ),
      ),
    );
  }

  /* ================= SUBMIT ================= */

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (!_validatePolygon()) return;

    // Validate Field ID if not provided via navigation
    if (widget.fieldId == null && _fieldNameCtrl.text.trim().isEmpty) {
      _snack('Please provide a Field Name or ID');
      return;
    }

    // Strict validation for Crop Management
    if (_sprayed && _pesticideCtrl.text.trim().isEmpty) {
      _snack('Please enter the Type of Pesticide used');
      return;
    }

    if (_fertilized) {
      if (_fertilizerTypeCtrl.text.trim().isEmpty) {
        _snack('Please enter the Type of Fertilizer applied');
        return;
      }
      if (_fertilizerAmountCtrl.text.trim().isEmpty) {
        _snack('Please enter the Amount of Fertilizer applied');
        return;
      }
      if (_fertDate == null) {
        _snack('Please select the Fertilizer Application Date');
        return;
      }
    }

    setState(() => _submitting = true);

    try {
      final polygon = {
        'type': 'Polygon',
        'coordinates': [
          [
            ..._points.map((p) => [p.longitude, p.latitude]),
            [_points.first.longitude, _points.first.latitude]
          ]
        ]
      };

      // Build crop_management nested object
      final cropManagement = {
        'sprayed': _sprayed,
        'pesticide_used': _sprayed ? _pesticideCtrl.text : "",
        'fertilizer_applied': _fertilized,
        'fertilizer_type': _fertilized ? _fertilizerTypeCtrl.text : "",
        'fertilizer_amount': _fertilized ? _fertilizerAmountCtrl.text : "",
        'fertilizer_date': _fertilized ? _fertDate?.toIso8601String().split('T')[0] : null,
        'irrigation_applied': _irrigationApplied,
        'pest_present': _pestPresent,
        'pest_type': _pestPresent ? _pestTypeCtrl.text : "",
        'pest_severity': _pestPresent ? _pestSeverity : "",
        'pest_percentage_affected': _pestPresent ? double.tryParse(_pestAffectedCtrl.text) : null,
        'weather': _weatherCtrl.text,
        'watering_details': _wateringCtrl.text,
        'urgent_attention': _urgentAttention,
      };

      // Build crop_measurement nested object
      final cropMeasurement = {
        'crop_height_cm': _heightCtrl.text.isNotEmpty ? double.tryParse(_heightCtrl.text) : null,
        'stalk_diameter': _stalkCtrl.text.isNotEmpty ? double.tryParse(_stalkCtrl.text) : null,
        'number_of_leaves': _leavesCtrl.text.isNotEmpty ? int.tryParse(_leavesCtrl.text) : null,
        'plant_population': _populationCtrl.text.isNotEmpty ? int.tryParse(_populationCtrl.text) : null,
        'soil_moisture_level': _soilMoisture, // Categorical
        'vigor': _vigor,
        'canopy_cover_percentage': _canopyCtrl.text.isNotEmpty ? double.tryParse(_canopyCtrl.text) : null,
        'weed_pressure': _weedPressure,
      };

      // Build the main observation payload
      final payload = {
        'data_collector_name': _collectorCtrl.text,
        'observation_date': _obsDate.toIso8601String().split('T')[0],
        'crop_variety': _varietyCtrl.text.isNotEmpty ? _varietyCtrl.text : _cropCtrl.text,
        'planting_date': _plantingDate?.toIso8601String().split('T')[0],
        'growth_stage': _growthStage,
        'observation_area': polygon,
        'area_ha': double.tryParse(_areaCtrl.text),
        'crop_management': cropManagement,
        'crop_measurement': cropMeasurement,
      };

      final appState = context.read<AppState>();

      // Step 1: Handle Field ID
      if (widget.fieldId != null) {
        payload['field'] = int.parse(widget.fieldId!);
      }

      if (appState.isOnline) {
        if (payload['field'] == null) {
          // Auto-create a field from the observation area
          final Map<String, dynamic> fieldPayload = {
            'location': {
              'type': 'Point',
              'coordinates': [_points.first.longitude, _points.first.latitude]
            },
            'boundary': polygon,
          };
          
          // Use user provided name if available, otherwise auto-generate
          if (_fieldNameCtrl.text.isNotEmpty) {
             fieldPayload['field_id'] = _fieldNameCtrl.text;
          }
          
          final fieldResponse = await _api.authenticatedRequest('POST', '/fields/', body: fieldPayload);
          if (fieldResponse.statusCode == 201) {
            final fieldData = jsonDecode(fieldResponse.body);
            payload['field'] = fieldData['id'];
          } else if (fieldResponse.statusCode == 400 && fieldResponse.body.contains("already exists")) {
            // Field ID already exists - try to find and link to it
            try {
              final fields = await _api.getFields();
              final existingField = fields.firstWhere(
                (f) => f['field_id'].toString() == _fieldNameCtrl.text,
                orElse: () => null,
              );
              
              if (existingField != null) {
                payload['field'] = existingField['id'];
                _snack('Linked to existing field: ${_fieldNameCtrl.text}');
              } else {
                throw Exception('Field ID "${_fieldNameCtrl.text}" already exists but could not be retrieved.');
              }
            } catch (e) {
               throw Exception('Failed to find existing field to link: $e');
            }
          } else {
            throw Exception('Failed to create field: ${fieldResponse.body}');
          }
        }

        // Step 2: Create observation
        final obsResponse = await _api.authenticatedRequest('POST', '/observations/', body: payload);
        
        if (obsResponse.statusCode == 201) {
          final obsData = jsonDecode(obsResponse.body);
          final observationId = obsData['id'];

          // Step 3: Upload images if any
          if (_images.isNotEmpty && _position != null) {
            await _api.uploadMedia(
              observationId,
              _images,
              lat: _position!.latitude,
              lon: _position!.longitude,
            );
          }

          if (!kIsWeb) {
            await _localDb.clearDraft('observation_draft');
            await _saveStickyFields();
          }
          
          if (mounted) {
            // Check for urgent attention and show alert
            if (_urgentAttention && _pestSeverity == 'High') {
               showDialog(
                 context: context,
                 builder: (c) => AlertDialog(
                   title: const Text('Urgent Alert Sent'),
                   content: const Text('An urgent notification has been sent to the farm manager due to high pest severity.'),
                   actions: [TextButton(onPressed: () => Navigator.pop(c), child: const Text('OK'))],
                 )
               ).then((_) => Navigator.pop(context));
            } else {
              _snack('Observation saved successfully!');
              Navigator.pop(context);
            }
          }
        } else {
          throw Exception('Failed to create observation: ${obsResponse.body}');
        }
      } else {
        // Offline mode: save to local DB
        if (payload['field'] == null) {
           // We are offline and creating a NEW field. 
           // We need to save the field info too.
           final fieldPayload = {
            'field_id': 'AUTO_${DateTime.now().millisecondsSinceEpoch}',
            'location': {
              'type': 'Point',
              'coordinates': [_points.first.longitude, _points.first.latitude]
            },
            'boundary': polygon,
          };
           // Use user provided name if available
           if (_fieldNameCtrl.text.isNotEmpty) {
             fieldPayload['field_id'] = _fieldNameCtrl.text;
           }
          await _localDb.insertField(fieldPayload);
          
          // For now, we'll mark this observation as needing a field link
          // During sync, we'll try to find/link it.
          payload['temp_field_id'] = fieldPayload['field_id'];
        }

        if (!kIsWeb) {
          // Include image paths and GPS for offline sync
          payload['offline_images'] = _images.map((f) => f.path).toList();
          if (_position != null) {
            payload['offline_lat'] = _position!.latitude;
            payload['offline_lon'] = _position!.longitude;
          }
          
          await _localDb.insertObservation(payload);
          await _localDb.clearDraft('observation_draft');
        }
        
        if (mounted) {
          _snack('Observation saved locally. Will sync when online.');
          Navigator.pop(context);
        }
      }
    } catch (e) {
      _snack('Failed to save observation: $e');
      print('Save error: $e');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  /* ================= UI ================= */

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Observation - Page ${_currentPage + 1}/4'),
        leading: _currentPage > 0 
          ? IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => _pageController.previousPage(duration: const Duration(milliseconds: 300), curve: Curves.easeInOut))
          : null,
      ),
      body: Form(
        key: _formKey,
        child: PageView(
          controller: _pageController,
          physics: const NeverScrollableScrollPhysics(),
          onPageChanged: (i) => setState(() => _currentPage = i),
          children: [
            _page1Identity(),
            _page2PhysicalAudit(),
            _page3Management(),
            _page4Submission(),
          ],
        ),
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 4, offset: const Offset(0, -2))],
        ),
        child: Row(
          children: [
            if (_currentPage > 0)
              Expanded(
                child: OutlinedButton(
                  onPressed: () => _pageController.previousPage(duration: const Duration(milliseconds: 300), curve: Curves.easeInOut),
                  child: const Text('Back'),
                ),
              ),
            if (_currentPage > 0) const SizedBox(width: 16),
            Expanded(
              child: ElevatedButton(
                onPressed: _currentPage == 3 
                  ? (_submitting ? null : _submit)
                  : () {
                    if (_currentPage == 0) {
                      if (_validatePolygon()) {
                        _pageController.nextPage(duration: const Duration(milliseconds: 300), curve: Curves.easeInOut);
                      }
                    } else {
                      _pageController.nextPage(duration: const Duration(milliseconds: 300), curve: Curves.easeInOut);
                    }
                  },
                child: Text(_currentPage == 3 ? 'Submit' : 'Next'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /* ================= PAGE 1 ================= */

  Widget _page1Identity() => ListView(
    padding: const EdgeInsets.all(16),
    children: [
      _mapCard(),
      const SizedBox(height: 8),
      Text(
        _areaHa == 0 ? 'No area defined' : 'Area: ${_areaHa.toStringAsFixed(2)} ha (${_areaAcres.toStringAsFixed(2)} acres)',
        style: const TextStyle(fontWeight: FontWeight.bold),
      ),
      const SizedBox(height: 16),
      _sectionCard(
        title: 'Identity & Timing',
        children: [
          _field('Calculated Area (ha)', _areaCtrl, icon: Icons.straighten, readOnly: true),
          const SizedBox(height: 12),
          _field('Field Name / ID *', _fieldNameCtrl, icon: Icons.map),
          const SizedBox(height: 12),
          _field('Collector', _collectorCtrl, icon: Icons.person, readOnly: true),
          const SizedBox(height: 12),
          Row(
            children: [
               Expanded(child: _field('Crop', _cropCtrl, icon: Icons.agriculture)),
               const SizedBox(width: 8),
               Expanded(child: _field('Variety', _varietyCtrl, icon: Icons.grain)),
            ],
          ),
          const SizedBox(height: 12),
          _dateField('Observation Date', _obsDate, (d) => setState(() => _obsDate = d)),
          const SizedBox(height: 12),
          const Text('Growth Stage', style: TextStyle(fontWeight: FontWeight.bold)),
          _growthRadioGroup(),
          const SizedBox(height: 12),
          _locationButton(),
        ],
      ),
    ],
  );

  /* ================= PAGE 2 ================= */

  Widget _page2PhysicalAudit() => ListView(
    padding: const EdgeInsets.all(16),
    children: [
      _sectionCard(
        title: 'Plant Health',
        children: [
          _field('Crop Height (cm)', _heightCtrl, isNumber: true, icon: Icons.height),
          const SizedBox(height: 12),
          // Logic: Hide Stalk Diameter for Rice (or similar logic)
          if (!_cropCtrl.text.toLowerCase().contains('rice')) ...[
            _field('Stalk Diameter (mm)', _stalkCtrl, isNumber: true, icon: Icons.exposure_zero),
            const SizedBox(height: 12),
          ],
          _field('Green Leaves', _leavesCtrl, isNumber: true, icon: Icons.eco),
          const SizedBox(height: 12),
          _field('Plant Population/ha', _populationCtrl, isNumber: true, icon: Icons.groups),
          const SizedBox(height: 12),
          const Text('Vigor', style: TextStyle(fontWeight: FontWeight.bold)),
          _vigorRadioGroup(),
        ],
      ),
      const SizedBox(height: 16),
      _sectionCard(
        title: 'Environment',
        children: [
          _field('Canopy Cover (%)', _canopyCtrl, isNumber: true, icon: Icons.radar),
          const SizedBox(height: 12),
          const Text('Soil Moisture', style: TextStyle(fontWeight: FontWeight.bold)),
          _soilMoistureRadioGroup(),
          const SizedBox(height: 12),
          const Text('Weed Pressure', style: TextStyle(fontWeight: FontWeight.bold)),
          _weedPressureRadioGroup(),
        ],
      ),
    ],
  );

  /* ================= PAGE 3 ================= */

  Widget _page3Management() => ListView(
    padding: const EdgeInsets.all(16),
    children: [
      _sectionCard(
        title: 'Management',
        children: [
          SwitchListTile(
            title: const Text('Fertilizer Applied?'),
            value: _fertilized,
            onChanged: (v) => setState(() => _fertilized = v),
          ),
          if (_fertilized) ...[
            _field('Type', _fertilizerTypeCtrl, icon: Icons.science),
            const SizedBox(height: 8),
            _field('Amount (kg/ha)', _fertilizerAmountCtrl, isNumber: true, icon: Icons.scale),
            const SizedBox(height: 8),
            _dateField('Date', _fertDate, (d) => setState(() => _fertDate = d)),
          ],
          const Divider(),
          SwitchListTile(
            title: const Text('Irrigation Applied?'),
            value: _irrigationApplied,
            onChanged: (v) => setState(() => _irrigationApplied = v),
          ),
        ],
      ),
      const SizedBox(height: 16),
      _sectionCard(
        title: 'Issues & Health',
        children: [
          SwitchListTile(
            title: const Text('Pest/Disease Present?'),
            value: _pestPresent,
            onChanged: (v) => setState(() => _pestPresent = v),
          ),
          if (_pestPresent) ...[
             _field('Type of Pest/Disease', _pestTypeCtrl, icon: Icons.pest_control),
             const SizedBox(height: 12),
             const Text('Severity', style: TextStyle(fontWeight: FontWeight.bold)),
             _pestSeverityRadioGroup(),
             const SizedBox(height: 12),
             _field('% Plants Affected', _pestAffectedCtrl, isNumber: true, icon: Icons.percent),
          ],
          const Divider(),
          SwitchListTile(
            title: const Text('Sprayed Area?'),
            value: _sprayed,
            onChanged: (v) => setState(() => _sprayed = v),
          ),
          if (_sprayed) _field('Pesticide Used', _pesticideCtrl, icon: Icons.local_pharmacy),
        ],
      ),
    ],
  );

  /* ================= PAGE 4 ================= */

  Widget _page4Submission() => ListView(
    padding: const EdgeInsets.all(16),
    children: [
      _sectionCard(
        title: 'Submission',
        children: [
          const Text('Weather Conditions', style: TextStyle(fontWeight: FontWeight.bold)),
          _weatherDropdown(),
          const SizedBox(height: 16),
          const Text('Photos (Visual Proof)', style: TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          _mediaSection(),
          const SizedBox(height: 24),
          const Divider(),
          const SizedBox(height: 8),
          Center(
            child: Text(
              'Urgent Attention?',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 18,
                color: _urgentAttention ? Colors.red : Colors.grey,
              ),
            ),
          ),
          Slider(
            value: _urgentAttention ? 1.0 : 0.0,
            divisions: 1,
            activeColor: Colors.red,
            inactiveColor: Colors.grey.shade300,
            onChanged: (v) => setState(() => _urgentAttention = v > 0.5),
          ),
          Center(
            child: Text(
              _urgentAttention ? 'YES' : 'NO',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: _urgentAttention ? Colors.red : Colors.black,
              ),
            ),
          ),
        ],
      ),
    ],
  );

  Widget _mapCard() => Card(
        clipBehavior: Clip.antiAlias,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        child: Column(
          children: [
            SizedBox(
              height: 250,
              child: FlutterMap(
                mapController: _mapController,
                options: MapOptions(
                  initialCenter: _position != null
                      ? LatLng(_position!.latitude, _position!.longitude)
                      : const LatLng(-1.286389, 36.817223),
                  initialZoom: 16,
                  onTap: (_, p) => _onTap(p),
                ),
                children: [
                  TileLayer(
                    urlTemplate:
                        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                    userAgentPackageName: 'com.example.app',
                  ),
                  PolygonLayer(polygons: _polygons.toList()),
                  MarkerLayer(
                    markers: [
                      // User Location Marker
                      if (_position != null)
                        Marker(
                          point: LatLng(_position!.latitude, _position!.longitude),
                          child: const Icon(Icons.my_location, color: Colors.blue, size: 24),
                        ),
                      // Polygon Points Markers
                      ..._points.map((p) => Marker(
                            point: p,
                            child: const Icon(Icons.location_on, color: Colors.red, size: 20),
                          )),
                    ],
                  ),
                ],
              ),
            ),
            Container(
              color: Colors.grey.shade200,
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  IconButton(
                    icon: const Icon(Icons.undo),
                    onPressed: _points.isEmpty ? null : _undo,
                    tooltip: 'Undo Last Point',
                  ),
                  IconButton(
                    icon: const Icon(Icons.redo),
                    onPressed: _redoStack.isEmpty ? null : _redo,
                    tooltip: 'Redo',
                  ),
                  IconButton(
                    icon: const Icon(Icons.delete_outline, color: Colors.red),
                    onPressed: _points.isEmpty ? null : _clearPolygon,
                    tooltip: 'Clear',
                  ),
                  IconButton(
                    icon: const Icon(Icons.my_location, color: Colors.blue),
                    onPressed: _getLocation,
                    tooltip: 'My Location',
                  ),
                  IconButton(
                    icon: const Icon(Icons.fullscreen),
                    onPressed: _openMapEditor,
                    tooltip: 'Fullscreen',
                  ),
                ],
              ),
            ),
          ],
        ),
      );

  Widget _sectionCard({required String title, required List<Widget> children}) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.green)),
            const SizedBox(height: 16),
            ...children,
          ],
        ),
      ),
    );
  }

  Widget _field(String l, TextEditingController c, {bool isNumber = false, IconData? icon, bool readOnly = false}) => TextFormField(
        controller: c,
        readOnly: readOnly,
        decoration: InputDecoration(
          labelText: l,
          prefixIcon: icon != null ? Icon(icon) : null,
          border: const OutlineInputBorder(),
          filled: true,
          fillColor: readOnly ? Colors.grey.shade100 : Colors.grey.shade50,
          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
        ),
        keyboardType: isNumber ? TextInputType.number : TextInputType.text,
        validator: (v) {
           if (l.contains('*') && (v == null || v.isEmpty)) return 'Required';
           return null;
        },
      );

  Widget _dateField(String label, DateTime? date, Function(DateTime) onSelect) {
    return InkWell(
      onTap: () async {
        final d = await showDatePicker(
          context: context,
          initialDate: date ?? DateTime.now(),
          firstDate: DateTime(2000),
          lastDate: DateTime.now(),
        );
        if (d != null) onSelect(d);
      },
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          prefixIcon: const Icon(Icons.calendar_today),
          border: const OutlineInputBorder(),
          filled: true,
          fillColor: Colors.grey.shade50,
          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
        ),
        child: Text(date == null ? 'Select Date' : date.toIso8601String().split('T')[0]),
      ),
    );
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final picked = await _picker.pickImage(source: source);
      if (picked != null) {
        setState(() {
          _images.add(File(picked.path));
        });
      }
    } catch (e) {
      _snack('Error picking image: $e');
    }
  }

  void _removeImage(int index) {
    setState(() {
      _images.removeAt(index);
    });
  }

  Widget _growthRadioGroup() => Wrap(
    spacing: 8,
    children: ['Seedling', 'Vegetative', 'Flowering', 'Fruiting', 'Mature'].map((stage) {
      return ChoiceChip(
        label: Text(stage),
        selected: _growthStage == stage,
        onSelected: (val) {
          if (val) setState(() => _growthStage = stage);
        },
      );
    }).toList(),
  );

  Widget _vigorRadioGroup() => Wrap(
    spacing: 8,
    children: ['Poor', 'Fair', 'Good', 'Excellent'].map((v) {
      return ChoiceChip(
        label: Text(v),
        selected: _vigor == v,
        selectedColor: Colors.green.shade100,
        onSelected: (val) {
          if (val) setState(() => _vigor = v);
        },
      );
    }).toList(),
  );

  Widget _soilMoistureRadioGroup() => Wrap(
    spacing: 8,
    children: ['Dry', 'Moist', 'Wet'].map((m) {
      return ChoiceChip(
        label: Text(m),
        selected: _soilMoisture == m,
        onSelected: (val) {
          if (val) setState(() => _soilMoisture = m);
        },
      );
    }).toList(),
  );

  Widget _weedPressureRadioGroup() => Wrap(
    spacing: 8,
    children: ['Low', 'Medium', 'High'].map((w) {
      return ChoiceChip(
        label: Text(w),
        selected: _weedPressure == w,
        onSelected: (val) {
          if (val) setState(() => _weedPressure = w);
        },
      );
    }).toList(),
  );

  Widget _pestSeverityRadioGroup() => Wrap(
    spacing: 8,
    children: ['Low', 'Medium', 'High'].map((s) {
      return ChoiceChip(
        label: Text(s),
        selected: _pestSeverity == s,
        selectedColor: s == 'High' ? Colors.red.shade100 : (s == 'Medium' ? Colors.orange.shade100 : Colors.blue.shade100),
        onSelected: (val) {
          if (val) setState(() => _pestSeverity = s);
        },
      );
    }).toList(),
  );

  Widget _locationButton() => OutlinedButton.icon(
    onPressed: _getLocation,
    icon: const Icon(Icons.my_location),
    label: Text(_position == null ? 'Get Current Location' : 'Location: ${_position!.latitude.toStringAsFixed(4)}, ${_position!.longitude.toStringAsFixed(4)}'),
  );

  Widget _mediaSection() => Column(
    children: [
       Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          OutlinedButton.icon(
            onPressed: _images.length >= 2 ? null : () => _pickImage(ImageSource.camera),
            icon: const Icon(Icons.camera_alt),
            label: const Text('Take Photo'),
          ),
          OutlinedButton.icon(
            onPressed: _images.length >= 2 ? null : () => _pickImage(ImageSource.gallery),
            icon: const Icon(Icons.photo_library),
            label: const Text('From Gallery'),
          ),
        ],
      ),
      if (_images.length >= 2) const Padding(
        padding: EdgeInsets.only(top: 8),
        child: Text('Maximum 2 photos allowed', style: TextStyle(color: Colors.orange, fontSize: 12)),
      ),
      if (_images.isNotEmpty) ...[
          const SizedBox(height: 16),
        SizedBox(
          height: 120,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: _images.length,
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (context, index) {
              return Stack(
                clipBehavior: Clip.none,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.file(_images[index], width: 120, height: 120, fit: BoxFit.cover),
                  ),
                  Positioned(
                    right: -8,
                    top: -8,
                    child: CircleAvatar(
                      radius: 14,
                      backgroundColor: Colors.white,
                      child: IconButton(
                        padding: EdgeInsets.zero,
                        iconSize: 18,
                        icon: const Icon(Icons.close, color: Colors.red),
                        onPressed: () => _removeImage(index),
                      ),
                    ),
                  ),
                ],
              );
            },
          ),
        ),
      ],
    ],
  );

  Widget _weatherDropdown() => DropdownButtonFormField<String>(
    value: _weatherCtrl.text.isEmpty ? null : (['Sunny', 'Partly Cloudy', 'Cloudy', 'Rainy', 'Overcast'].contains(_weatherCtrl.text) ? _weatherCtrl.text : null),
    hint: const Text('Select Weather'),
    items: ['Sunny', 'Partly Cloudy', 'Cloudy', 'Rainy', 'Overcast'].map((w) {
      return DropdownMenuItem(value: w, child: Text(w));
    }).toList(),
    onChanged: (v) => setState(() => _weatherCtrl.text = v!),
    decoration: const InputDecoration(
      prefixIcon: Icon(Icons.wb_sunny),
      border: OutlineInputBorder(),
      filled: true,
      fillColor: Color(0xFFFAFAFA),
    ),
  );

  void _snack(String m) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m)));
}

/* ================= FULLSCREEN MAP ================= */

class _FullScreenMapEditor extends StatelessWidget {
  final List<LatLng> points;
  final Function(List<LatLng>) onChanged;

  const _FullScreenMapEditor({
    required this.points,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final localPoints = List<LatLng>.from(points);

    return Scaffold(
      appBar: AppBar(title: const Text('Edit Observation Area')),
      body: FlutterMap(
        options: MapOptions(
          initialCenter: localPoints.isNotEmpty
              ? localPoints.first
              : const LatLng(-1.286389, 36.817223),
          initialZoom: 16,
          onTap: (_, p) {
            localPoints.add(p);
            onChanged(localPoints);
          },
        ),
        children: [
          TileLayer(
            urlTemplate:
                'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            userAgentPackageName: 'com.example.app',
          ),
          PolygonLayer(
            polygons: [
              if (localPoints.length > 2)
                Polygon(
                  points: localPoints,
                  borderColor: Colors.green,
                  color: Colors.green.withOpacity(0.3),
                )
            ],
          ),
        ],
      ),
    );
  }
}
