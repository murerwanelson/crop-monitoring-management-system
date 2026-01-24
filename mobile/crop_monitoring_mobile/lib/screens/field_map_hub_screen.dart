import 'dart:io';
import 'dart:ui' as ui;
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;
import 'package:http/http.dart' as http;
import '../services/api_service.dart';
import '../providers/app_state.dart';
import '../services/map_downloader_service.dart';

import '../services/local_db.dart';

class FieldMapHubScreen extends StatefulWidget {
  const FieldMapHubScreen({super.key});

  @override
  State<FieldMapHubScreen> createState() => _FieldMapHubScreenState();
}

class _FieldMapHubScreenState extends State<FieldMapHubScreen> {
  final ApiService _api = ApiService();
  final LocalDB _localDb = LocalDB();
  final MapController _mapController = MapController();
  bool _isLoading = true;
  bool _isDownloading = false;
  bool _hasRecenteredOnce = false;
  double _downloadProgress = 0.0;
  Map<String, dynamic>? _geoJson;
  List<Polygon> _polygons = [];
  LatLng _center = const LatLng(-1.286389, 36.817222);

  @override
  void initState() {
    super.initState();
    _loadMapData();
    // Start GPS tracking to show "You Are Here" on the hub
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AppState>().startGpsTracking();
    });
  }

  @override
  void dispose() {
    context.read<AppState>().stopGpsTracking();
    super.dispose();
  }

  Future<void> _loadMapData() async {
    setState(() => _isLoading = true);
    final appState = context.read<AppState>();
    
    try {
      if (appState.isOnline) {
        // Online: Fetch and Cache
        final data = await _api.getFieldsMapData();
        _geoJson = data;
        await _localDb.saveDraft('cached_field_map_hub', data);
        _parseGeoJson(data);
      } else {
        // Offline: Load from Cache
        final cachedData = await _localDb.getDraft('cached_field_map_hub');
        if (cachedData != null) {
          _geoJson = cachedData;
          _parseGeoJson(cachedData);
        }
      }
    } catch (e) {
      debugPrint('Map load error: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _recenterToUser() {
    final appState = context.read<AppState>();
    if (appState.currentPosition != null) {
      _mapController.move(
        LatLng(appState.currentPosition!.latitude, appState.currentPosition!.longitude),
        16.0,
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Waiting for GPS signal... 🛰️')),
      );
    }
  }

  Widget _buildSearchBar() {
    return Container(
      width: 50,
      height: 50,
      decoration: BoxDecoration(
        color: Colors.white,
        shape: BoxShape.circle,
        boxShadow: [BoxShadow(color: Colors.black26, blurRadius: 4)],
      ),
      child: IconButton(
        icon: const Icon(Icons.search, color: Colors.blue),
        onPressed: () {
          showSearch(
            context: context,
            delegate: FieldSearchDelegate(
              geoJson: _geoJson,
              onFieldSelected: _onFieldSearchSelected,
            ),
          );
        },
      ),
    );
  }

  void _onFieldSearchSelected(dynamic feature) {
    if (feature == null) return;
    
    final geometry = feature['geometry'];
    if (geometry == null || geometry['type'] != 'Polygon') return;
    
    final List coords = geometry['coordinates'][0];
    final List<LatLng> points = coords.map((c) => LatLng(c[1], c[0])).toList();
    
    final center = _getCenterOfPolygon(points);
    _mapController.move(center, 17.0);
  }

  LatLng _getCenterOfPolygon(List<LatLng> points) {
    double avgLat = points.map((p) => p.latitude).reduce((a, b) => a + b) / points.length;
    double avgLon = points.map((p) => p.longitude).reduce((a, b) => a + b) / points.length;
    return LatLng(avgLat, avgLon);
  }

  void _parseGeoJson(Map<String, dynamic> data) {
    final features = data['features'] as List? ?? [];
    List<Polygon> newPolygons = [];
    List<LatLng> allPoints = [];

    for (var feature in features) {
      final geometry = feature['geometry'];
      final properties = feature['properties'];
      if (geometry == null || geometry['type'] != 'Polygon') continue;

      final List coords = geometry['coordinates'][0];
      final List<LatLng> points = coords.map((c) => LatLng(c[1], c[0])).toList();
      allPoints.addAll(points);

      final lastVisitStr = properties['last_observation_date'];
      final color = _getVisitColor(lastVisitStr);

      newPolygons.add(
        Polygon(
          points: points,
          color: color.withOpacity(0.3),
          borderColor: color,
          borderStrokeWidth: 2,
          isFilled: true,
          label: properties['field_id']?.toString(),
          labelStyle: const TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 10),
        ),
      );
    }

    if (allPoints.isNotEmpty) {
      double avgLat = allPoints.map((p) => p.latitude).reduce((a, b) => a + b) / allPoints.length;
      double avgLon = allPoints.map((p) => p.longitude).reduce((a, b) => a + b) / allPoints.length;
      _center = LatLng(avgLat, avgLon);
    }

    _polygons = newPolygons;
  }

  Color _getVisitColor(String? dateStr) {
    if (dateStr == null) return Colors.red;
    try {
      final lastVisit = DateTime.parse(dateStr);
      final diff = DateTime.now().difference(lastVisit).inDays;
      if (diff <= 3) return Colors.green;
      if (diff <= 7) return Colors.orange;
      return Colors.red;
    } catch (_) {
      return Colors.red;
    }
  }

  Future<void> _handleDownload() async {
    final bounds = _mapController.camera.visibleBounds;
    final appState = context.read<AppState>();

    setState(() {
      _isDownloading = true;
      _downloadProgress = 0.0;
    });

    try {
       final stream = appState.downloadMapArea(
        minLat: bounds.south,
        minLon: bounds.west,
        maxLat: bounds.north,
        maxLon: bounds.east,
      );

      await for (final progress in stream) {
        if (mounted) {
          setState(() => _downloadProgress = progress);
        }
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Map area downloaded successfully! 🗺️✅')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Download failed: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isDownloading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();

    // Auto-recenter on first GPS lock
    if (!_hasRecenteredOnce && appState.currentPosition != null) {
      _hasRecenteredOnce = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _mapController.move(
          LatLng(appState.currentPosition!.latitude, appState.currentPosition!.longitude),
          15.0,
        );
      });
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Field Map Hub'),
        actions: [
          if (appState.isOnline)
            IconButton(
              icon: const Icon(Icons.download_for_offline_rounded),
              onPressed: _isDownloading ? null : _handleDownload,
              tooltip: 'Download Visible Area',
            ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadMapData,
          ),
        ],
      ),
      body: Stack(
        children: [
          if (!appState.isOnline && appState.mapCacheSizeMB == 0)
            _buildOfflinePlaceholder()
          else if (_isLoading)
            const Center(child: CircularProgressIndicator())
          else
            FlutterMap(
              mapController: _mapController,
              options: MapOptions(
                initialCenter: _center,
                initialZoom: 15,
              ),
              children: [
                TileLayer(
                  urlTemplate: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
                  userAgentPackageName: 'com.example.app',
                  tileProvider: HybridTileProvider(),
                ),
                PolygonLayer(polygons: _polygons),
                if (appState.currentPosition != null)
                  MarkerLayer(
                    markers: [
                      Marker(
                        point: LatLng(appState.currentPosition!.latitude, appState.currentPosition!.longitude),
                        width: 40,
                        height: 40,
                        child: Container(
                          decoration: BoxDecoration(
                            color: Colors.blue.withOpacity(0.3),
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 2),
                          ),
                          child: const Icon(Icons.my_location, color: Colors.blue, size: 24),
                        ),
                      ),
                    ],
                  ),
              ],
            ),
          
          if (_isDownloading)
            _buildDownloadProgress(),
          
          // Top Left: Current Field Badge
          Positioned(
            top: 16,
            left: 16,
            child: _buildCurrentFieldBadge(appState),
          ),

          // Top Right: Search Bar
          Positioned(
            top: 16,
            right: 16,
            child: _buildSearchBar(),
          ),
          
          // Legend (Bottom Center)
          if (!_isLoading && (appState.isOnline || appState.mapCacheSizeMB > 0))
            Positioned(
              bottom: 24,
              left: 16,
              right: 16,
              child: _buildLegend(),
            ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _recenterToUser,
        backgroundColor: Colors.white,
        child: const Icon(Icons.gps_fixed, color: Colors.blue),
      ),
    );
  }

  Widget _buildDownloadProgress() {
    return Container(
      color: Colors.black54,
      child: Center(
        child: Card(
          margin: const EdgeInsets.symmetric(horizontal: 40),
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.map_rounded, size: 48, color: Colors.blue),
                const SizedBox(height: 16),
                const Text('Downloading Map Tiles...', style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 16),
                LinearProgressIndicator(value: _downloadProgress),
                const SizedBox(height: 8),
                Text('${(_downloadProgress * 100).toInt()}%', style: const TextStyle(fontSize: 12)),
                const SizedBox(height: 16),
                const Text('Saving area for offline use.', style: TextStyle(fontSize: 12, color: Colors.grey)),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildOfflinePlaceholder() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.map_outlined, size: 64, color: Colors.grey.shade400),
          const SizedBox(height: 16),
          const Text('Map Hub requires a cloud connection',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          const Text('Please check your internet to see digital boundaries.',
              style: TextStyle(color: Colors.grey)),
          const SizedBox(height: 16),
          ElevatedButton(onPressed: _loadMapData, child: const Text('Retry')),
        ],
      ),
    );
  }

  Widget _buildLegend() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _legendItem(Colors.green, 'Recent (<3d)'),
          _legendItem(Colors.orange, 'Visiting Due'),
          _legendItem(Colors.red, 'Late (>7d/No Data)'),
        ],
      ),
    );
  }

  Widget _buildCurrentFieldBadge(AppState appState) {
    if (appState.currentPosition == null || _polygons.isEmpty) return const SizedBox();

    String? currentFieldId;
    final userPoint = LatLng(appState.currentPosition!.latitude, appState.currentPosition!.longitude);

    for (var poly in _polygons) {
      if (_isPointInPolygon(userPoint, poly.points)) {
        currentFieldId = poly.label;
        break;
      }
    }

    if (currentFieldId == null) return const SizedBox();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.9),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 4)],
        border: Border.all(color: Colors.blue.shade100),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.location_on, color: Colors.blue.shade700, size: 16),
          const SizedBox(width: 8),
          Text(
            'FIELD: $currentFieldId',
            style: TextStyle(color: Colors.blue.shade900, fontWeight: FontWeight.bold, fontSize: 11),
          ),
        ],
      ),
    );
  }

  bool _isPointInPolygon(LatLng point, List<LatLng> polygon) {
    var result = false;
    var j = polygon.length - 1;
    for (var i = 0; i < polygon.length; i++) {
      if ((polygon[i].longitude < point.longitude && polygon[j].longitude >= point.longitude ||
              polygon[j].longitude < point.longitude && polygon[i].longitude >= point.longitude) &&
          (polygon[i].latitude +
                  (point.longitude - polygon[i].longitude) /
                      (polygon[j].longitude - polygon[i].longitude) *
                      (polygon[j].latitude - polygon[i].latitude) <
              point.latitude)) {
        result = !result;
      }
      j = i;
    }
    return result;
  }

  Widget _legendItem(Color color, String label) {
    return Row(
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 6),
        Text(label, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
      ],
    );
  }
}

