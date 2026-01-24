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
        print('Sync: Uploading offline field ${field['id']} (${data['field_id']})...');
        await api.createField(data);
        await localDb.markFieldAsSynced(field['id']);
        print('Sync: Field ${field['id']} synced successfully.');
      } catch (e) {
        final errorStr = e.toString();
        print('Sync: Field sync failed for id ${field['id']}: $errorStr');
        
        if (errorStr.contains('400') || errorStr.contains('already exists')) {
          print('Sync: Field already exists on server. Marking as synced.');
          await localDb.markFieldAsSynced(field['id']);
        }
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
        if (data['field'] == null && data['temp_field_id'] == null) {
          print('Sync: Observation ${obs['id']} is orphaned (no field). Checking for existing "Default Field" locally...');
          data['temp_field_id'] = 'Default Field';
          
          final localFields = await localDb.getUnsyncedFields();
          final existsLocally = localFields.any((f) {
            try {
              return jsonDecode(f['data'])['field_id'] == 'Default Field';
            } catch (_) { return false; }
          });

          if (!existsLocally) {
            print('Sync: Creating local "Default Field" for orphaned records...');
            await localDb.insertField({
              'field_id': 'Default Field',
              'location': {'type': 'Point', 'coordinates': [0.0, 0.0]},
              'boundary': data['observation_area'],
            });
          }
          // Refresh field list to include the newly identified field
          allFields = await api.getFields();
        }

        if (data['field'] == null) {
          print('Sync: Resolving temporary field link for observation ${obs['id']} (${data['temp_field_id']})...');
          final serverField = allFields.firstWhere(
            (f) => f['field_id'].toString() == data['temp_field_id'].toString(),
            orElse: () => null,
          );
          if (serverField != null) {
            data['field'] = serverField['id'];
            print('Sync: Resolved to server field ID ${serverField['id']}');
          } else {
            print('Sync Warning: Could not find server field for "${data['temp_field_id']}". Server fields: ${allFields.map((f)=>f['field_id']).toList()}. Skipping for now.');
            continue;
          }
        }

        if (data['field'] == null) {
          print('Sync Error: Observation ${obs['id']} has no field assigned (field=null, temp_field_id=${data['temp_field_id']}). Skipping.');
          continue;
        }

        // Clean up data before sending to server
        final List<String> paths = List<String>.from(data['offline_images'] ?? []);
        final double? lat = data['offline_lat'];
        final double? lon = data['offline_lon'];
        
        final apiPayload = Map<String, dynamic>.from(data);

        // --- Data Sanitization for Backend Compatibility ---
        
        // 1. Sanitize Crop Management (Pesticide/Fertilizer)
        if (apiPayload['crop_management'] != null) {
          final cm = Map<String, dynamic>.from(apiPayload['crop_management']);
          // Handle legacy key 'pesticide_type' vs 'pesticide_used'
          final legacyPesticide = cm.remove('pesticide_type');
          cm['pesticide_used'] = cm['pesticide_used'] ?? legacyPesticide ?? "";
          cm['fertilizer_type'] = cm['fertilizer_type'] ?? "";
          cm['weather'] = cm['weather'] ?? "";
          cm['watering'] = cm['watering'] ?? "";
          apiPayload['crop_management'] = cm;
        }

        // 2. Sanitize Crop Measurements (Legacy Keys)
        if (apiPayload['crop_measurement'] != null) {
          final cm = Map<String, dynamic>.from(apiPayload['crop_measurement']);
          // Handle 'stalk_diameter_mm' -> 'stalk_diameter'
          if (cm.containsKey('stalk_diameter_mm')) {
            cm['stalk_diameter'] = cm.remove('stalk_diameter_mm');
          }
          // Handle 'green_leaves' -> 'number_of_leaves'
          if (cm.containsKey('green_leaves')) {
            cm['number_of_leaves'] = cm.remove('green_leaves');
          }
          apiPayload['crop_measurement'] = cm;
        }

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

