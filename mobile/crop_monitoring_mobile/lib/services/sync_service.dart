import 'dart:convert';
import 'dart:io';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'local_db.dart';
import 'api_service.dart';

class SyncService {
  final LocalDB localDb = LocalDB();
  final ApiService api = ApiService();

  Future<void> syncAll() async {
    var connectivityResult = await Connectivity().checkConnectivity();
    if (connectivityResult == ConnectivityResult.none) return;

    await syncFields();
    await syncObservations();
  }

  Future<void> syncFields() async {
    List<Map<String, dynamic>> unsynced = await localDb.getUnsyncedFields();
    for (var field in unsynced) {
      Map<String, dynamic> data = jsonDecode(field['data']);
      try {
        await api.createField(data);
        await localDb.markFieldAsSynced(field['id']);
      } catch (e) {
        print('Field sync failed for id ${field['id']}: $e');
      }
    }
  }

  Future<void> syncObservations() async {
    List<Map<String, dynamic>> unsynced = await localDb.getUnsyncedObservations();
    if (unsynced.isEmpty) return;

    // Fetch all fields to resolve temp_field_id links
    List<dynamic> allFields = [];
    try {
      allFields = await api.getFields();
    } catch (e) {
      print('Sync Error: Could not fetch fields for link resolution: $e');
    }

    for (var obs in unsynced) {
      Map<String, dynamic> data = jsonDecode(obs['data']);
      
      try {
        // Resolve field if it was saved with a temp_field_id offline
        if (data['field'] == null && data['temp_field_id'] != null) {
          final serverField = allFields.firstWhere(
            (f) => f['field_id'] == data['temp_field_id'],
            orElse: () => null,
          );
          if (serverField != null) {
            data['field'] = serverField['id'];
          } else {
            print('Sync Warning: Could not find server field for ${data['temp_field_id']}. Skipping observation ${obs['id']} for now.');
            continue;
          }
        }

        if (data['field'] == null) {
          print('Sync Error: Observation ${obs['id']} has no field assigned. Skipping.');
          continue;
        }

        // Clean up data before sending to server
        final List<String> paths = List<String>.from(data['offline_images'] ?? []);
        final double? lat = data['offline_lat'];
        final double? lon = data['offline_lon'];
        
        final apiPayload = Map<String, dynamic>.from(data);
        apiPayload.remove('temp_field_id');
        apiPayload.remove('offline_images');
        apiPayload.remove('offline_lat');
        apiPayload.remove('offline_lon');

        // Create the observation on server
        final int serverSideId = await api.createObservation(apiPayload);
        
        // Upload images if any
        if (paths.isNotEmpty) {
          final List<File> files = paths
              .map((p) => File(p))
              .where((f) => f.existsSync())
              .toList();
          
          if (files.isNotEmpty) {
            try {
              await api.uploadMedia(serverSideId, files, lat: lat, lon: lon);
              print('Uploaded ${files.length} images for observation $serverSideId');
            } catch (mediaError) {
              print('Media sync partially failed for observation $serverSideId: $mediaError');
              // We still mark the observation as synced because the record exists on the server
            }
          }
        }

        await localDb.markAsSynced(obs['id']);
        print('Successfully synced observation ${obs['id']}');
      } catch (e) {
        print('Observation sync failed for id ${obs['id']}. Error: $e');
        if (e.toString().contains('400')) {
          print('Payload sent: $data');
        }
      }
    }
  }
}

