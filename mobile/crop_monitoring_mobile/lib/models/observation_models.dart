// import 'dart:convert'; // Removed unused

class ObservationImage {
  final String imageUrl;
  final String? storagePath;

  ObservationImage({required this.imageUrl, this.storagePath});

  Map<String, dynamic> toMap() => {
    'image_url': imageUrl,
    if (storagePath != null) 'storage_path': storagePath,
  };

  factory ObservationImage.fromMap(dynamic map) {
    if (map is String) {
      return ObservationImage(imageUrl: map);
    }
    return ObservationImage(
      imageUrl: map['image_url'] ?? '',
      storagePath: map['storage_path'],
    );
  }
}

class ObservationModel {
  final String? id;
  final String? clientUuid;
  final FieldIdentification fieldIden;
  final CropInformation cropInfo;
  final CropMonitoring monitoring;
  final List<ObservationImage> images;
  final SoilCharacteristics soil;
  final IrrigationManagement irrigation;
  final NutrientManagement nutrient;
  final CropProtection protection;
  final ControlMethods control;
  final HarvestInformation harvest;
  final ResidualManagement residual;
  final DateTime createdAt;

  ObservationModel({
    this.id,
    this.clientUuid,
    required this.fieldIden,
    required this.cropInfo,
    required this.monitoring,
    required this.images,
    required this.soil,
    required this.irrigation,
    required this.nutrient,
    required this.protection,
    required this.control,
    required this.harvest,
    required this.residual,
    required this.createdAt,
  });

  Map<String, dynamic> toMap() {
    return {
      if (id != null) 'id': id,
      'client_uuid': clientUuid,
      'field_identification': fieldIden.toMap(),
      'crop_information': cropInfo.toMap(),
      'crop_monitoring': monitoring.toMap(),
      'image_reference': {'images': images.map((e) => e.toMap()).toList()},
      'soil_characteristics': soil.toMap(),
      'irrigation_management': irrigation.toMap(),
      'nutrient_management': nutrient.toMap(),
      'crop_protection': protection.toMap(),
      'control_methods': control.toMap(),
      'harvest_information': harvest.toMap(),
      'residual_management': residual.toMap(),
      'created_at': createdAt.toIso8601String(),
    };
  }

  factory ObservationModel.fromMap(Map<String, dynamic> map) {
    var imgs = <ObservationImage>[];
    if (map['image_reference'] != null) {
      if (map['image_reference']['images'] != null) {
        imgs = (map['image_reference']['images'] as List).map((e) => ObservationImage.fromMap(e)).toList();
      } else if (map['image_reference']['image_urls'] != null) {
        // Fallback for migration/legacy
        imgs = (map['image_reference']['image_urls'] as List).map((e) => ObservationImage(imageUrl: e.toString())).toList();
      }
    }

    return ObservationModel(
      id: map['id']?.toString(),
      clientUuid: map['client_uuid'],
      fieldIden: FieldIdentification.fromMap(map['field_identification'] ?? {}),
      cropInfo: CropInformation.fromMap(map['crop_information'] ?? {}),
      monitoring: CropMonitoring.fromMap(map['crop_monitoring'] ?? {}),
      images: imgs,
      soil: SoilCharacteristics.fromMap(map['soil_characteristics'] ?? {}),
      irrigation: IrrigationManagement.fromMap(map['irrigation_management'] ?? {}),
      nutrient: NutrientManagement.fromMap(map['nutrient_management'] ?? {}),
      protection: CropProtection.fromMap(map['crop_protection'] ?? {}),
      control: ControlMethods.fromMap(map['control_methods'] ?? {}),
      harvest: HarvestInformation.fromMap(map['harvest_information'] ?? {}),
      residual: ResidualManagement.fromMap(map['residual_management'] ?? {}),
      createdAt: DateTime.parse(map['created_at'] ?? DateTime.now().toIso8601String()),
    );
  }
}

class FieldIdentification {
  final String sectionName;
  final String blockId;
  final String fieldName;
  final double latitude;
  final double longitude;
  final double gpsAccuracy;
  final DateTime dateRecorded;

  FieldIdentification({
    required this.sectionName,
    required this.blockId,
    required this.fieldName,
    required this.latitude,
    required this.longitude,
    required this.gpsAccuracy,
    required this.dateRecorded,
  });

  Map<String, dynamic> toMap() => {
    'section_name': sectionName,
    'block_id': blockId,
    'field_name': fieldName,
    'latitude': latitude,
    'longitude': longitude,
    'gps_accuracy': gpsAccuracy,
    'date_recorded': dateRecorded.toIso8601String(),
  };

