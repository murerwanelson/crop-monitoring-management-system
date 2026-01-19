from rest_framework import serializers
from rest_framework_gis.serializers import GeoFeatureModelSerializer
from django.contrib.auth.models import User
from .models import (
    Field,
    Observation,
    CropManagement,
    CropMeasurement,
    Media,
    UserProfile
)
from rest_framework_gis.fields import GeometryField


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    role = serializers.ChoiceField(choices=UserProfile.ROLE_CHOICES, required=False)

    class Meta:
        model = User
        fields = ['username', 'password', 'email', 'first_name', 'last_name', 'role']

    def create(self, validated_data):
        role = validated_data.pop('role', 'FIELD_COLLECTOR')
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            email=validated_data.get('email', ''),
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
        )
        UserProfile.objects.create(user=user, role=role)
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = UserProfile
        fields = ['user', 'role']


class FieldSerializer(serializers.ModelSerializer):
    """Basic field serializer"""
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    location = GeometryField()
    boundary = GeometryField(required=False, allow_null=True)
    
    class Meta:
        model = Field
        fields = ['id', 'field_id', 'location', 'boundary', 'created_by', 'created_by_name', 'created_at']
        read_only_fields = ['created_by']


class FieldGeoSerializer(GeoFeatureModelSerializer):
    """GeoJSON serializer for map visualization"""
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    observation_count = serializers.SerializerMethodField()
    
    def get_observation_count(self, obj):
        return obj.observation_set.count()
    
    class Meta:
        model = Field
        geo_field = 'boundary'  # Use polygon boundary for map data if available
        fields = ['id', 'field_id', 'location', 'created_by_name', 'observation_count', 'created_at']


class MediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Media
        fields = '__all__'


class CropManagementSerializer(serializers.ModelSerializer):
    class Meta:
        model = CropManagement
        exclude = ['observation']


class CropMeasurementSerializer(serializers.ModelSerializer):
    class Meta:
        model = CropMeasurement
        exclude = ['observation']

    def validate_soil_moisture(self, value):
        if value < 0 or value > 100:
            raise serializers.ValidationError("Soil moisture must be between 0 and 100.")
        return value

    def validate_crop_height_cm(self, value):
        if value < 0:
            raise serializers.ValidationError("Crop height cannot be negative.")
        return value


class ObservationListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views"""
    field_id = serializers.CharField(source='field.field_id', read_only=True)
    collector_name = serializers.CharField(source='data_collector.username', read_only=True)
    observation_area = GeometryField(required=False, allow_null=True)
    
    crop_height = serializers.DecimalField(source='crop_measurement.crop_height_cm', read_only=True, max_digits=6, decimal_places=2)
    soil_moisture = serializers.DecimalField(source='crop_measurement.soil_moisture', read_only=True, max_digits=5, decimal_places=2)
    fertilizer_type = serializers.CharField(source='crop_management.fertilizer_type', read_only=True)
    pesticide_used = serializers.CharField(source='crop_management.pesticide_used', read_only=True)
    weather = serializers.CharField(source='crop_management.weather', read_only=True)
    watering = serializers.CharField(source='crop_management.watering', read_only=True)

    class Meta:
        model = Observation
        fields = [
            'id', 'field', 'field_id', 'data_collector', 'collector_name', 'data_collector_name',
            'observation_date', 'crop_variety', 'planting_date', 'growth_stage', 'observation_area',
            'crop_height', 'soil_moisture', 'fertilizer_type', 'pesticide_used', 'weather', 'watering',
            'synced', 'created_at'
        ]


class ObservationDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer with nested data for detail views"""
    field_data = FieldSerializer(source='field', read_only=True)
    field_id = serializers.CharField(source='field.field_id', read_only=True)
    collector = UserSerializer(source='data_collector', read_only=True)
    collector_name = serializers.CharField(source='data_collector.username', read_only=True)
    crop_management = CropManagementSerializer(read_only=True)
    crop_measurement = CropMeasurementSerializer(read_only=True)
    media_items = MediaSerializer(source='media_set', many=True, read_only=True)
    observation_area = GeometryField(read_only=True)
    
    class Meta:
        model = Observation
        fields = [
            'id', 'field', 'field_id', 'field_data', 'data_collector', 'collector', 'collector_name', 'data_collector_name',
            'observation_date', 'crop_variety', 'planting_date', 'growth_stage', 'observation_area',
            'crop_management', 'crop_measurement', 'media_items',
            'synced', 'created_at'
        ]


class ObservationCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating observations with nested data"""
    crop_management = CropManagementSerializer(required=False)
    crop_measurement = CropMeasurementSerializer(required=False)
    observation_area = GeometryField(required=False, allow_null=True)
    
    class Meta:
        model = Observation
        fields = [
            'field', 'data_collector', 'data_collector_name', 'observation_date', 'crop_variety',
            'planting_date', 'growth_stage', 'observation_area', 'crop_management', 'crop_measurement'
        ]
        read_only_fields = ['data_collector']

    def validate_observation_date(self, value):
        from django.utils import timezone
        if value > timezone.now().date():
            raise serializers.ValidationError("Observation date cannot be in the future.")
        return value

    def validate(self, data):
        if data.get('planting_date') and data.get('observation_date'):
            if data['planting_date'] > data['observation_date']:
                raise serializers.ValidationError("Planting date cannot be after observation date.")
        return data
    
    def create(self, validated_data):
        from .weather_utils import get_weather_description
        
        crop_management_data = validated_data.pop('crop_management', {})
        crop_measurement_data = validated_data.pop('crop_measurement', {})
        
        # Automatic Weather Fetching
        if not crop_management_data.get('weather'):
            obs_area = validated_data.get('observation_area')
            if obs_area:
                # Get centroid or first point for weather
                try:
                    centroid = obs_area.centroid
                    weather = get_weather_description(centroid.y, centroid.x)
                    crop_management_data['weather'] = weather
                except Exception:
                    pass
        
        # Create observation
        observation = Observation.objects.create(**validated_data)
        
        # Create related data if provided (or even if empty to ensure the record exists)
        CropManagement.objects.create(observation=observation, **crop_management_data)
        CropMeasurement.objects.create(observation=observation, **crop_measurement_data)
        
        return observation

