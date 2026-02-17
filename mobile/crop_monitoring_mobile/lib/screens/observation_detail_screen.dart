import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
// import 'package:intl/intl.dart'; // Removed unused
import 'dart:convert';
import 'dart:io';

import '../services/local_db.dart';
import '../services/supabase_service.dart';
import '../widgets/app_drawer.dart';

class ObservationDetailScreen extends StatefulWidget {
  final dynamic observationId; 
  final bool isOffline;

  const ObservationDetailScreen({
    super.key,
    required this.observationId,
    this.isOffline = false,
  });

  @override
  State<ObservationDetailScreen> createState() => _ObservationDetailScreenState();
}

class _ObservationDetailScreenState extends State<ObservationDetailScreen> {
  // final SupabaseService _supabase = SupabaseService(); // Removed unused field
  final LocalDB _localDb = LocalDB();

  Map<String, dynamic>? _detail;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadDetail();
  }

  Future<void> _loadDetail() async {
    setState(() => _loading = true);
    try {
      if (widget.isOffline) {
        final id = widget.observationId is String ? int.parse(widget.observationId) : widget.observationId;
        final localRecord = await _localDb.getObservationById(id);
        if (localRecord != null) {
          _detail = jsonDecode(localRecord['data']);
        }
      } else {
        // Fetch from Supabase
        final supabase = SupabaseService();
        _detail = await supabase.getObservationDetails(widget.observationId.toString());
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Observation Details', 
            style: TextStyle(color: Color(0xFF1B5E20), fontWeight: FontWeight.bold, letterSpacing: -0.5)),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: Color(0xFF1B5E20)),
        actions: [
          if (!widget.isOffline)
            const Padding(
              padding: EdgeInsets.only(right: 16),
              child: Icon(Icons.cloud_done_rounded, color: Color(0xFF2E7D32)),
            )
          else
            const Padding(
              padding: EdgeInsets.only(right: 16),
              child: Icon(Icons.edit_note_rounded, color: Colors.orange),
            ),
        ],
      ),
      drawer: const AppDrawer(),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF2E7D32)))
          : _detail == null
              ? const Center(child: Text('No data found'))
              : ListView(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
                  children: [
                    _buildSectionHeader('Field Identification'),
                    _buildSectionCard(_detail!['field_identification'] ?? {}),
                    
                    _buildSectionHeader('Location Map'),
                    _buildMapCard(_detail!['field_identification'] ?? {}),
                    
                    _buildSectionHeader('Crop Information'),
                    _buildSectionCard(_detail!['crop_information'] ?? {}),
                    
                    _buildSectionHeader('Monitoring Details'),
                    _buildSectionCard(_detail!['crop_monitoring'] ?? {}),
                    
                    _buildSectionHeader('Visual References'),
                    _buildImageCard(_detail!['image_reference'] ?? {}),
                    
                    _buildSectionHeader('Soil Characteristics'),
                    _buildSectionCard(_detail!['soil_characteristics'] ?? {}),
                    
                    _buildSectionHeader('Irrigation Management'),
                    _buildSectionCard(_detail!['irrigation_management'] ?? {}),
                    
                    _buildSectionHeader('Nutrient Management'),
                    _buildSectionCard(_detail!['nutrient_management'] ?? {}),
                    
                    _buildSectionHeader('Crop Protection'),
                    _buildSectionCard(_detail!['crop_protection'] ?? {}),
                    
                    _buildSectionHeader('Control Methods'),
                    _buildSectionCard(_detail!['control_methods'] ?? {}),
                    
                    _buildSectionHeader('Harvest Information'),
                    _buildSectionCard(_detail!['harvest_information'] ?? {}),
                    
                    _buildSectionHeader('Residual Management'),
                    _buildSectionCard(_detail!['residual_management'] ?? {}),
                    
                    const SizedBox(height: 40),
                  ],
                ),
    );
  }

  Widget _buildSectionHeader(String title) {
    if (title == 'Visual References') {
      final images = _detail!['image_reference']?['image_urls'] as List?;
      if (images == null || images.isEmpty) return const SizedBox.shrink();
    }
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 12, top: 24),
      child: Text(
        title.toUpperCase(),
        style: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.bold,
          color: Color(0xFF1B5E20),
          letterSpacing: 1.2,
        ),
      ),
    );
  }

  Widget _buildSectionCard(Map<String, dynamic> data) {
    if (data.isEmpty) return const SizedBox.shrink();
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE8F5E9), width: 2),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF1B5E20).withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: data.entries.map((e) => Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  flex: 2,
                  child: Text(_formatKey(e.key), 
                    style: TextStyle(color: Colors.grey.shade600, fontWeight: FontWeight.w500, fontSize: 14)),
                ),
                Expanded(
                  flex: 3,
                  child: Text(e.value.toString(), 
                    textAlign: TextAlign.end,
                    style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF212121), fontSize: 14)),
                ),
              ],
            ),
          )).toList(),
        ),
      ),
    );
  }

  Widget _buildMapCard(Map<String, dynamic> fieldIden) {
    final double lat = (fieldIden['latitude'] ?? 0).toDouble();
    final double lon = (fieldIden['longitude'] ?? 0).toDouble();
    if (lat == 0 && lon == 0) return const SizedBox.shrink();

    return Container(
      height: 200,
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE8F5E9), width: 2),
      ),
      clipBehavior: Clip.antiAlias,
      child: FlutterMap(
        options: MapOptions(initialCenter: LatLng(lat, lon), initialZoom: 15),
        children: [
          TileLayer(urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'),
          MarkerLayer(markers: [Marker(point: LatLng(lat, lon), child: const Icon(Icons.location_on, color: Color(0xFF1B5E20), size: 36))]),
        ],
      ),
    );
  }

  Widget _buildImageCard(Map<String, dynamic> imageRef) {
    // Handle both new 'images' list and legacy 'image_urls' list
    final List<dynamic> imagesList = imageRef['images'] ?? imageRef['image_urls'] ?? [];
    if (imagesList.isEmpty) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE8F5E9), width: 2),
      ),
      child: SizedBox(
        height: 120,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          itemCount: imagesList.length,
          separatorBuilder: (_, __) => const SizedBox(width: 12),
          itemBuilder: (context, index) {
            final img = imagesList[index];
            final String path = img is Map ? (img['image_url'] ?? '') : img.toString();
            final bool isLocalFile = !path.startsWith('http');

            return ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: isLocalFile 
                ? Image.file(
                    File(path), 
                    width: 120, 
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => _buildPlaceholder(),
                  )
                : Image.network(
                    path, 
                    width: 120, 
                    fit: BoxFit.cover, 
                    errorBuilder: (_, __, ___) => _buildPlaceholder(),
                  ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildPlaceholder() {
    return Container(
      width: 120, 
      color: Colors.grey.shade100, 
      child: const Icon(Icons.broken_image_rounded, color: Colors.grey)
    );
  }

  String _formatKey(String key) {
    return key.split('_').map((word) => word[0].toUpperCase() + word.substring(1)).join(' ');
  }
}
