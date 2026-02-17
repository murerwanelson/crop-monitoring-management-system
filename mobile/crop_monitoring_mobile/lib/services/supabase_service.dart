import 'package:supabase_flutter/supabase_flutter.dart';
import 'dart:io';
import 'dart:async';
import 'package:uuid/uuid.dart';
import 'package:flutter_image_compress/flutter_image_compress.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;
import 'package:retry/retry.dart';
import 'package:http/http.dart' as http;

class SupabaseService {
  static final SupabaseClient _client = Supabase.instance.client;
  SupabaseClient get client => _client;

  // --- Auth ---

  Future<AuthResponse> signIn(String email, String password) async {
    return await client.auth.signInWithPassword(email: email, password: password);
  }

  Future<AuthResponse> signUp(String email, String password, {Map<String, dynamic>? data}) async {
    return await client.auth.signUp(email: email, password: password, data: data);
  }

  Future<void> signOut() async {
    await client.auth.signOut();
  }

  User? get currentUser => client.auth.currentUser;

  // --- Database CRUD (Generic) ---

  Future<List<Map<String, dynamic>>> fetchAll(String table) async {
    final response = await client.from(table).select();
    return List<Map<String, dynamic>>.from(response);
  }

  Future<Map<String, dynamic>> upsert(String table, Map<String, dynamic> data) async {
    final response = await client.from(table).upsert(data).select().single();
    return response;
  }

  Future<void> delete(String table, String id) async {
    await client.from(table).delete().eq('id', id);
  }

  // --- Blocks ---

  Future<List<Map<String, dynamic>>> fetchBlocks() async {
    final response = await client.from('blocks').select();
    return List<Map<String, dynamic>>.from(response);
  }

  // --- Storage ---

  Future<File> compressImage(File file) async {
    final tempDir = await getTemporaryDirectory();
    final uuid = const Uuid().v4();
    final targetPath = p.join(tempDir.path, '${uuid}_compressed.jpg');

    final result = await FlutterImageCompress.compressAndGetFile(
      file.absolute.path,
      targetPath,
      quality: 70, // Slightly more aggressive compression
      minWidth: 1280, // 1280 is sufficient for clear field photos
      minHeight: 1280,
    );

    if (result == null) {
      throw Exception('Image compression failed');
    }

    return File(result.path);
  }

  Future<Map<String, String>> uploadImageWithRetry(String bucket, String path, File file) async {
    File? compressedFile;
    try {
      compressedFile = await compressImage(file);
      final uuid = const Uuid().v4();
      final fileName = '${DateTime.now().millisecondsSinceEpoch}_$uuid.jpg';
      final fullPath = '$path/$fileName';

      return await retry(
        () async {
          await client.storage
              .from(bucket)
              .upload(
                fullPath,
                compressedFile!,
                fileOptions: const FileOptions(
                  cacheControl: '3600',
                  upsert: false,
                ),
              )
              .timeout(const Duration(seconds: 60));

          final publicUrl = client.storage.from(bucket).getPublicUrl(fullPath);

          return {
            'publicUrl': publicUrl,
            'fullPath': fullPath,
          };
        },
        retryIf: (e) => 
            e is SocketException || 
            e is TimeoutException || 
            e is HandshakeException || // Catch TLS handshake failures separately
            e is HttpException || 
            e is http.ClientException ||
            e is TlsException || // Catch other TLS failures
            e.toString().contains('Connection reset by peer') ||
            e.toString().contains('Connection terminated during handshake'),
        maxAttempts: 8, // Increased attempts for very unstable networks
        delayFactor: const Duration(seconds: 2),
        randomizationFactor: 0.5,
      );
    } finally {
      // Ensure cleanup of temp file regardless of success or final failure
      if (compressedFile != null && await compressedFile.exists()) {
        try {
          await compressedFile.delete();
        } catch (e) {
          print('SupabaseService: Warning - failed to cleanup temp file: $e');
        }
      }
    }
  }

