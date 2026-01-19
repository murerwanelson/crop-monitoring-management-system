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
}