class HybridTileProvider extends TileProvider {
  @override
  ImageProvider getImage(TileCoordinates coordinates, TileLayer options) {
    final x = coordinates.x;
    final y = coordinates.y;
    final z = coordinates.z;

    return HybridTileImageProvider(
      z: z,
      x: x,
      y: y,
      fallbackUrl: getTileUrl(coordinates, options),
    );
  }
}

class HybridTileImageProvider extends ImageProvider<HybridTileImageProvider> {
  final int z, x, y;
  final String fallbackUrl;

  HybridTileImageProvider({required this.z, required this.x, required this.y, required this.fallbackUrl});

  @override
  Future<HybridTileImageProvider> obtainKey(ImageConfiguration configuration) {
    return Future.value(this);
  }

  @override
  ImageStreamCompleter loadImage(HybridTileImageProvider key, ImageDecoderCallback decode) {
    return MultiFrameImageStreamCompleter(
      codec: _loadAsync(key, decode),
      scale: 1.0,
      debugLabel: 'HybridTileImageProvider($z, $x, $y)',
    );
  }

  Future<ui.Codec> _loadAsync(HybridTileImageProvider key, ImageDecoderCallback decode) async {
    try {
      final directory = await getApplicationDocumentsDirectory();
      final localPath = p.join(directory.path, 'map_tiles', '$z', '$x', '$y.png');
      final localFile = File(localPath);

      if (await localFile.exists()) {
        final bytes = await localFile.readAsBytes();
        if (bytes.isNotEmpty) {
          return await decode(await ui.ImmutableBuffer.fromUint8List(bytes));
        }
      }

      // Fallback to network with browser-like headers
      final uri = Uri.parse(fallbackUrl);
      final response = await http.get(
        uri,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200 && response.bodyBytes.isNotEmpty) {
        // Cache it for next time
        await localFile.parent.create(recursive: true);
        await localFile.writeAsBytes(response.bodyBytes);
        return await decode(await ui.ImmutableBuffer.fromUint8List(response.bodyBytes));
      }
    } catch (e) {
      debugPrint('Error loading hybrid tile ($z/$x/$y): $e');
    }
    
    // Return a valid 1x1 transparent PNG if all fails to prevent "Decompression Error"
    final transparentBytes = Uint8List.fromList([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
      0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0x60, 0x00, 0x02, 0x00,
      0x00, 0x05, 0x00, 0x01, 0x0D, 0x26, 0xE5, 0x2E, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44,
      0xAE, 0x42, 0x60, 0x82
    ]);
    return await decode(await ui.ImmutableBuffer.fromUint8List(transparentBytes));
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is HybridTileImageProvider &&
          runtimeType == other.runtimeType &&
          z == other.z &&
          x == other.x &&
          y == other.y;

  @override
  int get hashCode => z.hashCode ^ x.hashCode ^ y.hashCode;
}

class FieldSearchDelegate extends SearchDelegate {
  final Map<String, dynamic>? geoJson;
  final Function(dynamic) onFieldSelected;

