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
    final bool isUrgent = _detail!['urgent_attention'] == true;
    
    return Card(
      elevation: 2,
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: isUrgent ? const BorderSide(color: Colors.red, width: 2) : BorderSide.none,
      ),
      child: Column(
        children: [
          if (isUrgent)
            Container(
              width: double.infinity,
              color: Colors.red,
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: const Text(
                'URGENT ATTENTION',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, letterSpacing: 1.2),
              ),
            ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Icon(
                  Icons.eco,
                  size: 44,
                  color: isUrgent ? Colors.red : Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
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
                ),
              ],
            ),
          ),
        ],
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
          _row('Pesticide Use', cm['pesticide_used']),
          
        _row('Fertilized', cm['fertilizer_applied'] == true ? 'Yes' : 'No'),
        if (cm['fertilizer_applied'] == true) ...[
          _row('Fertilizer Type', cm['fertilizer_type']),
          _row('Amount', '${cm['fertilizer_amount'] ?? '-'} kg/ha'),
          _row('Date', cm['fertilizer_date']),
        ],
        _row('Irrigation', cm['irrigation_applied'] == true ? 'Applied' : 'No'),
        
        const SizedBox(height: 8),
        const Text('Pest & Disease Assessment', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey)),
        const Divider(),
        if (cm['pest_present'] == true) ...[
           _row('Detection', 'Pest/Disease Present'),
           _row('Type', cm['pest_type'], highlight: true),
           _row('Severity', cm['pest_severity'], isSevere: cm['pest_severity'] == 'High'),
           _row('Affected', '${cm['pest_percentage_affected'] ?? 0}%'),
        ] else 
           const Padding(padding: EdgeInsets.symmetric(vertical: 4), child: Text('No pests detected', style: TextStyle(fontStyle: FontStyle.italic))),
      ],
    );
  }

  Widget _measurementSection() {
    final m = _detail!['crop_measurement'] ?? {};

    return _section(
      'Measurements',
      [
        _row('Height', '${m['crop_height_cm'] ?? 0} cm'),
        if (m['stalk_diameter'] != null)
           _row('Stalk Diameter', '${m['stalk_diameter'] ?? 0} mm'),
        
        _row('Green Leaves', '${m['number_of_leaves'] ?? 0}'),
        _row('Population', '${m['plant_population'] ?? 0} plants/ha'),
        
        const SizedBox(height: 12),
        Row(
          children: [
             Expanded(child: _chip('Vigor', m['vigor'])),
             const SizedBox(width: 8),
             Expanded(child: _chip('Moisture', m['soil_moisture_level'])),
          ],
        ),
        const SizedBox(height: 8),
        Row(
           children: [
             Expanded(child: _chip('Weed Pressure', m['weed_pressure'])),
             const SizedBox(width: 8),
             Expanded(child: _infoBox('Canopy', '${m['canopy_cover_percentage'] ?? 0}%')),
           ],
        )
      ],
    );
  }
  
  Widget _chip(String label, String? value) {
    Color color = Colors.grey;
    if (value == 'Good' || value == 'Excellent' || value == 'Low' || value == 'Moist') color = Colors.green;
    if (value == 'High' || value == 'Poor' || value == 'Dry') color = Colors.orange;
    
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontSize: 10, color: Colors.grey)),
          Text(value ?? 'N/A', style: TextStyle(fontWeight: FontWeight.bold, color: color)),
        ],
      ),
    );
  }
  
  Widget _infoBox(String label, String value) {
     return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontSize: 10, color: Colors.grey)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.bold)),
        ],
      ),
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

  Widget _row(String label, String? value, {bool highlight = false, bool isSevere = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontWeight: FontWeight.w500)),
          Text(
            value ?? 'N/A', 
            style: TextStyle(
              fontWeight: highlight || isSevere ? FontWeight.bold : FontWeight.normal,
              color: isSevere ? Colors.red : Colors.black
            )
          ),
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
