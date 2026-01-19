import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:intl/intl.dart';

import 'dart:convert';
import '../services/api_service.dart';
import '../services/local_db.dart';

class ObservationDetailScreen extends StatefulWidget {
  final int observationId;
  final bool isOffline;

  const ObservationDetailScreen({
    super.key,
    required this.observationId,
    this.isOffline = false,
  });

  @override
  State<ObservationDetailScreen> createState() =>
      _ObservationDetailScreenState();
}

class _ObservationDetailScreenState extends State<ObservationDetailScreen> {
  final ApiService _api = ApiService();
  final LocalDB _localDb = LocalDB();

  Map<String, dynamic>? _detail;
  bool _loading = true;

  Set<Polygon> _polygons = {};
  LatLng? _mapCenter;

  @override
  void initState() {
    super.initState();
    _loadDetail();
  }

  /* ===================== DATA ===================== */

  Future<void> _loadDetail() async {
    setState(() => _loading = true);

    try {
      if (widget.isOffline) {
        final localRecord = await _localDb.getObservationById(widget.observationId);
        if (localRecord != null) {
          final data = jsonDecode(localRecord['data']);
          
          // Map local data to UI structure
          _detail = {
            ...data,
            'id': localRecord['id'],
            'field_data': {
              'field_id': data['field']?.toString() ?? 'Offline Field',
            },
            'collector': {
              'username': data['data_collector_name'] ?? 'Local User',
            },
            'media_items': [], // Local media tracking not yet fully implemented for offline
          };
        }
      } else {
        _detail = await _api.getObservationDetail(widget.observationId);
      }
      
      if (_detail != null) {
        _parseObservationPolygon();
      }
    } catch (e) {
      _showSnack('Failed to load observation');
      print('Load detail error: $e');
    } finally {
      setState(() => _loading = false);
    }
  }

  void _showSnack(String msg) {
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(msg)));
  }

  /* ===================== POLYGON ===================== */

  void _parseObservationPolygon() {
    final area = _detail?['observation_area'];
    if (area == null || area['type'] != 'Polygon') return;

    try {
      final List coords = area['coordinates'][0];
      final points =
          coords.map<LatLng>((c) => LatLng(c[1], c[0])).toList();

      if (points.isEmpty) return;

      _polygons = {
        Polygon(
          points: points,
          borderStrokeWidth: 2,
          borderColor: Colors.green,
          color: Colors.green.withOpacity(0.25),
        ),
      };

      _mapCenter = _centroid(points);
    } catch (_) {
      // ignore invalid geometry
    }
  }

  LatLng _centroid(List<LatLng> pts) {
    double lat = 0, lon = 0;
    for (final p in pts) {
      lat += p.latitude;
      lon += p.longitude;
    }
    return LatLng(lat / pts.length, lon / pts.length);
  }

  /* ===================== UI ===================== */

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Observation Details')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _detail == null
              ? const Center(child: Text('No data available'))
              : _buildContent(),
    );
  }

  Widget _buildContent() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _headerCard(),
          const SizedBox(height: 20),

          _section(
            'Field Information',
            [
              _row('Field ID', _detail!['field_data']?['field_id']),
              _row(
                'Collector',
                _detail!['collector']?['username'],
              ),
              if (_detail!['field_data']?['location'] != null)
                _row(
                  'Location',
                  _formatLatLon(_detail!['field_data']['location']),
                ),
            ],
          ),

          if (_polygons.isNotEmpty) ...[
            const SizedBox(height: 16),
            _mapSection(),
          ],

          const SizedBox(height: 16),
          _cropManagementSection(),

          const SizedBox(height: 16),
          _measurementSection(),

          if ((_detail!['media_items'] ?? []).isNotEmpty) ...[
            const SizedBox(height: 16),
            _mediaSection(),
          ],
        ],
      ),
    );
  }

  /* ===================== SECTIONS ===================== */

  Widget _headerCard() {
    return Card(
      elevation: 1,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Icon(
              Icons.eco,
              size: 44,
              color: Theme.of(context).colorScheme.primary,
            ),
            const SizedBox(width: 16),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _detail!['crop_variety'] ?? 'Unknown Crop',
                  style: Theme.of(context)
                      .textTheme
                      .titleLarge
                      ?.copyWith(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 4),
                Text(
                  'Growth stage: ${_detail!['growth_stage'] ?? 'N/A'}',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _mapSection() {
    return _section(
      'Observation Area',
      [
        SizedBox(
          height: 220,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: FlutterMap(
              options: MapOptions(
                initialCenter: _mapCenter ?? const LatLng(0, 0),
                initialZoom: 16,
                interactionOptions:
                    const InteractionOptions(flags: InteractiveFlag.none),
              ),
              children: [
                TileLayer(
                  urlTemplate:
                      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                ),
                PolygonLayer(polygons: _polygons.toList()),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _cropManagementSection() {
    final cm = _detail!['crop_management'] ?? {};

    return _section(
      'Crop Management',
      [
        _row('Sprayed', cm['sprayed'] == true ? 'Yes' : 'No'),
        if (cm['sprayed'] == true)
          _row('Pesticide', cm['pesticide_type']),
        _row(
            'Fertilized',
            cm['fertilizer_applied'] == true
                ? 'Yes'
                : 'No'),
        if (cm['fertilizer_applied'] == true) ...[
          _row('Fertilizer', cm['fertilizer_type']),
          _row('Date', cm['fertilizer_date']),
        ],
      ],
    );
  }

  Widget _measurementSection() {
    final m = _detail!['crop_measurement'] ?? {};

    return _section(
      'Measurements',
      [
        _row('Height', '${m['crop_height_cm'] ?? 0} cm'),
        _row('Stalk Diameter', '${m['stalk_diameter_mm'] ?? 0} mm'),
        _row('Green Leaves', '${m['green_leaves'] ?? 0}'),
        _row('Population', '${m['plant_population'] ?? 0}'),
        _row('Soil Moisture', '${m['soil_moisture'] ?? 0}%'),
      ],
    );
  }

  Widget _mediaSection() {
    final media = _detail!['media_items'] as List;

    return _section(
      'Media',
      [
        SizedBox(
          height: 150,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: media.length,
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (context, index) {
              return ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.network(
                  media[index]['image_url'],
                  width: 150,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(
                    width: 150,
                    color: Colors.grey.shade200,
                    child: const Icon(Icons.broken_image),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  /* ===================== HELPERS ===================== */

  Widget _section(String title, List<Widget> children) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: Theme.of(context)
              .textTheme
              .titleMedium
              ?.copyWith(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 6),
        const Divider(),
        ...children,
      ],
    );
  }

  Widget _row(String label, String? value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontWeight: FontWeight.w500)),
          Text(value ?? 'N/A'),
        ],
      ),
    );
  }

  String _formatLatLon(Map<String, dynamic> location) {
    final coords = location['coordinates'];
    return 'Lat ${coords[1].toStringAsFixed(4)}, '
        'Lon ${coords[0].toStringAsFixed(4)}';
  }
}