  factory FieldIdentification.fromMap(Map<String, dynamic> map) => FieldIdentification(
    sectionName: map['section_name'] ?? '',
    blockId: map['block_id'] ?? '',
    fieldName: map['field_name'] ?? '',
    latitude: (map['latitude'] ?? 0).toDouble(),
    longitude: (map['longitude'] ?? 0).toDouble(),
    gpsAccuracy: (map['gps_accuracy'] ?? 0).toDouble(),
    dateRecorded: DateTime.parse(map['date_recorded'] ?? DateTime.now().toIso8601String()),
  );
}

class CropInformation {
  final String cropType;
  final int ratoonNumber;
  final String variety;
  final DateTime plantingDate;
  final DateTime expectedHarvestDate;
  final String cropStage;

  CropInformation({
    required this.cropType,
    required this.ratoonNumber,
    required this.variety,
    required this.plantingDate,
    required this.expectedHarvestDate,
    required this.cropStage,
  });

  Map<String, dynamic> toMap() => {
    'crop_type': cropType,
    'ratoon_number': ratoonNumber,
    'variety': variety,
    'planting_date': plantingDate.toIso8601String(),
    'expected_harvest_date': expectedHarvestDate.toIso8601String(),
    'crop_stage': cropStage,
  };

  factory CropInformation.fromMap(Map<String, dynamic> map) => CropInformation(
    cropType: map['crop_type'] ?? '',
    ratoonNumber: map['ratoon_number'] ?? 0,
    variety: map['variety'] ?? '',
    plantingDate: DateTime.parse(map['planting_date'] ?? DateTime.now().toIso8601String()),
    expectedHarvestDate: DateTime.parse(map['expected_harvest_date'] ?? DateTime.now().toIso8601String()),
    cropStage: map['crop_stage'] ?? '',
  );
}

class CropMonitoring {
  final String vigor;
  final double canopyCover;
  final String stressType; // dropdown: water / nutrient / pest
  final String remarks;

  CropMonitoring({
    required this.vigor,
    required this.canopyCover,
    required this.stressType,
    required this.remarks,
  });

  Map<String, dynamic> toMap() => {
    'crop_vigor': vigor,
    'canopy_cover': canopyCover,
    'stress': stressType,
    'remarks': remarks,
  };

  factory CropMonitoring.fromMap(Map<String, dynamic> map) => CropMonitoring(
    vigor: map['crop_vigor'] ?? 'Good',
    canopyCover: (map['canopy_cover'] ?? 0).toDouble(),
    stressType: map['stress'] ?? 'None',
    remarks: map['remarks'] ?? '',
  );
}

class SoilCharacteristics {
  final String soilType;
  final String soilTexture;
  final double soilPh;
  final double organicMatterContent;
  final String drainageClass;

  SoilCharacteristics({
    required this.soilType,
    required this.soilTexture,
    required this.soilPh,
    required this.organicMatterContent,
    required this.drainageClass,
  });

  Map<String, dynamic> toMap() => {
    'soil_type': soilType,
    'soil_texture': soilTexture,
    'soil_ph': soilPh,
    'organic_matter': organicMatterContent,
    'drainage_class': drainageClass,
  };

  factory SoilCharacteristics.fromMap(Map<String, dynamic> map) => SoilCharacteristics(
    soilType: map['soil_type'] ?? '',
    soilTexture: map['soil_texture'] ?? '',
    soilPh: (map['soil_ph'] ?? 7.0).toDouble(),
    organicMatterContent: (map['organic_matter'] ?? map['organic_matter_content'] ?? 0).toDouble(),
    drainageClass: map['drainage_class'] ?? '',
  );
}

class IrrigationManagement {
  final String irrigationType;
  final DateTime irrigationDate;
  final double irrigationVolume;
  final double soilMoisturePercentage;
  final String waterSourceType;

  IrrigationManagement({
    required this.irrigationType,
    required this.irrigationDate,
    required this.irrigationVolume,
    required this.soilMoisturePercentage,
    required this.waterSourceType,
  });

  Map<String, dynamic> toMap() => {
    'irrigation_type': irrigationType,
    'irrigation_date': irrigationDate.toIso8601String(),
    'irrigation_volume': irrigationVolume,
    'soil_moisture_percentage': soilMoisturePercentage,
    'water_source': waterSourceType,
  };

  factory IrrigationManagement.fromMap(Map<String, dynamic> map) => IrrigationManagement(
    irrigationType: map['irrigation_type'] ?? '',
    irrigationDate: DateTime.parse(map['irrigation_date'] ?? DateTime.now().toIso8601String()),
    irrigationVolume: (map['irrigation_volume'] ?? 0).toDouble(),
    soilMoisturePercentage: (map['soil_moisture_percentage'] ?? map['soil_moisture'] ?? 0).toDouble(),
    waterSourceType: map['water_source'] ?? map['water_source_type'] ?? '',
  );
}

class NutrientManagement {
  final String fertilizerType;
  final DateTime applicationDate;
  final double applicationRate;
  final String macronutrientNpk;

