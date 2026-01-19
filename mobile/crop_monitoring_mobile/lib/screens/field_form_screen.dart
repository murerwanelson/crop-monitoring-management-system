import 'dart:convert';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import 'package:file_picker/file_picker.dart';
import 'package:geoxml/geoxml.dart' as gxml;
import 'package:provider/provider.dart';

import '../services/api_service.dart';
import '../services/local_db.dart';
import '../providers/app_state.dart';

class FieldFormScreen extends StatefulWidget {
  const FieldFormScreen({super.key});

  @override
  State<FieldFormScreen> createState() => _FieldFormScreenState();
}

class _FieldFormScreenState extends State<FieldFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _fieldIdController = TextEditingController();
  final MapController _mapController = MapController();

  LatLng _initialPosition = const LatLng(-1.286389, 36.817223);
  bool _isSubmitting = false;

  final List<LatLng> _polygonPoints = [];
  final List<LatLng> _redoStack = [];
  Set<Polygon> _polygons = {};

  final ApiService _api = ApiService();
  final LocalDB _localDb = LocalDB();

  @override
  void initState() {
    super.initState();
    _centerOnCurrentLocation();
  }

  /* ================= LOCATION ================= */

  Future<void> _centerOnCurrentLocation() async {
    try {
      final pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      _initialPosition = LatLng(pos.latitude, pos.longitude);
      _mapController.move(_initialPosition, 16);
      setState(() {});
    } catch (_) {
      _showSnackBar('Unable to access current location.');
    }
  }

  /* ================= POLYGON EDITING ================= */

  void _onMapTap(LatLng point) {
    setState(() {
      _polygonPoints.add(point);
      _redoStack.clear();
      _updatePolygon();
    });
  }

  void _undo() {
    if (_polygonPoints.isEmpty) return;
    setState(() {
      _redoStack.add(_polygonPoints.removeLast());
      _updatePolygon();
    });
  }

  void _redo() {
    if (_redoStack.isEmpty) return;
    setState(() {
      _polygonPoints.add(_redoStack.removeLast());
      _updatePolygon();
    });
  }

  void _clearPolygon() {
    setState(() {
      _polygonPoints.clear();
      _redoStack.clear();
      _polygons.clear();
    });
  }

  void _updatePolygon() {
    if (_polygonPoints.length < 2) {
      _polygons.clear();
      return;
    }

    _polygons = {
      Polygon(
        points: _polygonPoints,
        borderStrokeWidth: 2,
        borderColor: Theme.of(context).colorScheme.primary,
        color: Theme.of(context).colorScheme.primary.withOpacity(0.25),
      )
    };
  }

  /* ================= AREA CALCULATION ================= */

  double _calculateAreaSqMeters() {
    if (_polygonPoints.length < 3) return 0;
    const distance = Distance();
    double area = 0;

    for (int i = 0; i < _polygonPoints.length; i++) {
      final p1 = _polygonPoints[i];
      final p2 = _polygonPoints[(i + 1) % _polygonPoints.length];
      area += distance(p1, LatLng(p2.latitude, p1.longitude)) *
          distance(LatLng(p1.latitude, p2.longitude), p2) *
          (p2.longitude - p1.longitude).sign;
    }
    return area.abs();
  }

  double get _areaHectares => _calculateAreaSqMeters() / 10000;
  double get _areaAcres => _calculateAreaSqMeters() * 0.000247105;

  /* ================= GEOMETRY VALIDATION ================= */

  bool _hasSelfIntersection() {
    for (int i = 0; i < _polygonPoints.length - 1; i++) {
      for (int j = i + 2; j < _polygonPoints.length - 1; j++) {
        if (_segmentsIntersect(
          _polygonPoints[i],
          _polygonPoints[i + 1],
          _polygonPoints[j],
          _polygonPoints[j + 1],
        )) {
          return true;
        }
      }
    }
    return false;
  }

  bool _segmentsIntersect(LatLng p1, LatLng p2, LatLng p3, LatLng p4) {
    double d(LatLng a, LatLng b, LatLng c) =>
        (c.longitude - a.longitude) * (b.latitude - a.latitude) -
        (c.latitude - a.latitude) * (b.longitude - a.longitude);

    return (d(p1, p2, p3) * d(p1, p2, p4) < 0) &&
        (d(p3, p4, p1) * d(p3, p4, p2) < 0);
  }

  /* ================= FILE IMPORT (MULTI-POLYGON) ================= */

  Future<void> _pickBoundaryFile() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['geojson', 'json', 'kml'],
        withData: true,
      );
      if (result == null) return;

      final file = result.files.single;
      final ext = file.extension?.toLowerCase();
      List<List<LatLng>> polygons = [];

      if (ext == 'geojson' || ext == 'json') {
        final data = jsonDecode(utf8.decode(file.bytes!));
        if (data['type'] == 'FeatureCollection') {
          for (var f in data['features']) {
            polygons.add(_parsePolygon(f['geometry']));
          }
        }
      }

      if (polygons.isEmpty) {
        _showSnackBar('No valid polygons found.');
        return;
      }

      _selectImportedPolygon(polygons);
    } catch (_) {
      _showSnackBar('Import failed.');
    }
  }

  List<LatLng> _parsePolygon(Map<String, dynamic> geom) {
    if (geom['type'] != 'Polygon') return [];
    return geom['coordinates'][0]
        .map<LatLng>((c) => LatLng(c[1], c[0]))
        .toList();
  }

  Future<void> _selectImportedPolygon(List<List<LatLng>> polys) async {
    final selected = await showDialog<int>(
      context: context,
      builder: (_) => SimpleDialog(
        title: const Text('Select field boundary'),
        children: [
          for (int i = 0; i < polys.length; i++)
            SimpleDialogOption(
              child: Text('Polygon ${i + 1}'),
              onPressed: () => Navigator.pop(context, i),
            ),
        ],
      ),
    );

    if (selected == null) return;

    setState(() {
      _polygonPoints
        ..clear()
        ..addAll(polys[selected]);
      _redoStack.clear();
      _updatePolygon();
      _mapController.move(_polygonPoints.first, 16);
    });
  }

  /* ================= SUBMIT ================= */

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    if (_polygonPoints.length < 3) {
      _showSnackBar('Define at least 3 points.');
      return;
    }

    if (_hasSelfIntersection()) {
      _showSnackBar('Boundary intersects itself.');
      return;
    }

    setState(() => _isSubmitting = true);
    final appState = context.read<AppState>();

    final geojson = {
      'type': 'Polygon',
      'coordinates': [
        [
          ..._polygonPoints.map((p) => [p.longitude, p.latitude]),
          [_polygonPoints.first.longitude, _polygonPoints.first.latitude],
        ]
      ]
    };

    final fieldData = {
      'field_id': _fieldIdController.text,
      'location': {
        'type': 'Point',
        'coordinates': [_polygonPoints.first.longitude, _polygonPoints.first.latitude]
      },
      'boundary': geojson,
      'area_ha': _areaHectares,
      'area_ac': _areaAcres,
    };

    try {
      appState.isOnline
          ? await _api.createField(fieldData)
          : await _localDb.insertField(fieldData);

      Navigator.pop(context);
    } catch (e) {
      _showSnackBar('Save failed: $e');
    } finally {
      setState(() => _isSubmitting = false);
    }
  }

  void _showSnackBar(String msg) {
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(msg)));
  }

  /* ================= UI ================= */

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Define Field Boundary'),
        actions: [
          IconButton(icon: const Icon(Icons.undo), onPressed: _undo),
          IconButton(icon: const Icon(Icons.redo), onPressed: _redo),
          IconButton(icon: const Icon(Icons.delete_outline), onPressed: _clearPolygon),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Form(
              key: _formKey,
              child: TextFormField(
                controller: _fieldIdController,
                decoration: const InputDecoration(labelText: 'Field name'),
                validator: (v) => v == null || v.isEmpty ? 'Required' : null,
              ),
            ),
          ),
          if (_polygonPoints.length >= 3)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(
                'Area: ${_areaHectares.toStringAsFixed(2)} ha '
                '(${_areaAcres.toStringAsFixed(2)} ac)',
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
            ),
          Expanded(
            child: FlutterMap(
              mapController: _mapController,
              options: MapOptions(
                initialCenter: _initialPosition,
                initialZoom: 15,
                onTap: (_, p) => _onMapTap(p),
              ),
              children: [
                TileLayer(
                  urlTemplate:
                      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                ),
                PolygonLayer(polygons: _polygons.toList()),
                MarkerLayer(
                  markers: _polygonPoints
                      .map((p) => Marker(
                            point: p,
                            child: const Icon(Icons.location_on),
                          ))
                      .toList(),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: FilledButton(
              onPressed: _isSubmitting ? null : _submit,
              child: const Text('Save Field'),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _pickBoundaryFile,
        child: const Icon(Icons.file_upload),
      ),
    );
  }

  @override
  void dispose() {
    _fieldIdController.dispose();
    super.dispose();
  }
}
