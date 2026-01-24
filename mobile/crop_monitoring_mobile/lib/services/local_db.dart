import 'dart:convert';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import 'package:path_provider/path_provider.dart';
import 'dart:io';

class LocalDB {
  static final LocalDB _instance = LocalDB._internal();
  factory LocalDB() => _instance;
  LocalDB._internal();

  static Database? _db;

  Future<Database> get db async {
    if (_db != null) return _db!;
    _db = await initDb();
    return _db!;
  }

  Future<Database> initDb() async {
    Directory documentsDirectory = await getApplicationDocumentsDirectory();
    String path = join(documentsDirectory.path, 'crop_monitoring.db');
    return await openDatabase(
      path,
      version: 3,
      onCreate: (Database db, int version) async {
        await db.execute('''
          CREATE TABLE observations(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            data TEXT,
            synced INTEGER DEFAULT 0
          )
        ''');
        await db.execute('''
          CREATE TABLE fields(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            data TEXT,
            synced INTEGER DEFAULT 0
          )
        ''');
        await db.execute('''
          CREATE TABLE drafts(
            key TEXT PRIMARY KEY,
            data TEXT
          )
        ''');
      },
      onUpgrade: (Database db, int oldVersion, int newVersion) async {
        if (oldVersion < 2) {
          await db.execute('''
            CREATE TABLE fields(
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              data TEXT,
              synced INTEGER DEFAULT 0
            )
          ''');
        }
        if (oldVersion < 3) {
          await db.execute('''
            CREATE TABLE drafts(
              key TEXT PRIMARY KEY,
              data TEXT
            )
          ''');
        }
      },
    );
  }

  // Insert observation
  Future<int> insertObservation(Map<String, dynamic> data) async {
    final dbClient = await db;
    return await dbClient.insert('observations', {
      'data': jsonEncode(data),
      'synced': 0,
    });
  }

  // Insert field
  Future<int> insertField(Map<String, dynamic> data) async {
    final dbClient = await db;
    return await dbClient.insert('fields', {
      'data': jsonEncode(data),
      'synced': 0,
    });
  }

  // Get unsynced observations
  Future<List<Map<String, dynamic>>> getUnsyncedObservations() async {
    final dbClient = await db;
    return await dbClient.query('observations', where: 'synced = 0');
  }

  // Get unsynced fields
  Future<List<Map<String, dynamic>>> getUnsyncedFields() async {
    final dbClient = await db;
    return await dbClient.query('fields', where: 'synced = 0');
  }

  // Get single observation by local ID
  Future<Map<String, dynamic>?> getObservationById(int id) async {
    final dbClient = await db;
    final List<Map<String, dynamic>> results = await dbClient.query(
      'observations',
      where: 'id = ?',
      whereArgs: [id],
    );
    if (results.isNotEmpty) {
      return results.first;
    }
    return null;
  }

  // Mark observation as synced
  Future<int> markAsSynced(int id) async {
    final dbClient = await db;
    return await dbClient.update('observations', {'synced': 1}, where: 'id = ?', whereArgs: [id]);
  }

  // Mark field as synced
  Future<int> markFieldAsSynced(int id) async {
    final dbClient = await db;
    return await dbClient.update('fields', {'synced': 1}, where: 'id = ?', whereArgs: [id]);
  }

  // Save draft
  Future<void> saveDraft(String key, Map<String, dynamic> data) async {
    final dbClient = await db;
    await dbClient.insert(
      'drafts',
      {'key': key, 'data': jsonEncode(data)},
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  // Get draft
  Future<Map<String, dynamic>?> getDraft(String key) async {
    final dbClient = await db;
    final List<Map<String, dynamic>> maps = await dbClient.query(
      'drafts',
      where: 'key = ?',
      whereArgs: [key],
    );
    if (maps.isNotEmpty) {
      return jsonDecode(maps.first['data']);
    }
    return null;
  }

  // Clear draft
  Future<void> clearDraft(String key) async {
    final dbClient = await db;
    await dbClient.delete(
      'drafts',
      where: 'key = ?',
      whereArgs: [key],
    );
  }

  // Clear all data (observations, fields, drafts)
  Future<void> clearAllData() async {
    final dbClient = await db;
    await dbClient.delete('observations');
    await dbClient.delete('fields');
    await dbClient.delete('drafts');
  }

  // --- Statistics Helpers ---

  Future<int> getTotalRecordsCount() async {
    final dbClient = await db;
    final obsCount = Sqflite.firstIntValue(await dbClient.rawQuery('SELECT COUNT(*) FROM observations')) ?? 0;
    final fieldsCount = Sqflite.firstIntValue(await dbClient.rawQuery('SELECT COUNT(*) FROM fields')) ?? 0;
    return obsCount + fieldsCount;
  }

  Future<int> getSyncedRecordsCount() async {
    final dbClient = await db;
    final obsCount = Sqflite.firstIntValue(await dbClient.rawQuery('SELECT COUNT(*) FROM observations WHERE synced = 1')) ?? 0;
    final fieldsCount = Sqflite.firstIntValue(await dbClient.rawQuery('SELECT COUNT(*) FROM fields WHERE synced = 1')) ?? 0;
    return obsCount + fieldsCount;
  }

  Future<int> getUnsyncedRecordsCount() async {
    final dbClient = await db;
    final obsCount = Sqflite.firstIntValue(await dbClient.rawQuery('SELECT COUNT(*) FROM observations WHERE synced = 0')) ?? 0;
    final fieldsCount = Sqflite.firstIntValue(await dbClient.rawQuery('SELECT COUNT(*) FROM fields WHERE synced = 0')) ?? 0;
    return obsCount + fieldsCount;
  }

  Future<double> getLocalStorageSizeMB() async {
    try {
      // images are stored in the app's document directory by the image picker
      // but since we keep paths in the DB, we should iterate over those or the whole directory
      // For simplicity and accuracy of "Crop Photos", we'll check the directory where picked images go.
      // ImagePicker usually puts them in cache.
      
      // Let's get the cache directory and check for images
      final cacheDir = await getTemporaryDirectory();
      int totalSize = 0;
      
      if (await cacheDir.exists()) {
        final List<FileSystemEntity> files = cacheDir.listSync(recursive: true);
        for (var file in files) {
          if (file is File) {
            final fileName = basename(file.path).toLowerCase();
            if (fileName.contains('image_picker') || fileName.endsWith('.jpg') || fileName.endsWith('.png') || fileName.endsWith('.jpeg')) {
              totalSize += await file.length();
            }
          }
        }
      }
      
      return totalSize / (1024 * 1024); // Convert to MB
    } catch (e) {
      print('Error calculating storage size: $e');
      return 0.0;
    }
  }
}
