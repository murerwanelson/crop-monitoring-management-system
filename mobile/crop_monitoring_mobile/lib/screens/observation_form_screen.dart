// import 'dart:convert'; // Removed unused import
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:image_picker/image_picker.dart';
import '../providers/sync_provider.dart';
import '../providers/location_provider.dart';
import '../providers/ui_provider.dart';
import '../services/local_db.dart';
import '../services/supabase_service.dart';
import '../models/observation_models.dart';
import '../widgets/shimmer_loading.dart';
import '../widgets/app_drawer.dart';
import '../utils/geo_utils.dart';

class ObservationFormScreen extends StatefulWidget {
  const ObservationFormScreen({super.key});

  @override
  State<ObservationFormScreen> createState() => _ObservationFormScreenState();
}

class _ObservationFormScreenState extends State<ObservationFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _localDb = LocalDB();
  final _picker = ImagePicker();
  final _pageController = PageController();
  int _currentPage = 0;
  bool _submitting = false;

  /* ================= SECTION A: FIELD ID ================= */
  final _sectionNameCtrl = TextEditingController();
  final _blockIdCtrl = TextEditingController(); // We'll keep this but the dropdown will set it
  final _fieldNameCtrl = TextEditingController();
  Position? _currentPosition;
  DateTime _dateRecorded = DateTime.now();

  List<BlockModel> _availableBlocks = [];
  BlockModel? _selectedBlock;
  bool _isLoadingBlocks = true;
  bool _isInsideBlock = false; // For validation status highlight

  /* ================= SECTION B: CROP INFO ================= */
  final _cropTypeCtrl = TextEditingController();
  final _ratoonNumberCtrl = TextEditingController(text: '0');
  final _varietyCtrl = TextEditingController();
  DateTime _plantingDate = DateTime.now();
  DateTime _expectedHarvestDate = DateTime.now().add(const Duration(days: 120));
  String _cropStage = 'Seedling';

  /* ================= SECTION C: MONITORING ================= */
  String _vigor = 'Good';
  final _canopyCoverCtrl = TextEditingController();
  String _stressType = 'None';
  final _monitoringRemarksCtrl = TextEditingController();

  /* ================= SECTION D: IMAGES ================= */
  final List<File> _images = [];

  /* ================= SECTION E: SOIL ================= */
  final _soilTypeCtrl = TextEditingController();
  final _soilTextureCtrl = TextEditingController();
  final _soilPhCtrl = TextEditingController(text: '7.0');
  final _organicMatterCtrl = TextEditingController(text: '0.0');
  final _drainageClassCtrl = TextEditingController();

  /* ================= SECTION F: IRRIGATION ================= */
  final _irrigationTypeCtrl = TextEditingController();
  DateTime _irrigationDate = DateTime.now();
  final _irrigationVolumeCtrl = TextEditingController(text: '0.0');
  final _soilMoisturePctCtrl = TextEditingController(text: '0.0');
  final _waterSourceTypeCtrl = TextEditingController();

  /* ================= SECTION G: NUTRIENT ================= */
  final _fertilizerTypeCtrl = TextEditingController();
  DateTime _applicationDate = DateTime.now();
  final _applicationRateCtrl = TextEditingController(text: '0.0');
  final _macronutrientNpkCtrl = TextEditingController();

  /* ================= SECTION H: PROTECTION ================= */
  final _weedTypeCtrl = TextEditingController();
  String _weedPressure = 'Low';
  final _pestTypeCtrl = TextEditingController();
  String _pestSeverity = 'Low';
  final _diseaseTypeCtrl = TextEditingController();
  String _diseaseSeverity = 'Low';
  final _protectionRemarksCtrl = TextEditingController();

  /* ================= SECTION J: CONTROL ================= */
  final _weedControlCtrl = TextEditingController();
  final _pestControlCtrl = TextEditingController();
  final _diseaseControlCtrl = TextEditingController();

  /* ================= SECTION K: HARVEST ================= */
  DateTime _harvestDate = DateTime.now();
  final _yieldCtrl = TextEditingController(text: '0.0');
  String _harvestMethod = 'Manual';

  /* ================= SECTION M: RESIDUAL ================= */
  final _residualOutcomeCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _initializeApp();
  }

  Future<void> _initializeApp() async {
    await _loadDraft();
    await _fetchBlocks();
    await _getLocation();
    _checkBlockProximity();
  }

  Future<void> _fetchBlocks() async {
    try {
      final blocksData = await _localDb.getAllBlocks();
      setState(() {
        _availableBlocks = blocksData.map((e) => BlockModel.fromMap(e)).toList();
        _isLoadingBlocks = false;
        
        // Match selected block if blockIdCtrl already has a value from draft
        if (_blockIdCtrl.text.isNotEmpty) {
          try {
            _selectedBlock = _availableBlocks.firstWhere((b) => b.blockId == _blockIdCtrl.text);
          } catch (_) {}
        }
      });
    } catch (e) {
      debugPrint('Error fetching blocks: $e');
      setState(() => _isLoadingBlocks = false);
    }
  }

  Future<void> _getLocation() async {
    if (!await Permission.location.request().isGranted) return;
    try {
      final pos = await Geolocator.getCurrentPosition(locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),);
      setState(() {
        _currentPosition = pos;
        _checkBlockProximity();
      });
      _saveDraft();
    } catch (e) {
      debugPrint('Error getting location: $e');
    }
  }

  void _checkBlockProximity() {
    if (_currentPosition == null || _selectedBlock == null || _selectedBlock!.geom == null) {
      setState(() => _isInsideBlock = false);
      return;
    }

    try {
      final inside = GeoUtils.isPointInPolygon(
        _currentPosition!.latitude, 
        _currentPosition!.longitude, 
        _selectedBlock!.geom
      );
      setState(() => _isInsideBlock = inside);
    } catch (e) {
      debugPrint('Error checking proximity: $e');
    }
  }

  Future<void> _saveDraft() async {
    final Map<String, dynamic> draft = {
      'section_name': _sectionNameCtrl.text,
      'block_id': _blockIdCtrl.text,
      'field_name': _fieldNameCtrl.text,
      'crop_type': _cropTypeCtrl.text,
      'ratoon_number': _ratoonNumberCtrl.text,
      'variety': _varietyCtrl.text,
      'planting_date': _plantingDate.toIso8601String(),
      'expected_harvest_date': _expectedHarvestDate.toIso8601String(),
      'crop_stage': _cropStage,
      'vigor': _vigor,
      'canopy_cover': _canopyCoverCtrl.text,
      'stress_type': _stressType,
      'remarks': _monitoringRemarksCtrl.text,
      'image_paths': _images.map((img) => img.path).toList(),
      'soil_type': _soilTypeCtrl.text,
      'soil_texture': _soilTextureCtrl.text,
      'soil_ph': _soilPhCtrl.text,
      'organic_matter': _organicMatterCtrl.text,
      'drainage_class': _drainageClassCtrl.text,
      'irrigation_type': _irrigationTypeCtrl.text,
      'irrigation_date': _irrigationDate.toIso8601String(),
      'irrigation_volume': _irrigationVolumeCtrl.text,
      'soil_moisture_percentage': _soilMoisturePctCtrl.text,
      'water_source': _waterSourceTypeCtrl.text,
      'fertilizer_type': _fertilizerTypeCtrl.text,
      'application_date': _applicationDate.toIso8601String(),
      'application_rate': _applicationRateCtrl.text,
      'npk_ratio': _macronutrientNpkCtrl.text,
      'weed_type': _weedTypeCtrl.text,
      'weed_level': _weedPressure,
      'pest_type': _pestTypeCtrl.text,
      'pest_severity': _pestSeverity,
      'disease_type': _diseaseTypeCtrl.text,
      'disease_severity': _diseaseSeverity,
      'protection_remarks': _protectionRemarksCtrl.text,
      'weed_control': _weedControlCtrl.text,
      'pest_control': _pestControlCtrl.text,
      'disease_control': _diseaseControlCtrl.text,
      'harvest_date': _harvestDate.toIso8601String(),
      'yield': _yieldCtrl.text,
      'harvest_method': _harvestMethod,
      'residual_outcome': _residualOutcomeCtrl.text,
      'current_page': _currentPage,
    };
    await _localDb.saveDraft('observation_form', draft);
  }

  Future<void> _loadDraft() async {
    final draft = await _localDb.getDraft('observation_form');
    if (draft != null) {
      setState(() {
        _sectionNameCtrl.text = draft['section_name'] ?? '';
        _blockIdCtrl.text = draft['block_id'] ?? '';
        _fieldNameCtrl.text = draft['field_name'] ?? '';
        _cropTypeCtrl.text = draft['crop_type'] ?? '';
        _ratoonNumberCtrl.text = draft['ratoon_number'] ?? '0';
        _varietyCtrl.text = draft['variety'] ?? '';
        _plantingDate = DateTime.parse(draft['planting_date']);
        _expectedHarvestDate = DateTime.parse(draft['expected_harvest_date']);
        _cropStage = draft['crop_stage'] ?? 'Seedling';
        _vigor = draft['vigor'] ?? 'Good';
        _canopyCoverCtrl.text = draft['canopy_cover'] ?? '';
        _stressType = draft['stress_type'] ?? 'None';
        _monitoringRemarksCtrl.text = draft['remarks'] ?? '';
        
        final paths = draft['image_paths'] as List<dynamic>? ?? [];
        for (var p in paths) {
          final file = File(p);
          // Check if file exists AND has content (is not empty)
          if (file.existsSync() && file.lengthSync() > 0) {
            _images.add(file);
          }
        }

        _soilTypeCtrl.text = draft['soil_type'] ?? '';
        _soilTextureCtrl.text = draft['soil_texture'] ?? '';
        _soilPhCtrl.text = draft['soil_ph'] ?? '7.0';
        _organicMatterCtrl.text = draft['organic_matter'] ?? '0.0';
        _drainageClassCtrl.text = draft['drainage_class'] ?? '';
        _irrigationTypeCtrl.text = draft['irrigation_type'] ?? '';
        _irrigationDate = DateTime.parse(draft['irrigation_date']);
        _irrigationVolumeCtrl.text = draft['irrigation_volume'] ?? '0.0';
        _soilMoisturePctCtrl.text = draft['soil_moisture'] ?? '0.0';
        _waterSourceTypeCtrl.text = draft['water_source'] ?? '';
        _fertilizerTypeCtrl.text = draft['fertilizer_type'] ?? '';
        _applicationDate = DateTime.parse(draft['application_date']);
        _applicationRateCtrl.text = draft['application_rate'] ?? '0.0';
        _macronutrientNpkCtrl.text = draft['npk_ratio'] ?? draft['macronutrient_npk'] ?? '';
        _weedTypeCtrl.text = draft['weed_type'] ?? '';
        _weedPressure = draft['weed_level'] ?? draft['weed_pressure'] ?? 'Low';
        _pestTypeCtrl.text = draft['pest_type'] ?? '';
        _pestSeverity = draft['pest_severity'] ?? 'Low';
        _diseaseTypeCtrl.text = draft['disease_type'] ?? '';
        _diseaseSeverity = draft['disease_severity'] ?? 'Low';
        _protectionRemarksCtrl.text = draft['protection_remarks'] ?? '';
        _weedControlCtrl.text = draft['weed_control'] ?? '';
        _pestControlCtrl.text = draft['pest_control'] ?? '';
        _diseaseControlCtrl.text = draft['disease_control'] ?? '';
        _harvestDate = DateTime.parse(draft['harvest_date']);
        _yieldCtrl.text = draft['yield'] ?? '0.0';
        _harvestMethod = draft['harvest_method'] ?? 'Manual';
        _residualOutcomeCtrl.text = draft['residual_outcome'] ?? '';
        _currentPage = draft['current_page'] ?? 0;
      });
      
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _pageController.jumpToPage(_currentPage);
      });
    }
  }

  bool _validateBusinessRules() {
    List<String> errors = [];

    // 1. Date Logic
    if (_harvestDate.isBefore(_plantingDate)) {
      errors.add('Harvest date cannot be before planting date.');
    }

    // 2. Irrigation Logic
    if (_irrigationTypeCtrl.text.isNotEmpty && (double.tryParse(_irrigationVolumeCtrl.text) ?? 0) <= 0) {
      errors.add('Please provide an irrigation volume if irrigation type is specified.');
    }

    // 3. Image Logic
    if (_images.isEmpty) {
      errors.add('At least one field photo is required for visual proof.');
    }

    if (errors.isNotEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(errors.first),
          backgroundColor: Colors.red,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return false;
    }
    return true;
  }

  Future<void> _pickImage(ImageSource source) async {
    final pickedFile = await _picker.pickImage(source: source);
    if (pickedFile != null) {
      final file = File(pickedFile.path);
      if (await file.length() > 0) {
        setState(() => _images.add(file));
      } else {
         if (mounted) {
           ScaffoldMessenger.of(context).showSnackBar(
             const SnackBar(content: Text('Error: Picked image is empty/corrupt.')),
           );
         }
      }
    }
  }

  void _nextPage() {
    if (_formKey.currentState!.validate()) {
      _saveDraft();
      _pageController.nextPage(duration: const Duration(milliseconds: 300), curve: Curves.easeInOut);
    }
  }
  void _prevPage() {
    _pageController.previousPage(duration: const Duration(milliseconds: 300), curve: Curves.easeInOut);
  }

  // Helper for validating and normalizing enums
  String _validateEnum(String field, String value, Map<String, String> mapping, List<String> allowed) {
    // If value is empty/null, and field is optional in DB, arguably we could allow it.
    // But here we deal with dropdowns that have specific values.
    if (value.isEmpty) return ''; // Assume empty strings are handled by other validations if required.

    // 1. Try to find a normalized match
    final normalized = mapping[value] ?? value.toLowerCase(); 

    // 2. Check strict allowance
    if (!allowed.contains(normalized)) {
      throw "Invalid value '$value' for field '$field'. Allowed values are: ${allowed.join(', ')}";
    }
    return normalized;
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (!_validateBusinessRules()) return;
    
    setState(() => _submitting = true);

    try {
      // --- STRICT ENUM VALIDATION & NORMALIZATION ---
      // Mappings: UI Value -> DB Value
      final stressMap = {
        'Water': 'water', 
        'Nutrient': 'nutrient', 
        'Pest': 'pest'
      };
      
      final methodMap = {
        'Manual': 'manual', 
        'Mechanized': 'mechanised'
      };

      final levelMap = {
        'Low': 'low', 
        'Medium': 'medium', 
        'High': 'high'
      };

      // Validate & Normalize
      final validStress = _validateEnum('stress_type', _stressType, stressMap, ['water', 'nutrient', 'pest']);
      final validHarvestMethod = _validateEnum('harvest_method', _harvestMethod, methodMap, ['manual', 'mechanised']);
      final validWeedPressure = _validateEnum('pressure_level', _weedPressure, levelMap, ['low', 'medium', 'high']);
      final validPestSeverity = _validateEnum('severity_level', _pestSeverity, levelMap, ['low', 'medium', 'high']);
      final validDiseaseSeverity = _validateEnum('severity_level', _diseaseSeverity, levelMap, ['low', 'medium', 'high']);
      
      // ----------------------------------------------

      final syncProvider = context.read<SyncProvider>();
      await syncProvider.checkUnsynced();
      final isOnline = syncProvider.isOnline;
      if (isOnline) {
        await syncProvider.startSync();
      }
      final supabase = SupabaseService();
      
      List<ObservationImage> observationImages = [];
      bool forceOffline = false;

      // 1. Image Handling
      if (isOnline) {
        for (var image in _images) {
          // If we already failed once, don't try subsequent images, just save paths
          if (forceOffline) {
            observationImages.add(ObservationImage(imageUrl: image.path));
            continue;
          }

          try {
            final res = await supabase.uploadImage('crop-monitoring-photos', 'observations', image);
            observationImages.add(ObservationImage(
              imageUrl: res['publicUrl']!,
              storagePath: res['fullPath']
            ));
          } catch (e) {
            debugPrint('Image upload failed: $e. Switching to offline mode.');
            forceOffline = true;
            observationImages.add(ObservationImage(imageUrl: image.path));
          }
        }
      } else {
        // Offline: Save local paths
        observationImages = _images.map((e) => ObservationImage(imageUrl: e.path)).toList();
      }

      // 2. Build Model
      final obs = ObservationModel(
        clientUuid: 'offline-${DateTime.now().millisecondsSinceEpoch}',
        fieldIden: FieldIdentification(
          sectionName: _sectionNameCtrl.text,
          blockId: _blockIdCtrl.text,
          fieldName: _fieldNameCtrl.text,
          latitude: _currentPosition?.latitude ?? 0,
          longitude: _currentPosition?.longitude ?? 0,
          gpsAccuracy: _currentPosition?.accuracy ?? 0,
          dateRecorded: _dateRecorded,
        ),
        cropInfo: CropInformation(
          cropType: _cropTypeCtrl.text,
          ratoonNumber: int.tryParse(_ratoonNumberCtrl.text) ?? 0,
          variety: _varietyCtrl.text,
          plantingDate: _plantingDate,
          expectedHarvestDate: _expectedHarvestDate,
          cropStage: _cropStage,
        ),
        monitoring: CropMonitoring(
          vigor: _vigor,
          canopyCover: double.tryParse(_canopyCoverCtrl.text) ?? 0.0,
          stressType: validStress,
          remarks: _monitoringRemarksCtrl.text,
        ),
        images: observationImages,
        soil: SoilCharacteristics(
          soilType: _soilTypeCtrl.text,
          soilTexture: _soilTextureCtrl.text,
          soilPh: double.tryParse(_soilPhCtrl.text) ?? 7.0,
          organicMatterContent: double.tryParse(_organicMatterCtrl.text) ?? 0.0,
          drainageClass: _drainageClassCtrl.text,
        ),
        irrigation: IrrigationManagement(
          irrigationType: _irrigationTypeCtrl.text,
          irrigationDate: _irrigationDate,
          irrigationVolume: double.tryParse(_irrigationVolumeCtrl.text) ?? 0.0,
          soilMoisturePercentage: double.tryParse(_soilMoisturePctCtrl.text) ?? 0.0,
          waterSourceType: _waterSourceTypeCtrl.text,
        ),
        nutrient: NutrientManagement(
          fertilizerType: _fertilizerTypeCtrl.text,
          applicationDate: _applicationDate,
          applicationRate: double.tryParse(_applicationRateCtrl.text) ?? 0.0,
          macronutrientNpk: _macronutrientNpkCtrl.text,
        ),
        protection: CropProtection(
          weedType: _weedTypeCtrl.text,
          weedPressure: validWeedPressure,
          pestType: _pestTypeCtrl.text,
          pestSeverity: validPestSeverity,
          diseaseType: _diseaseTypeCtrl.text,
          diseaseSeverity: validDiseaseSeverity,
          remarks: _protectionRemarksCtrl.text,
        ),
        control: ControlMethods(
          weedControl: _weedControlCtrl.text,
          pestControl: _pestControlCtrl.text,
          diseaseControl: _diseaseControlCtrl.text,
        ),
        harvest: HarvestInformation(
          harvestDate: _harvestDate,
          yieldAmount: double.tryParse(_yieldCtrl.text) ?? 0.0,
          harvestMethod: validHarvestMethod,
        ),
        residual: ResidualManagement(
          residueType: 'N/A', // Default or could add more UI fields later
          managementMethod: 'N/A',
          remarks: _residualOutcomeCtrl.text,
        ),
        createdAt: DateTime.now(),
      );

      // 3. Save
      // If we are online AND no images failed, try to save to Supabase
      if (isOnline && !forceOffline) {
        try {
          await supabase.saveObservation(obs.toMap());
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
              content: Text('Synced to Supabase!'),
              backgroundColor: Color(0xFF2E7D32),
            ));
          }
        } catch (e) {
          debugPrint('Online save failed: $e. Falling back to local.');
          await _localDb.insertObservation(obs.toMap());
          if (mounted) {
             ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
              content: Text('Network unstable. Saved locally for later sync.'),
              backgroundColor: Colors.orange,
            ));
          }
        }
      } else {
        // Offline or Partial Failure flow
        await _localDb.insertObservation(obs.toMap());
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(forceOffline 
                ? 'Upload failed. Saved locally for later sync.' 
                : 'Saved locally (Offline)'),
            backgroundColor: Colors.orange,
          ));
        }
      }
      
      await _localDb.clearDraft('observation_form');
      if (mounted) Navigator.pop(context);

    } catch (e) {
      // This catch block handles unexpected errors during local save or others
      debugPrint('Critical Submission Error: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error saving data: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    // final syncProvider = context.watch<SyncProvider>();
    context.watch<UIProvider>();

    return Scaffold(
      backgroundColor: const Color(0xFFF9FBF9),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Observation Entry',
              style: TextStyle(
                color: Color(0xFF1B5E20),
                fontWeight: FontWeight.bold,
                fontSize: 18,
              ),
            ),
            Text(
              'Step ${_currentPage + 1} of 11',
              style: const TextStyle(
                color: Color(0xFF9E9E9E),
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
        actions: [
          Center(
            child: Padding(
              padding: const EdgeInsets.only(right: 16),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFE8F5E9),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '${((_currentPage + 1) / 11 * 100).toInt()}%',
                  style: const TextStyle(
                    color: Color(0xFF2E7D32),
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
              ),
            ),
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(6),
          child: LinearProgressIndicator(
            value: (_currentPage + 1) / 11,
            backgroundColor: const Color(0xFFE8F5E9),
            valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF2E7D32)),
          ),
        ),
      ),
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Colors.white,
              const Color(0xFFF1F8E9),
            ],
          ),
        ),
        child: Form(
          key: _formKey,
          child: PageView(
            controller: _pageController,
            physics: const NeverScrollableScrollPhysics(),
            onPageChanged: (i) => setState(() => _currentPage = i),
            children: [
            _buildPage(
              'A. Field Identification', 
              Icons.location_on_outlined, 
              'Capture the exact location and identifying details for the field and block being monitored.',
              [
                _buildStyledTextField(
                  label: 'Section Name',
                  controller: _sectionNameCtrl,
                  icon: Icons.map_outlined,
                  required: true,
                ),
                _isLoadingBlocks 
                  ? const Padding(
                      padding: EdgeInsets.only(bottom: 20),
                      child: LinearProgressIndicator(color: Color(0xFF2E7D32)),
                    )
                  : _buildStyledBlockDropdown(
                      label: 'Block ID',
                      icon: Icons.grid_view_rounded,
                      options: _availableBlocks,
                      current: _selectedBlock,
                      required: true,
                      onChanged: (v) {
                        setState(() {
                          _selectedBlock = v;
                          _blockIdCtrl.text = v?.blockId ?? '';
                          _checkBlockProximity();
                        });
                        _saveDraft();
                      },
                    ),
                _buildStyledTextField(
                  label: 'Field Name',
                  controller: _fieldNameCtrl,
                  icon: Icons.agriculture_rounded,
                  required: true,
                ),
                const SizedBox(height: 20),
                _buildCard(
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: const Color(0xFFE8F5E9),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.gps_fixed, color: Color(0xFF2E7D32), size: 20),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  _currentPosition == null ? 'Acquiring GPS...' : (_selectedBlock == null ? 'Location Captured' : (_isInsideBlock ? 'Validated Inside Block' : 'Outside Block Boundary')),
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold, 
                                    color: _currentPosition == null ? const Color(0xFF757575) : (_selectedBlock != null && !_isInsideBlock ? Colors.red : const Color(0xFF2E7D32))
                                  ),
                                ),
                                if (_currentPosition != null)
                                  Text(
                                    'Acc: ${_currentPosition!.accuracy.toStringAsFixed(1)}m | ${_isInsideBlock ? "Verified Positioning" : "Accuracy Check Required"}',
                                    style: TextStyle(fontSize: 12, color: _isInsideBlock ? const Color(0xFF757575) : Colors.red),
                                  ),
                              ],
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.refresh, color: Color(0xFF2E7D32)),
                            onPressed: _getLocation,
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
            _buildPage(
              'B. Crop Information', 
              Icons.eco_outlined, 
              'Record the crop variety, planting dates, and its current growth milestone.',
              [
                _buildStyledTextField(
                  label: 'Crop Type',
                  controller: _cropTypeCtrl,
                  icon: Icons.grass_rounded,
                  required: true,
                ),
                _buildStyledTextField(
                  label: 'Ratoon Number',
                  controller: _ratoonNumberCtrl,
                  icon: Icons.repeat_rounded,
                  isNumber: true,
                ),
                _buildStyledTextField(
                  label: 'Variety',
                  controller: _varietyCtrl,
                  icon: Icons.category_outlined,
                  required: true,
                ),
                _buildStyledDatePicker(
                  label: 'Planting Date',
                  current: _plantingDate,
                  onChanged: (d) => setState(() => _plantingDate = d),
                ),
                _buildStyledDatePicker(
                  label: 'Expected Harvest',
                  current: _expectedHarvestDate,
                  onChanged: (d) => setState(() => _expectedHarvestDate = d),
                ),
                _buildStyledDropdown(
                  label: 'Crop Stage',
                  icon: Icons.auto_graph_rounded,
                  options: ['Seedling', 'Vegetative', 'Flowering', 'Maturity', 'Harvested'],
                  current: _cropStage,
                  onChanged: (v) => setState(() => _cropStage = v!),
                ),
              ],
            ),
            _buildPage(
              'C. Crop Monitoring', 
              Icons.monitor_heart_outlined, 
              'Evaluate the health, vigor, and overall appearance of the crop.',
              [
                _buildStyledDropdown(
                  label: 'Crop Vigor',
                  icon: Icons.bolt_rounded,
                  options: ['Excellent', 'Good', 'Fair', 'Poor'],
                  current: _vigor,
                  onChanged: (v) => setState(() => _vigor = v!),
                ),
                _buildStyledTextField(
                  label: 'Canopy Cover (%)',
                  controller: _canopyCoverCtrl,
                  icon: Icons.pie_chart_outline_rounded,
                  isNumber: true,
                ),
                _buildStyledDropdown(
                  label: 'Stress Type',
                  icon: Icons.warning_amber_rounded,
                  options: ['None', 'Water', 'Nutrient', 'Pest', 'Disease'],
                  current: _stressType,
                  onChanged: (v) => setState(() => _stressType = v!),
                ),
                _buildStyledTextField(
                  label: 'General Remarks',
                  controller: _monitoringRemarksCtrl,
                  icon: Icons.notes_rounded,
                  maxLines: 3,
                ),
              ],
            ),
            _buildPage(
              'D. Image Reference', 
              Icons.camera_alt_outlined, 
              'Provide visual proof of the field conditions. A minimum of one photo is required.',
              [
                const Text(
                  'Visual Proof',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF1B5E20)),
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    _buildMediaAction(
                      icon: Icons.camera_alt_rounded,
                      label: 'Take Photo',
                      onTap: () => _pickImage(ImageSource.camera),
                    ),
                    _buildMediaAction(
                      icon: Icons.image_rounded,
                      label: 'Gallery',
                      onTap: () => _pickImage(ImageSource.gallery),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                if (_images.isEmpty)
                  _buildCard(
                    child: const Center(
                      child: Padding(
                        padding: EdgeInsets.symmetric(vertical: 20),
                        child: Column(
                          children: [
                            Icon(Icons.add_photo_alternate_outlined, size: 48, color: Color(0xFF9E9E9E)),
                            Text('No images captured', style: TextStyle(color: Color(0xFF9E9E9E))),
                          ],
                        ),
                      ),
                    ),
                  )
                else
                  GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 3,
                      crossAxisSpacing: 10,
                      mainAxisSpacing: 10,
                    ),
                    itemCount: _images.length,
                    itemBuilder: (ctx, idx) => Stack(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: Image.file(
                            _images[idx], 
                            width: double.infinity, 
                            height: double.infinity, 
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) {
                              return Container(
                                color: Colors.grey[200],
                                child: const Center(
                                  child: Icon(Icons.broken_image, color: Colors.grey),
                                ),
                              );
                            },
                          ),
                        ),
                        Positioned(
                          top: 4,
                          right: 4,
                          child: GestureDetector(
                            onTap: () => setState(() => _images.removeAt(idx)),
                            child: Container(
                              padding: const EdgeInsets.all(4),
                              decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                              child: const Icon(Icons.close, size: 14, color: Colors.red),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
            _buildPage(
              'E. Soil Characteristics', 
              Icons.terrain_outlined, 
              'Details about the chemical and physical state of the soil.',
              [
                _buildStyledTextField(label: 'Soil Type', controller: _soilTypeCtrl, icon: Icons.landscape_rounded),
                _buildStyledTextField(label: 'Soil Texture', controller: _soilTextureCtrl, icon: Icons.texture_rounded),
                _buildStyledTextField(label: 'Soil pH', controller: _soilPhCtrl, icon: Icons.science_outlined, isNumber: true),
                _buildStyledTextField(label: 'Organic Matter (%)', controller: _organicMatterCtrl, icon: Icons.compost_rounded, isNumber: true),
                _buildStyledTextField(label: 'Drainage Class', controller: _drainageClassCtrl, icon: Icons.water_drop_outlined),
              ],
            ),
            _buildPage(
              'F. Irrigation Management', 
              Icons.water_outlined, 
              'Track water application, recent volumes, and existing soil moisture.',
              [
                _buildStyledTextField(label: 'Irrigation Type', controller: _irrigationTypeCtrl, icon: Icons.shower_outlined),
                _buildStyledDatePicker(label: 'Irrigation Date', current: _irrigationDate, onChanged: (d) => setState(() => _irrigationDate = d)),
                _buildStyledTextField(label: 'Volume (m³)', controller: _irrigationVolumeCtrl, icon: Icons.water_rounded, isNumber: true),
                _buildStyledTextField(label: 'Soil Moisture (%)', controller: _soilMoisturePctCtrl, icon: Icons.opacity_rounded, isNumber: true),
                _buildStyledTextField(label: 'Water Source', controller: _waterSourceTypeCtrl, icon: Icons.pool_rounded),
              ],
            ),
            _buildPage(
              'G. Nutrient Management', 
              Icons.science_outlined, 
              'Details on fertilizer applications and nutrient balance.',
              [
                _buildStyledTextField(label: 'Fertilizer Type', controller: _fertilizerTypeCtrl, icon: Icons.medication_outlined),
                _buildStyledDatePicker(label: 'Application Date', current: _applicationDate, onChanged: (d) => setState(() => _applicationDate = d)),
                _buildStyledTextField(label: 'Rate (kg/ha)', controller: _applicationRateCtrl, icon: Icons.scale_rounded, isNumber: true),
                _buildStyledTextField(label: 'Macronutrient (NPK)', controller: _macronutrientNpkCtrl, icon: Icons.biotech_outlined),
              ],
            ),
            _buildPage(
              'H. Crop Protection', 
              Icons.verified_user_outlined, 
              'Identify any weed, pest, or disease pressures currently present.',
              [
                _buildStyledTextField(label: 'Weed Type', controller: _weedTypeCtrl, icon: Icons.warning_amber_rounded),
                _buildStyledDropdown(label: 'Weed Pressure', icon: Icons.expand_more, options: ['Low', 'Medium', 'High'], current: _weedPressure, onChanged: (v) => setState(() => _weedPressure = v!)),
                _buildStyledTextField(label: 'Pest Type', controller: _pestTypeCtrl, icon: Icons.bug_report_outlined),
                _buildStyledDropdown(label: 'Pest Severity', icon: Icons.expand_more, options: ['Low', 'Medium', 'High'], current: _pestSeverity, onChanged: (v) => setState(() => _pestSeverity = v!)),
                _buildStyledTextField(label: 'Disease Type', controller: _diseaseTypeCtrl, icon: Icons.coronavirus_outlined),
                _buildStyledDropdown(label: 'Disease Severity', icon: Icons.expand_more, options: ['Low', 'Medium', 'High'], current: _diseaseSeverity, onChanged: (v) => setState(() => _diseaseSeverity = v!)),
              ],
            ),
            _buildPage(
              'J. Control Methods', 
              Icons.build_circle_outlined, 
              'Actions taken to manage threats and maintain crop health.',
              [
                _buildStyledTextField(label: 'Weed Control', controller: _weedControlCtrl, icon: Icons.cleaning_services_rounded),
                _buildStyledTextField(label: 'Pest Control', controller: _pestControlCtrl, icon: Icons.security_rounded),
                _buildStyledTextField(label: 'Disease Control', controller: _diseaseControlCtrl, icon: Icons.health_and_safety_rounded),
              ],
            ),
            _buildPage(
              'K. Harvest Information', 
              Icons.shopping_basket_outlined, 
              'Final recording of yield and methods (if harvest is occurring).',
              [
                _buildStyledDatePicker(label: 'Harvest Date', current: _harvestDate, onChanged: (d) => setState(() => _harvestDate = d)),
                _buildStyledTextField(label: 'Yield (tons/ha)', controller: _yieldCtrl, icon: Icons.assessment_outlined, isNumber: true),
                _buildStyledDropdown(label: 'Harvest Method', icon: Icons.settings_rounded, options: ['Manual', 'Mechanized'], current: _harvestMethod, onChanged: (v) => setState(() => _harvestMethod = v!)),
              ],
            ),
            _buildPage(
              'M. Residual Management', 
              Icons.recycling_outlined, 
              'Overall outcome and final notes before completing the report.',
              [
                _buildStyledTextField(label: 'Outcome / Final Remarks', controller: _residualOutcomeCtrl, icon: Icons.history_edu_rounded, maxLines: 5),
                const SizedBox(height: 32),
                _submitting 
                  ? const Center(child: CircularProgressIndicator(color: Color(0xFF2E7D32)))
                  : SizedBox(
                      width: double.infinity,
                      height: 56,
                      child: ElevatedButton(
                        onPressed: _submit,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF2E7D32),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
                          elevation: 0,
                        ),
                        child: const Text('Submit Full Report', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                      ),
                    ),
              ],
            ),
            ],
          ),
        ),
      ),
      bottomNavigationBar: _currentPage < 10 ? Container(
        height: 80,
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 10,
              offset: const Offset(0, -5),
            ),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            if (_currentPage > 0) 
              TextButton.icon(
                onPressed: _prevPage, 
                icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 16),
                label: const Text('Previous'),
                style: TextButton.styleFrom(foregroundColor: const Color(0xFF757575)),
              )
            else
              const SizedBox.shrink(),
            SizedBox(
              width: 140,
              height: 48,
              child: ElevatedButton(
                onPressed: _nextPage, 
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF2E7D32),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  elevation: 0,
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text('Next', style: TextStyle(fontWeight: FontWeight.bold)),
                    SizedBox(width: 8),
                    Icon(Icons.arrow_forward_ios_rounded, size: 16),
                  ],
                ),
              ),
            ),
          ],
        ),
      ) : null,
    );
  }

  Widget _buildPage(String title, IconData icon, String description, List<Widget> children) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(24, 24, 24, 40),
      children: [
        Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFE8F5E9),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: const Color(0xFF2E7D32), size: 24),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'SECTION',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1.2,
                      color: Color(0xFF9E9E9E),
                    ),
                  ),
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF1B5E20),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Text(
          description,
          style: const TextStyle(
            fontSize: 13,
            color: Color(0xFF757575),
            height: 1.4,
            fontStyle: FontStyle.italic,
          ),
        ),
        const SizedBox(height: 12),
        const Divider(color: Color(0xFFE0E0E0)),
        const SizedBox(height: 24),
        ...children,
      ],
    );
  }

  Widget _buildStyledTextField({
    required String label,
    required TextEditingController controller,
    required IconData icon,
    bool required = false,
    bool isNumber = false,
    int maxLines = 1,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(left: 4, bottom: 8),
            child: Text(
              label + (required ? ' *' : ''),
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: Color(0xFF616161),
              ),
            ),
          ),
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(15),
              border: Border.all(color: const Color(0xFF2E7D32).withValues(alpha: 0.3), width: 1.2),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.02),
                  blurRadius: 5,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: TextFormField(
              controller: controller,
              maxLines: maxLines,
              keyboardType: isNumber ? TextInputType.number : TextInputType.text,
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.normal),
              decoration: InputDecoration(
                prefixIcon: Icon(icon, color: const Color(0xFF2E7D32), size: 20),
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                hintText: 'Enter $label',
                hintStyle: const TextStyle(color: Color(0xFFBDBDBD), fontSize: 13),
              ),
              validator: required ? (v) => v == null || v.isEmpty ? 'Required' : null : null,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStyledBlockDropdown({
    required String label,
    required IconData icon,
    required List<BlockModel> options,
    required BlockModel? current,
    required ValueChanged<BlockModel?> onChanged,
    bool required = false,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(left: 4, bottom: 8),
            child: Text(
              label + (required ? ' *' : ''),
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: Color(0xFF616161),
              ),
            ),
          ),
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(15),
              border: Border.all(color: const Color(0xFF2E7D32).withValues(alpha: 0.3), width: 1.2),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: DropdownButtonHideUnderline(
              child: DropdownButtonFormField<BlockModel>(
                value: current,
                icon: const Icon(Icons.expand_more_rounded, color: Color(0xFF2E7D32)),
                decoration: InputDecoration(
                  icon: Icon(icon, color: const Color(0xFF2E7D32), size: 20),
                  border: InputBorder.none,
                ),
                items: options.map((b) => DropdownMenuItem(
                  value: b, 
                  child: Text("${b.blockId}${b.name != null ? ' - ${b.name}' : ''}", style: const TextStyle(fontSize: 14))
                )).toList(),
                onChanged: onChanged,
                validator: required ? (v) => v == null ? 'Required' : null : null,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStyledDropdown({
    required String label,
    required IconData icon,
    required List<String> options,
    required String current,
    required ValueChanged<String?> onChanged,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(left: 4, bottom: 8),
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: Color(0xFF616161),
              ),
            ),
          ),
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(15),
              border: Border.all(color: const Color(0xFF2E7D32).withValues(alpha: 0.3), width: 1.2),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: DropdownButtonHideUnderline(
              child: DropdownButtonFormField<String>(
                value: current,
                icon: const Icon(Icons.expand_more_rounded, color: Color(0xFF2E7D32)),
                decoration: InputDecoration(
                  icon: Icon(icon, color: const Color(0xFF2E7D32), size: 20),
                  border: InputBorder.none,
                ),
                items: options.map((o) => DropdownMenuItem(value: o, child: Text(o, style: const TextStyle(fontSize: 14)))).toList(),
                onChanged: onChanged,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStyledDatePicker({
    required String label,
    required DateTime current,
    required ValueChanged<DateTime> onChanged,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(left: 4, bottom: 8),
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: Color(0xFF616161),
              ),
            ),
          ),
          InkWell(
            onTap: () async {
              final d = await showDatePicker(
                context: context, 
                initialDate: current, 
                firstDate: DateTime(2020), 
                lastDate: DateTime(2030),
                builder: (context, child) => Theme(
                  data: Theme.of(context).copyWith(
                    colorScheme: const ColorScheme.light(
                      primary: Color(0xFF2E7D32),
                      onPrimary: Colors.white,
                      onSurface: Color(0xFF1B5E20),
                    ),
                  ),
                  child: child!,
                ),
              );
              if (d != null) onChanged(d);
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(15),
                border: Border.all(color: const Color(0xFF2E7D32).withValues(alpha: 0.3), width: 1.2),
              ),
              child: Row(
                children: [
                  const Icon(Icons.calendar_month_outlined, color: Color(0xFF2E7D32), size: 20),
                  const SizedBox(width: 12),
                  Text(
                    "${current.day}/${current.month}/${current.year}",
                    style: const TextStyle(fontSize: 15),
                  ),
                  const Spacer(),
                  const Icon(Icons.chevron_right_rounded, color: Color(0xFFBDBDBD)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCard({required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFF2E7D32).withValues(alpha: 0.4), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 15,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: child,
    );
  }

  Widget _buildMediaAction({required IconData icon, required String label, required VoidCallback onTap}) {
    return InkWell(
      onTap: onTap,
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFFE8F5E9),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: const Color(0xFF2E7D32), size: 28),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF2E7D32)),
          ),
        ],
      ),
    );
  }
}
