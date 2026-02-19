import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

class BoundaryMapScreen extends StatelessWidget {
  const BoundaryMapScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final Map<String, dynamic> boundary = ModalRoute.of(context)!.settings.arguments as Map<String, dynamic>;
    final String blockId = boundary['block_id'] ?? boundary['id']?.toString() ?? 'Unknown';
    final String name = boundary['name'] ?? boundary['block_name'] ?? 'Unnamed Boundary';
    final dynamic geom = boundary['geom'];

    List<Polygon> polygons = [];
    LatLng? initialCenter;
    double initialZoom = 15;

    if (geom != null && geom['type'] != null) {
      if (geom['type'] == 'Polygon') {
        final List<LatLng> points = _parseCoordinates(geom['coordinates'][0]);
        if (points.isNotEmpty) {
          polygons.add(Polygon(
            points: points,
            color: Colors.green.withValues(alpha: 0.3),
            borderColor: Colors.green,
            borderStrokeWidth: 3,
            isFilled: true,
          ));
          initialCenter = points[0];
        }
      } else if (geom['type'] == 'MultiPolygon') {
        for (var poly in geom['coordinates']) {
          final List<LatLng> points = _parseCoordinates(poly[0]);
          if (points.isNotEmpty) {
            polygons.add(Polygon(
              points: points,
              color: Colors.green.withValues(alpha: 0.3),
              borderColor: Colors.green,
              borderStrokeWidth: 3,
              isFilled: true,
            ));
            if (initialCenter == null) initialCenter = points[0];
          }
        }
      }
    }

    // Fallback center if geometry is missing or invalid
    initialCenter ??= const LatLng(0, 0);
    if (initialCenter.latitude == 0 && initialCenter.longitude == 0) {
      initialZoom = 2;
    }

    return Scaffold(
      appBar: AppBar(
        title: Text('Boundary: $blockId'),
        backgroundColor: const Color(0xFF2E7D32),
        foregroundColor: Colors.white,
      ),
      body: Stack(
        children: [
          FlutterMap(
            options: MapOptions(
              initialCenter: initialCenter,
              initialZoom: initialZoom,
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
                userAgentPackageName: 'com.example.app',
              ),
              if (polygons.isNotEmpty)
                PolygonLayer(polygons: polygons),
            ],
          ),
          Positioned(
            top: 20,
            left: 20,
            right: 20,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.9),
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.1),
                    blurRadius: 10,
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'Block ID: $blockId',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  if (name != 'Unnamed Boundary')
                    Text(
                      name,
                      style: TextStyle(color: Colors.grey[700], fontSize: 14),
                    ),
                  const SizedBox(height: 4),
                  const Text(
                    'Projection: WGS84',
                    style: TextStyle(fontSize: 10, color: Colors.blueGrey, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
          ),
          if (polygons.isEmpty)
            Center(
              child: Container(
                padding: const EdgeInsets.all(16),
                color: Colors.white,
                child: const Text('No geometry data available to display on map.'),
              ),
            ),
        ],
      ),
    );
  }

  List<LatLng> _parseCoordinates(List<dynamic> coords) {
    return coords.map<LatLng>((c) => LatLng(c[1].toDouble(), c[0].toDouble())).toList();
  }
}