  // Deprecated: Internal use should switch to uploadImageWithRetry
  Future<Map<String, String>> uploadImage(String bucket, String path, File file) async {
    return uploadImageWithRetry(bucket, path, file);
  }

  // --- Observation Submission (Multi-table according to sections A-M) ---

  Future<void> saveObservation(Map<String, dynamic> payload) async {
    final user = client.auth.currentUser;
    if (user == null) throw Exception('User not authenticated');

    // --- SCHEMA TRANSLATION LAYER (Internal Fix for existing offline drafts) ---
    void translateKeys(Map<String, dynamic> map) {
      if (map.containsKey('soil_moisture')) {
        map['soil_moisture_percentage'] = map.remove('soil_moisture');
      }
      if (map.containsKey('water_source_type')) {
        map['water_source'] = map.remove('water_source_type');
      }
      if (map.containsKey('organic_matter_content')) {
        map['organic_matter'] = map.remove('organic_matter_content');
      }
      if (map.containsKey('stress_type')) {
        map['stress'] = map.remove('stress_type');
      }
      if (map.containsKey('vigor')) {
        map['crop_vigor'] = map.remove('vigor');
      }
      if (map.containsKey('canopy_cover_percentage')) {
        map['canopy_cover'] = map.remove('canopy_cover_percentage');
      }
      if (map.containsKey('macronutrient_npk')) {
        map['npk_ratio'] = map.remove('macronutrient_npk');
      }
      if (map.containsKey('weed_pressure')) {
        map['weed_level'] = map.remove('weed_pressure');
      }
      if (map.containsKey('residual_outcome')) {
        map['remarks'] = map.remove('residual_outcome');
      }
    }

    final fieldIden = payload['field_identification'];
    final cropInfo = payload['crop_information'];
    
    // Payload keys should already match the database schema.
    // Ensure offline drafts use the correct column names from the start.
    final monitoring = Map<String, dynamic>.from(payload['crop_monitoring']);
    final soil = Map<String, dynamic>.from(payload['soil_characteristics']);
    final irrigation = Map<String, dynamic>.from(payload['irrigation_management']);
    final nutrient = Map<String, dynamic>.from(payload['nutrient_management']);
    final protection = Map<String, dynamic>.from(payload['crop_protection']);
    final residual = Map<String, dynamic>.from(payload['residual_management']);
    
    translateKeys(monitoring);
    translateKeys(soil);
    translateKeys(irrigation);
    translateKeys(nutrient);
    translateKeys(protection);
    translateKeys(residual);

    // Apply specific defaults for residual section only
    residual['residue_type'] ??= 'N/A';
    residual['management_method'] ??= 'N/A';
    
    final imageRef = payload['image_reference'];



    final control = payload['control_methods'];
    final harvest = payload['harvest_information'];
    // residual is already handled/translated above


    // 1. Insert into crop_monitoring (Core table)
    // Note: Table names should be confirmed against the actual Supabase schema.
    // Assuming standard naming convention for this project.
    
    final observationResponse = await client.from('observations').insert({
      'client_uuid': payload['client_uuid'],
      'collector_id': user.id,
      'section_name': fieldIden['section_name'],
      'block_id': fieldIden['block_id'],
      'field_name': fieldIden['field_name'],
      'latitude': fieldIden['latitude'],
      'longitude': fieldIden['longitude'],
      'gps_accuracy': fieldIden['gps_accuracy'],
      'date_recorded': fieldIden['date_recorded'],
      'created_at': payload['created_at'],
    }).select().single();

    final String observationId = observationResponse['id'].toString();

    // 2. Insert related data into respective tables
    
    // B. Crop Information
    await client.from('crop_information').insert({
      'observation_id': observationId,
      ...cropInfo,
    });

    // C. Monitoring Details
    await client.from('crop_monitoring').insert({
      'observation_id': observationId,
      ...monitoring,
    });

    // D. Image References
    if (imageRef['images'] != null && (imageRef['images'] as List).isNotEmpty) {
      for (var img in imageRef['images']) {
        await client.from('images').insert({
          'observation_id': observationId,
          'image_url': img['image_url'],
          'storage_path': img['storage_path'],
          'taken_at': payload['created_at'], // or DateTime.now().toIso8601String()
          'uploaded_by': user.id,
        });
      }
    } else if (imageRef['image_urls'] != null && (imageRef['image_urls'] as List).isNotEmpty) {
      // Legacy fallback
      for (var url in imageRef['image_urls']) {
         await client.from('images').insert({
          'observation_id': observationId,
          'image_url': url,
          'uploaded_by': user.id,
        });
      }
    }

    // E. Soil Characteristics
    await client.from('soil_characteristics').insert({
      'observation_id': observationId,
      ...soil,
    });

    // F. Irrigation Management
    await client.from('irrigation_management').insert({
      'observation_id': observationId,
      ...irrigation,
    });

    // G. Nutrient Management
    await client.from('nutrient_management').insert({
      'observation_id': observationId,
      ...nutrient,
    });

    // H. Crop Protection
    await client.from('crop_protection').insert({
      'observation_id': observationId,
      ...protection,
    });

    // J. Control Methods
    await client.from('control_methods').insert({
      'observation_id': observationId,
      ...control,
    });

    // K. Harvest Information
    await client.from('harvest').insert({
      'observation_id': observationId,
      ...harvest,
    });

    // M. Residual Management
    await client.from('residual_management').insert({
      'observation_id': observationId,
      ...residual,
    });
  }

