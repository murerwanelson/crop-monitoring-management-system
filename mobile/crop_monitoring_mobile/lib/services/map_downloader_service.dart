import 'dart:io';
import 'dart:math';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;

class MapDownloaderService {
  static const String _baseUrl = 'https://tile.openstreetmap.org';
  
  // Gets the local path where tiles are stored
  Future<String> get _localTilePath async {
    final directory = await getApplicationDocumentsDirectory();
    final path = p.join(directory.path, 'map_tiles');
    final dir = Directory(path);
    if (!await dir.exists()) {
      await dir.create(recursive: true);
    }
    return path;
  }

  // Calculate tiles for a bounding box at a specific zoom
  List<Map<String, int>> _getTilesInBBox(double minLat, double minLon, double maxLat, double maxLon, int zoom) {
    List<Map<String, int>> tiles = [];
    
    int xMin = _lon2TileX(minLon, zoom);
    int xMax = _lon2TileX(maxLon, zoom);
    int yMin = _lat2TileY(maxLat, zoom);
    int yMax = _lat2TileY(minLat, zoom);

    for (int x = xMin; x <= xMax; x++) {
      for (int y = yMin; y <= yMax; y++) {
        tiles.add({'x': x, 'y': y, 'z': zoom});
      }
    }
    return tiles;
  }

  int _lon2TileX(double lon, int zoom) {
    return ((lon + 180.0) / 360.0 * (1 << zoom)).floor();
  }

  int _lat2TileY(double lat, int zoom) {
    return ((1.0 - log(tan(lat * pi / 180.0) + 1.0 / cos(lat * pi / 180.0)) / pi) / 2.0 * (1 << zoom)).floor();
  }

  // Download all tiles for a region
  Stream<double> downloadRegion({
    required double minLat,
    required double minLon,
    required double maxLat,
    required double maxLon,
    int minZoom = 12,
    int maxZoom = 17,
  }) async* {
    final basePath = await _localTilePath;
    List<Map<String, int>> allTiles = [];
    
    for (int z = minZoom; z <= maxZoom; z++) {
      allTiles.addAll(_getTilesInBBox(minLat, minLon, maxLat, maxLon, z));
    }

    int total = allTiles.length;
    int downloaded = 0;

    for (var tile in allTiles) {
      final x = tile['x']!;
      final y = tile['y']!;
      final z = tile['z']!;
      
      final tilePath = p.join(basePath, '$z', '$x', '$y.png');
      final file = File(tilePath);

      if (!await file.exists()) {
        await file.parent.create(recursive: true);
        try {
          final url = '$_baseUrl/$z/$x/$y.png';
          final response = await http.get(Uri.parse(url)).timeout(const Duration(seconds: 10));
          if (response.statusCode == 200) {
            await file.writeAsBytes(response.bodyBytes);
          }
        } catch (e) {
          print('Error downloading tile $z/$x/$y: $e');
        }
      }

      downloaded++;
      yield downloaded / total;
    }
  }

  Future<void> clearCache() async {
    final path = await _localTilePath;
    final dir = Directory(path);
    if (await dir.exists()) {
      await dir.delete(recursive: true);
    }
  }

  Future<double> getCacheSizeMB() async {
    final path = await _localTilePath;
    final dir = Directory(path);
    int totalSize = 0;
    if (await dir.exists()) {
      await for (var file in dir.list(recursive: true)) {
        if (file is File) {
          totalSize += await file.length();
        }
      }
    }
    return totalSize / (1024 * 1024);
  }
}