  NutrientManagement({
    required this.fertilizerType,
    required this.applicationDate,
    required this.applicationRate,
    required this.macronutrientNpk,
  });

  Map<String, dynamic> toMap() => {
    'fertilizer_type': fertilizerType,
    'application_date': applicationDate.toIso8601String(),
    'application_rate': applicationRate,
    'npk_ratio': macronutrientNpk,
  };

  factory NutrientManagement.fromMap(Map<String, dynamic> map) => NutrientManagement(
    fertilizerType: map['fertilizer_type'] ?? '',
    applicationDate: DateTime.parse(map['application_date'] ?? DateTime.now().toIso8601String()),
    applicationRate: (map['application_rate'] ?? 0).toDouble(),
    macronutrientNpk: map['npk_ratio'] ?? map['macronutrient_npk'] ?? '',
  );
}

class CropProtection {
  final String weedType;
  final String weedPressure; // dropdown: low / medium / high
  final String pestType;
  final String pestSeverity; // dropdown
  final String diseaseType;
  final String diseaseSeverity; // dropdown
  final String remarks;

  CropProtection({
    required this.weedType,
    required this.weedPressure,
    required this.pestType,
    required this.pestSeverity,
    required this.diseaseType,
    required this.diseaseSeverity,
    required this.remarks,
  });

  Map<String, dynamic> toMap() => {
    'weed_type': weedType,
    'weed_level': weedPressure,
    'pest_type': pestType,
    'pest_severity': pestSeverity,
    'disease_type': diseaseType,
    'disease_severity': diseaseSeverity,
    'remarks': remarks,
  };

  factory CropProtection.fromMap(Map<String, dynamic> map) => CropProtection(
    weedType: map['weed_type'] ?? '',
    weedPressure: map['weed_level'] ?? map['weed_pressure'] ?? 'Low',
    pestType: map['pest_type'] ?? '',
    pestSeverity: map['pest_severity'] ?? 'Low',
    diseaseType: map['disease_type'] ?? '',
    diseaseSeverity: map['disease_severity'] ?? 'Low',
    remarks: map['remarks'] ?? '',
  );
}

class ControlMethods {
  final String weedControl;
  final String pestControl;
  final String diseaseControl;

  ControlMethods({
    required this.weedControl,
    required this.pestControl,
    required this.diseaseControl,
  });

  Map<String, dynamic> toMap() => {
    'weed_control': weedControl,
    'pest_control': pestControl,
    'disease_control': diseaseControl,
  };

  factory ControlMethods.fromMap(Map<String, dynamic> map) => ControlMethods(
    weedControl: map['weed_control'] ?? '',
    pestControl: map['pest_control'] ?? '',
    diseaseControl: map['disease_control'] ?? '',
  );
}

class HarvestInformation {
  final DateTime harvestDate;
  final double yieldAmount;
  final String harvestMethod; // Manual / Mechanized

  HarvestInformation({
    required this.harvestDate,
    required this.yieldAmount,
    required this.harvestMethod,
  });

  Map<String, dynamic> toMap() => {
    'harvest_date': harvestDate.toIso8601String(),
    'yield': yieldAmount,
    'harvest_method': harvestMethod,
  };

  factory HarvestInformation.fromMap(Map<String, dynamic> map) => HarvestInformation(
    harvestDate: DateTime.parse(map['harvest_date'] ?? DateTime.now().toIso8601String()),
    yieldAmount: (map['yield'] ?? 0).toDouble(),
    harvestMethod: map['harvest_method'] ?? 'Manual',
  );
}

class ResidualManagement {
  final String residueType;
  final String managementMethod;
  final String remarks;

  ResidualManagement({
    required this.residueType,
    required this.managementMethod,
    required this.remarks,
  });

  Map<String, dynamic> toMap() => {
    'residue_type': residueType,
    'management_method': managementMethod,
    'remarks': remarks,
  };

  factory ResidualManagement.fromMap(Map<String, dynamic> map) => ResidualManagement(
    residueType: map['residue_type'] ?? 'N/A',
    managementMethod: map['management_method'] ?? 'N/A',
    remarks: map['remarks'] ?? map['residual_outcome'] ?? '',
  );
}

class BlockModel {
  final String id;
  final String blockId;
  final String? name;
  final dynamic geom;

  BlockModel({
    required this.id,
    required this.blockId,
    this.name,
    this.geom,
  });

  factory BlockModel.fromMap(Map<String, dynamic> map) {
    return BlockModel(
      id: map['id']?.toString() ?? '',
      blockId: map['block_id'] ?? '',
      name: map['name'],
      geom: map['geom'],
    );
  }

  Map<String, dynamic> toMap() => {
    'id': id,
    'block_id': blockId,
    'name': name,
    'geom': geom,
  };
}