  FieldSearchDelegate({required this.geoJson, required this.onFieldSelected});

  @override
  List<Widget>? buildActions(BuildContext context) {
    return [
      IconButton(
        icon: const Icon(Icons.clear),
        onPressed: () => query = '',
      ),
    ];
  }

  @override
  Widget? buildLeading(BuildContext context) {
    return IconButton(
      icon: const Icon(Icons.arrow_back),
      onPressed: () => close(context, null),
    );
  }

  @override
  Widget buildResults(BuildContext context) {
    return _buildSearchResults();
  }

  @override
  Widget buildSuggestions(BuildContext context) {
    return _buildSearchResults();
  }

  Widget _buildSearchResults() {
    if (geoJson == null) return const Center(child: Text('No map data loaded'));

    final features = geoJson!['features'] as List? ?? [];
    final results = features.where((f) {
      final fid = f['properties']['field_id']?.toString().toLowerCase() ?? '';
      final loc = f['properties']['location']?.toString().toLowerCase() ?? '';
      return fid.contains(query.toLowerCase()) || loc.contains(query.toLowerCase());
    }).toList();

    if (results.isEmpty) {
      return const Center(child: Text('No fields found matching your search.'));
    }

    return ListView.builder(
      itemCount: results.length,
      itemBuilder: (context, index) {
        final f = results[index];
        final fid = f['properties']['field_id'];
        final loc = f['properties']['location'];
        
        String readableLocation = 'No location details';
        if (loc is Map && loc['coordinates'] != null) {
          final List coords = loc['coordinates'];
          readableLocation = 'Lat: ${coords[1].toStringAsFixed(4)}, Lon: ${coords[0].toStringAsFixed(4)}';
        }
        
        return ListTile(
          leading: const Icon(Icons.landscape, color: Colors.green),
          title: Text('Field ID: $fid', style: const TextStyle(fontWeight: FontWeight.bold)),
          subtitle: Text(readableLocation),
          onTap: () {
            onFieldSelected(f);
            close(context, f);
          },
        );
      },
    );
  }
}
