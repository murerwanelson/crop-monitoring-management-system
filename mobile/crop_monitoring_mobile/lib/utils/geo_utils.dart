
class GeoUtils {
  /// Simple Ray-Casting Algorithm for Point-in-Polygon
  static bool isPointInPolygon(double lat, double lng, Map<String, dynamic> polygon) {
    // GeoJSON structure: MultiPolygon or Polygon
    String type = polygon['type'] ?? '';
    
    if (type == 'Polygon') {
      return _checkSinglePolygon(lat, lng, polygon['coordinates'] as List);
    } else if (type == 'MultiPolygon') {
      List multiCoords = polygon['coordinates'] as List;
      for (var coords in multiCoords) {
        if (_checkSinglePolygon(lat, lng, coords as List)) return true;
      }
    }
    
    return false;
  }

  static bool _checkSinglePolygon(double lat, double lng, List coordinates) {
    if (coordinates.isEmpty) return false;
    
    // The first ring is the exterior boundary
    List exterior = coordinates[0] as List;
    bool inside = false;
    
    for (int i = 0, j = exterior.length - 1; i < exterior.length; j = i++) {
        // GeoJSON uses [lng, lat]
        double xi = (exterior[i][0] as num).toDouble();
        double yi = (exterior[i][1] as num).toDouble();
        double xj = (exterior[j][0] as num).toDouble();
        double yj = (exterior[j][1] as num).toDouble();

        bool intersect = ((yi > lat) != (yj > lat)) &&
            (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
            
        if (intersect) inside = !inside;
    }
    
    // TODO: Handle holes (rest of the coordinates rings) if necessary
    // If inside is true, check if it's in a hole
    if (inside && coordinates.length > 1) {
      for (int k = 1; k < coordinates.length; k++) {
        if (_checkSinglePolygon(lat, lng, [coordinates[k]])) {
          return false; // It's in a hole
        }
      }
    }

    return inside;
  }
}
