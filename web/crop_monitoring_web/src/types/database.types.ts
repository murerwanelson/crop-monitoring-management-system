// Database type definitions matching Supabase schema
import { UserRole } from './auth.types';

export interface Profile {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: UserRole;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
}

export interface Block {
    id: string;
    block_id: string;
    name?: string;
    geom: any; // GeoJSON Polygon/MultiPolygon
    created_at: string;
    created_by: string;
}

export interface Observation {
    id: string;
    client_uuid?: string;
    collector_id: string;
    section_name: string;
    block_id: string;
    field_name: string;
    latitude: number;
    longitude: number;
    gps_accuracy: number;
    date_recorded: string;
    created_at: string;
}

export interface CropInformation {
    id: string;
    observation_id: string;
    crop_type: string;
    ratoon_number: number;
    variety: string;
    planting_date: string;
    expected_harvest_date: string;
    crop_stage: string;
}

export interface CropMonitoring {
    id: string;
    observation_id: string;
    crop_vigor: string;
    canopy_cover: number;
    stress: string;
    remarks: string;
}

export interface SoilCharacteristics {
    id: string;
    observation_id: string;
    soil_type: string;
    soil_texture: string;
    soil_ph: number;
    organic_matter: number;
    drainage_class: string;
}

export interface IrrigationManagement {
    id: string;
    observation_id: string;
    irrigation_type: string;
    irrigation_date: string;
    irrigation_volume: number;
    soil_moisture_percentage: number;
    water_source: string;
}

export interface NutrientManagement {
    id: string;
    observation_id: string;
    fertilizer_type: string;
    application_date: string;
    application_rate: number;
    npk_ratio: string;
}

export interface CropProtection {
    id: string;
    observation_id: string;
    weed_type: string;
    weed_level: string;
    pest_type: string;
    pest_severity: string;
    disease_type: string;
    disease_severity: string;
    remarks: string;
}

export interface ControlMethods {
    id: string;
    observation_id: string;
    weed_control: string;
    pest_control: string;
    disease_control: string;
}

export interface HarvestInformation {
    id: string;
    observation_id: string;
    harvest_date: string;
    yield: number;
    harvest_method: string;
}

export interface ResidualManagement {
    id: string;
    observation_id: string;
    residue_type: string;
    management_method: string;
    remarks: string;
}

export interface ObservationImage {
    id: string;
    observation_id: string;
    image_url: string;
    storage_path?: string;
    taken_at: string;
    uploaded_by: string;
}

export interface Field {
    field_name: string;
    section_name: string;
    block_id: string;
    latitude: number;
    longitude: number;
    crop_type?: string;
    latest_stress?: string;
    latest_moisture?: number;
    latest_image?: string;
    observation_count: number;
}

export interface FieldWithGeom extends Field {
    geom?: any; // PostGIS GeoJSON or similar
}

// Full observation with all related data
export interface FullObservation extends Observation {
    crop_information?: CropInformation;
    crop_monitoring?: CropMonitoring;
    soil_characteristics?: SoilCharacteristics;
    irrigation_management?: IrrigationManagement;
    nutrient_management?: NutrientManagement;
    crop_protection?: CropProtection;
    control_methods?: ControlMethods;
    harvest?: HarvestInformation;
    residual_management?: ResidualManagement;
    images?: ObservationImage[];
}

// Filter types
export interface ObservationFilters {
    cropType?: string;
    variety?: string;
    fieldName?: string;
    section?: string;
    block?: string;
    startDate?: string;
    endDate?: string;
    stressLevel?: string;
}