  // --- Fetch History ---

  Future<List<Map<String, dynamic>>> getRecentObservations() async {
    final user = client.auth.currentUser;
    if (user == null) return [];

    // Fetch observations for this user, including crop info for the list view
    // Ordering by date_recorded descending
    final response = await client
        .from('observations')
        .select('*, crop_information(*)')
        .eq('collector_id', user.id)
        .order('date_recorded', ascending: false)
        .limit(50); // Limit to last 50 for performance

    return List<Map<String, dynamic>>.from(response);
  }

  Future<Map<String, dynamic>> getObservationDetails(String observationId) async {
    // Fetch from all related tables to reconstruct the full payload
    // This matches the structure expected by ObservationDetailScreen
    
    final results = await Future.wait<dynamic>([
      client.from('observations').select().eq('id', observationId).maybeSingle(),
      client.from('crop_information').select().eq('observation_id', observationId).maybeSingle(),
      client.from('crop_monitoring').select().eq('observation_id', observationId).maybeSingle(),
      client.from('images').select().eq('observation_id', observationId),
      client.from('soil_characteristics').select().eq('observation_id', observationId).maybeSingle(),
      client.from('irrigation_management').select().eq('observation_id', observationId).maybeSingle(),
      client.from('nutrient_management').select().eq('observation_id', observationId).maybeSingle(),
      client.from('crop_protection').select().eq('observation_id', observationId).maybeSingle(),
      client.from('control_methods').select().eq('observation_id', observationId).maybeSingle(),
      client.from('harvest').select().eq('observation_id', observationId).maybeSingle(),
      client.from('residual_management').select().eq('observation_id', observationId).maybeSingle(),
    ]);

    final observation = results[0] as Map<String, dynamic>?;
    if (observation == null) throw Exception('Observation not found');

    final images = (results[3] as List).map((img) => img['image_url'].toString()).toList();

    return {
      'field_identification': {
        'section_name': observation['section_name'],
        'block_id': observation['block_id'],
        'field_name': observation['field_name'],
        'latitude': observation['latitude'],
        'longitude': observation['longitude'],
        'gps_accuracy': observation['gps_accuracy'],
        'date_recorded': observation['date_recorded'],
      },
      'crop_information': results[1],
      'crop_monitoring': results[2],
      'image_reference': {
        'image_urls': images,
      },
      'soil_characteristics': results[4],
      'irrigation_management': results[5],
      'nutrient_management': results[6],
      'crop_protection': results[7],
      'control_methods': results[8],
      'harvest_information': results[9],
      'residual_management': results[10],
      'client_uuid': observation['client_uuid'],
      'created_at': observation['created_at'],
    };
  }
}
