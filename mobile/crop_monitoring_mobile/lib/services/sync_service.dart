import 'dart:convert';
import 'dart:io';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'local_db.dart';
import 'supabase_service.dart';

class SyncService {
  final LocalDB localDb = LocalDB();
  final SupabaseService supabase = SupabaseService();
  bool _isSyncing = false;

  Future<void> syncAll() async {
    if (_isSyncing) return;
    
    var connectivityResult = await Connectivity().checkConnectivity();
    if (connectivityResult == ConnectivityResult.none) return;

    _isSyncing = true;
    try {
      await syncObservations();
      await syncBlocks();
    } finally {
      _isSyncing = false;
    }
  }

  Future<void> syncObservations() async {
    List<Map<String, dynamic>> unsynced = await localDb.getUnsyncedObservations();
    if (unsynced.isEmpty) return;

    for (var record in unsynced) {
      Map<String, dynamic> data = jsonDecode(record['data']);
      
      try {
        // 1. Handle Images if they are local paths
        // 1. Handle Images
        if (data['image_reference'] != null) {
          bool imageUploadFailed = false;

          // A. NEW FORMAT: List of objects in 'images'
          if (data['image_reference']['images'] != null) {
            List<dynamic> images = data['image_reference']['images'];
            List<Map<String, dynamic>> updatedImages = [];

            for (var img in images) {
              String url = img['image_url'];
              if (!url.startsWith('http')) {
                // Local path detected
                File file = File(url);
                if (file.existsSync()) {
                  try {
                    // Using the new robust upload with compression and retry
                    final res = await supabase.uploadImageWithRetry('crop-monitoring-photos', 'observations', file);
                    updatedImages.add({
                      'image_url': res['publicUrl'],
                      'storage_path': res['fullPath']
                    });
                  } catch (e) {
                    print('Sync: Image upload failed after retries for ${record['id']}: $e');
                    imageUploadFailed = true;
                    break;
                  }
                }
              } else {
                // Already valid URL
                updatedImages.add(Map<String, dynamic>.from(img));
              }
            }
            if (!imageUploadFailed) {
              data['image_reference']['images'] = updatedImages;
            }
          } 
          // B. LEGACY FORMAT: List of strings in 'image_urls'
          else if (data['image_reference']['image_urls'] != null) {
            List<dynamic> urls = data['image_reference']['image_urls'];
            List<String> uploadedUrls = [];
            
            for (var item in urls) {
              String path = item.toString();
              if (!path.startsWith('http')) {
                File file = File(path);
                if (file.existsSync()) {
                  try {
                    final res = await supabase.uploadImageWithRetry('crop-monitoring-photos', 'observations', file);
                    uploadedUrls.add(res['publicUrl']!);
                  } catch (e) {
                    print('Sync: Image upload failed after retries for ${record['id']}: $e');
                    imageUploadFailed = true;
                    break; 
                  }
                }
              } else {
                uploadedUrls.add(path);
              }
            }
            if (!imageUploadFailed) {
              data['image_reference']['image_urls'] = uploadedUrls;
            }
          }
          
          if (imageUploadFailed) continue; // Skip to next record, retry later
        }

        // 2. Save observation
        await supabase.saveObservation(data);
        await localDb.markAsSynced(record['id']);
        print('Sync: Successfully synced observation ${record['id']} to Supabase');
      } on PostgrestException catch (e) {
        // Rule 1 & 5: Idempotency check
        // Code 23505 = Unique violation (PostgreSQL)
        if (e.code == '23505') {
          print('Sync: Observation ${record['id']} already exists on server (Idempotent). Marking as synced.');
          await localDb.markAsSynced(record['id']);
        } else {
          print('Sync: Supabase DB error for observation ${record['id']}: ${e.message}');
        }
      } catch (e) {
        print('Sync: General error for observation ${record['id']}: $e');
      }
    }
  }

  Future<void> syncBlocks() async {
    try {
      final List<Map<String, dynamic>> remoteBlocks = await supabase.fetchBlocks();
      await localDb.syncBlocks(remoteBlocks);
      print('Sync: Successfully updated ${remoteBlocks.length} blocks from Supabase');
    } catch (e) {
      print('Sync: Failed to sync blocks: $e');
    }
  }
}

