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

  final _heightCtrl = TextEditingController();
  final _stalkCtrl = TextEditingController();
  final _leavesCtrl = TextEditingController();
  final _populationCtrl = TextEditingController();
  final _soilCtrl = TextEditingController();
  final _weatherCtrl = TextEditingController();
  final _wateringCtrl = TextEditingController();
  final _pesticideCtrl = TextEditingController();
  final _fertilizerCtrl = TextEditingController();

  /* ================= STATE ================= */

  DateTime _obsDate = DateTime.now();
  DateTime? _plantingDate;
  DateTime? _fertDate;
  String _growthStage = 'Seedling';

  bool _sprayed = false;
  bool _fertilized = false;
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
      'growth': _growthStage,
      'planting_date': _plantingDate?.toIso8601String(),
      'sprayed': _sprayed,
      'pesticide': _pesticideCtrl.text,
      'fertilized': _fertilized,
      'fertilizer': _fertilizerCtrl.text,
      'fertilizer_date': _fertDate?.toIso8601String(),
      'height': _heightCtrl.text,
      'stalk': _stalkCtrl.text,
      'leaves': _leavesCtrl.text,
      'population': _populationCtrl.text,
      'moisture': _soilCtrl.text,
      'polygon': _points.map((p) => [p.longitude, p.latitude]).toList(),
      'images': _images.map((f) => f.path).toList(), // local paths only valid on same device
    };
    await _localDb.saveDraft('observation_draft', draft);
  }

  Future<void> _loadDraft() async {
    // Skip on web - sqflite/path_provider not supported
    if (kIsWeb) return;
    
    final draft = await _localDb.getDraft('observation_draft');
    if (draft == null) return;

    setState(() {
      _collectorCtrl.text = draft['collector'] ?? '';
      _cropCtrl.text = draft['crop'] ?? '';
      _growthStage = draft['growth'] ?? 'Seedling';
      if (draft['planting_date'] != null) {
        _plantingDate = DateTime.tryParse(draft['planting_date']);
      }

      _sprayed = draft['sprayed'] ?? false;
      _pesticideCtrl.text = draft['pesticide'] ?? '';
      _fertilized = draft['fertilized'] ?? false;
      _fertilizerCtrl.text = draft['fertilizer'] ?? '';
      if (draft['fertilizer_date'] != null) {
        _fertDate = DateTime.tryParse(draft['fertilizer_date']);
      }

      _heightCtrl.text = draft['height'] ?? '';
      _stalkCtrl.text = draft['stalk'] ?? '';
      _leavesCtrl.text = draft['leaves'] ?? '';
      _populationCtrl.text = draft['population'] ?? '';
      _soilCtrl.text = draft['moisture'] ?? '';

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
      _saveDraft();
    });
  }


  /* ================= AREA ================= */

  void _calculateArea() {
    double area = 0;
    for (int i = 0; i < _points.length; i++) {
      final p1 = _points[i];
      final p2 = _points[(i + 1) % _points.length];
      area += (p2.longitude - p1.longitude) *
          (p2.latitude + p1.latitude);
    }
    area = area.abs() * 111139 * 111139 / 2;
    _areaHa = area / 10000;
    _areaAcres = _areaHa * 2.47105;
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
      if (_fertilizerCtrl.text.trim().isEmpty) {
        _snack('Please enter the Type of Fertilizer applied');
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
        'fertilizer_type': _fertilized ? _fertilizerCtrl.text : "",
        'fertilizer_date': _fertilized ? _fertDate?.toIso8601String().split('T')[0] : null,
        'weather': _weatherCtrl.text,
        'watering': _wateringCtrl.text,
      };

      // Build crop_measurement nested object
      final cropMeasurement = {
        'crop_height_cm': _heightCtrl.text.isNotEmpty ? double.tryParse(_heightCtrl.text) : null,
        'stalk_diameter': _stalkCtrl.text.isNotEmpty ? double.tryParse(_stalkCtrl.text) : null,
        'number_of_leaves': _leavesCtrl.text.isNotEmpty ? int.tryParse(_leavesCtrl.text) : null,
        'plant_population': _populationCtrl.text.isNotEmpty ? int.tryParse(_populationCtrl.text) : null,
        'soil_moisture': _soilCtrl.text.isNotEmpty ? double.tryParse(_soilCtrl.text) : null,
      };

      // Build the main observation payload
      final payload = {
        'data_collector_name': _collectorCtrl.text,
        'observation_date': _obsDate.toIso8601String().split('T')[0], // Required field
        'crop_variety': _cropCtrl.text,
        'planting_date': _plantingDate?.toIso8601String().split('T')[0],
        'growth_stage': _growthStage,
        'observation_area': polygon,
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
          }
          
          if (mounted) {
            _snack('Observation saved successfully!');
            Navigator.pop(context);
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
        title: const Text('New Observation'),
        actions: [],
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _mapCard(),
            const SizedBox(height: 8),
            Text(
              _areaHa == 0
                  ? 'No area defined'
                  : 'Area: ${_areaHa.toStringAsFixed(2)} ha '
                    '(${_areaAcres.toStringAsFixed(2)} acres)',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            
            const SizedBox(height: 16),
            _sectionCard(
              title: 'Field Details',
              children: [
                if (widget.fieldId == null) ...[
                   _field('Field Name / ID *', _fieldNameCtrl, icon: Icons.map),
                   const SizedBox(height: 12),
                ],
                _field('Collector *', _collectorCtrl, icon: Icons.person),
                const SizedBox(height: 12),
                _dateField('Date of Data Collection', _obsDate, (d) => setState(() => _obsDate = d)),
                const SizedBox(height: 12),
                _dateField('Planting Date', _plantingDate, (d) => setState(() => _plantingDate = d)),
                const SizedBox(height: 12),
                _growthDropdown(),
              ],
            ),

            const SizedBox(height: 16),
            _sectionCard(
              title: 'Crop Management',
              children: [
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Sprayed Area?'),
                  value: _sprayed,
                  onChanged: (v) => setState(() => _sprayed = v),
                ),
                if (_sprayed) ...[
                  const SizedBox(height: 8),
                  _field('Type of Pesticide', _pesticideCtrl, icon: Icons.pest_control),
                ],
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Fertilizer Applied?'),
                  value: _fertilized,
                  onChanged: (v) => setState(() => _fertilized = v),
                ),
                if (_fertilized) ...[
                  const SizedBox(height: 8),
                  _field('Type of Fertilizer Applied *', _fertilizerCtrl, icon: Icons.science),
                  const SizedBox(height: 12),
                  _dateField('Application Date *', _fertDate, (d) => setState(() => _fertDate = d)),
                ],
                const SizedBox(height: 12),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(child: _field('Weather Conditions', _weatherCtrl, icon: Icons.cloud)),
                    if (_position != null)
                      IconButton(
                        icon: const Icon(Icons.refresh),
                        onPressed: () async {
                           _snack('Updating weather for ${_position!.latitude.toStringAsFixed(2)}, ${_position!.longitude.toStringAsFixed(2)}...');
                           try {
                             final w = await _api.getWeather(_position!.latitude, _position!.longitude);
                             if (w.isNotEmpty) {
                               setState(() => _weatherCtrl.text = w);
                               _snack('Weather updated: $w');
                             } else {
                               _snack('Could not fetch weather. Check internet connection.');
                             }
                           } catch (e) {
                             _snack('Error updating weather: $e');
                           }
                        },
                      ),
                  ],
                ),
                const SizedBox(height: 12),
                _field('Watering Details', _wateringCtrl, icon: Icons.water),
              ],
            ),

            const SizedBox(height: 16),
            _sectionCard(
              title: 'Crop Measurements',
              children: [
                _field('Crop Height (cm)', _heightCtrl, isNumber: true, icon: Icons.height),
                const SizedBox(height: 12),
                _field('Stalk Diameter (mm)', _stalkCtrl, isNumber: true, icon: Icons.exposure_zero),
                const SizedBox(height: 12),
                _field('Number of Green Leaves', _leavesCtrl, isNumber: true, icon: Icons.eco),
                const SizedBox(height: 12),
                _field('Plant Population', _populationCtrl, isNumber: true, icon: Icons.groups),
                const SizedBox(height: 12),
                _field('Soil Moisture Level', _soilCtrl, isNumber: true, icon: Icons.water_drop),
              ],
            ),

            const SizedBox(height: 16),
            _sectionCard(
              title: 'Media',
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    OutlinedButton.icon(
                      onPressed: () => _pickImage(ImageSource.camera),
                      icon: const Icon(Icons.camera_alt),
                      label: const Text('Camera'),
                    ),
                    OutlinedButton.icon(
                      onPressed: () => _pickImage(ImageSource.gallery),
                      icon: const Icon(Icons.photo_library),
                      label: const Text('Gallery'),
                    ),
                  ],
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
            ),

            const SizedBox(height: 24),
            SizedBox(
              height: 50,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                onPressed: _submitting ? null : _submit,
                child: const Text('Submit Observation', style: TextStyle(fontSize: 16)),
              ),
            ),
          ],
        ),
      ),
    );
  }

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

  Widget _field(String l, TextEditingController c, {bool isNumber = false, IconData? icon}) => TextFormField(
        controller: c,
        decoration: InputDecoration(
          labelText: l,
          prefixIcon: icon != null ? Icon(icon) : null,
          border: const OutlineInputBorder(),
          filled: true,
          fillColor: Colors.grey.shade50,
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

  Widget _growthDropdown() => DropdownButtonFormField<String>(
        value: _growthStage,
        items: const [
          DropdownMenuItem(value: 'Seedling', child: Text('Seedling')),
          DropdownMenuItem(value: 'Vegetative', child: Text('Vegetative')),
          DropdownMenuItem(value: 'Flowering', child: Text('Flowering')),
          DropdownMenuItem(value: 'Maturity', child: Text('Maturity')),
        ],
        onChanged: (v) => setState(() => _growthStage = v!),
        decoration: const InputDecoration(
          labelText: 'Growth Stage',
          prefixIcon: Icon(Icons.trending_up),
          border: OutlineInputBorder(),
          filled: true,
          // fillColor: Colors.grey.shade50, -- cannot use const here if not const
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
