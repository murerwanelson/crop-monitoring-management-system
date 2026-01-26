from rest_framework import serializers
from rest_framework_gis.serializers import GeoFeatureModelSerializer
from django.contrib.auth.models import User
from .models import (
    Field,
    Observation,
    CropManagement,
    CropMeasurement,
    Media,
    UserProfile,
    AuditLog
)
from rest_framework_gis.fields import GeometryField


class UserSerializer(serializers.ModelSerializer):
    role = serializers.CharField(source='userprofile.role', read_only=True)
    permissions = serializers.ListField(source='userprofile.permissions', read_only=True)
    assigned_fields = serializers.PrimaryKeyRelatedField(many=True, read_only=True, source='userprofile.assigned_fields')
    
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'role', 'permissions', 'assigned_fields']

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('userprofile', {})
        role = profile_data.get('role')
        
        # Update User fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update Profile role
        if role:
            profile = instance.userprofile
            profile.role = role
            profile.save()
            
        return instance


class RegisterSerializer(serializers.ModelSerializer):
    """
    Secure registration serializer for field collectors.
    The role is hardcoded server-side to prevent parameter pollution.
    """
    password = serializers.CharField(write_only=True, min_length=8)
    email = serializers.EmailField(required=True)

    class Meta:
        model = User
        fields = ['username', 'password', 'email', 'first_name', 'last_name']
        # NOTE: 'role' is explicitly NOT included to prevent client-side manipulation

    def validate_email(self, value):
        """Ensure email uniqueness"""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate_username(self, value):
        """Ensure username uniqueness"""
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value

    def create(self, validated_data):
        """
        Create user with automatic field_collector role assignment.
        Security: Role cannot be overridden from client request.
        """
        # SECURITY: Remove any 'role' from validated_data to prevent parameter pollution
        validated_data.pop('role', None)
        
        # Create the user
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            email=validated_data.get('email', ''),
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
        )
        
        # SECURITY: Hardcode role assignment server-side
        # This ensures all new users get field_collector role regardless of request data
        role = 'FIELD_COLLECTOR'
        
        # Default permissions for field collectors
        default_permissions = ["write_logs", "upload_gps", "access_camera"]
        
        # Create user profile with forced role and permissions
        UserProfile.objects.create(
            user=user,
            role=role,
            permissions=default_permissions,
            is_active=True
        )
        
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
    observation_count = serializers.SerializerMethodField()
    
    def get_observation_count(self, obj):
        return obj.observation_set.count()
    
    class Meta:
        model = Field
        fields = ['id', 'field_id', 'location', 'boundary', 'created_by', 'created_by_name', 'observation_count', 'created_at']
        read_only_fields = ['created_by']


class FieldGeoSerializer(GeoFeatureModelSerializer):
    """GeoJSON serializer for map visualization"""
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    last_observation_date = serializers.SerializerMethodField()

    def get_last_observation_date(self, obj):
        last_obs = obj.observation_set.order_by('-observation_date').first()
        if last_obs:
            return last_obs.observation_date
        return None

    class Meta:
        model = Field
        geo_field = 'boundary'
        fields = ['id', 'field_id', 'location', 'boundary', 'created_by_name', 'last_observation_date']

    def to_representation(self, instance):
        # Ensure NoneType attributes are handled gracefully
        representation = super().to_representation(instance)
        properties = representation.get('properties', {})
        properties = {key: value for key, value in properties.items() if value is not None}
        representation['properties'] = properties
        return representation


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
    field_boundary = GeometryField(source='field.boundary', read_only=True)
    collector_name = serializers.CharField(source='data_collector.username', read_only=True)
    observation_area = GeometryField(required=False, allow_null=True)
    
    crop_height = serializers.DecimalField(source='crop_measurement.crop_height_cm', read_only=True, max_digits=6, decimal_places=2)
    soil_moisture = serializers.DecimalField(source='crop_measurement.soil_moisture', read_only=True, max_digits=5, decimal_places=2)
    fertilizer_type = serializers.CharField(source='crop_management.fertilizer_type', read_only=True)
    pesticide_used = serializers.CharField(source='crop_management.pesticide_used', read_only=True)
    weather = serializers.CharField(source='crop_management.weather', read_only=True)
    watering = serializers.CharField(source='crop_management.watering', read_only=True)
    urgent_attention = serializers.BooleanField(read_only=True)
    vigor = serializers.CharField(source='crop_measurement.vigor', read_only=True)
    observation_image = serializers.SerializerMethodField()

    def get_observation_image(self, obj):
        media = obj.media_set.first()
        if media and media.image_url:
            return media.image_url.url
        return None

    class Meta:
        model = Observation
        fields = [
            'id', 'field', 'field_id', 'field_boundary', 'data_collector', 'collector_name', 'data_collector_name',
            'observation_date', 'crop_variety', 'planting_date', 'growth_stage', 'observation_area',
            'crop_height', 'soil_moisture', 'fertilizer_type', 'pesticide_used', 'weather', 'watering',
            'observation_image', 'synced', 'created_at', 'urgent_attention', 'vigor', 'area_ha'
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
            'synced', 'created_at', 'urgent_attention', 'area_ha'
        ]


class ObservationCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating observations with nested data"""
    crop_management = CropManagementSerializer(required=False)
    crop_measurement = CropMeasurementSerializer(required=False)
    observation_area = GeometryField(required=False, allow_null=True)
    
    class Meta:
        model = Observation
        fields = [
            'id', 'field', 'data_collector', 'data_collector_name', 'observation_date', 'crop_variety',
            'planting_date', 'growth_stage', 'observation_area', 'crop_management', 'crop_measurement',
            'client_uuid', 'area_ha'
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
        
        # Deduplication based on client_uuid
        client_uuid = validated_data.get('client_uuid')
        if client_uuid:
            existing = Observation.objects.filter(client_uuid=client_uuid).first()
            if existing:
                # Return existing if it already exists to achieve idempotency
                return existing

        crop_management_data = validated_data.pop('crop_management', {})
        crop_measurement_data = validated_data.pop('crop_measurement', {})
        
        # Automatic Weather Fetching
        if not crop_management_data.get('weather') or crop_management_data.get('weather') == "":
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


class ObservationAnalyticsSerializer(serializers.ModelSerializer):
    """
    Concrete Analytics Serializer designed for the 7-Pillar Analytics Dashboard.
    Provides deep, flattened, and computed data for complex visualizations.
    """
    # 1. Identification & Time
    field_id = serializers.CharField(source='field.field_id', read_only=True)
    collector_name = serializers.CharField(source='data_collector.username', read_only=True)
    
    # 2-5. Nested Management & Measurements (Fertilizer, Pests, Soil, Growth)
    crop_management = CropManagementSerializer(read_only=True)
    crop_measurement = CropMeasurementSerializer(read_only=True)
    
    # 6. Media & GPS (Computed)
    media_items = MediaSerializer(source='media_set', many=True, read_only=True)
    gps_coordinates = serializers.SerializerMethodField()
    
    # Custom Analytics Logic
    computed_soil_status = serializers.SerializerMethodField()

    class Meta:
        model = Observation
        fields = [
            'id', 'field', 'field_id', 'data_collector', 'collector_name', 'data_collector_name',
            'observation_date', 'crop_variety', 'planting_date', 'growth_stage',
            'crop_management', 'crop_measurement', 'media_items',
            'gps_coordinates', 'computed_soil_status',
            'synced', 'created_at', 'urgent_attention', 'area_ha'
        ]

    def get_gps_coordinates(self, obj):
        """Combines area centroid or first media point into a single lat/lng pair for mapping"""
        # Try observation area first
        if obj.observation_area:
            centroid = obj.observation_area.centroid
            return {'lat': centroid.y, 'lng': centroid.x}
        
        # Fallback to first image with location
        first_media = obj.media_set.filter(location__isnull=False).first()
        if first_media:
            return {'lat': first_media.location.y, 'lng': first_media.location.x}
            
        return None

    def get_computed_soil_status(self, obj):
        """
        Ensures moisture level is always available for analytics.
        If the collector didn't select 'Dry/Wet', it computes it from the raw % value.
        """
        measurement = getattr(obj, 'crop_measurement', None)
        if not measurement:
            return 'No Data'
            
        # Return existing level if provided
        if measurement.soil_moisture_level:
            return measurement.soil_moisture_level
            
        # Compute from percentage if missing
        if measurement.soil_moisture is not None:
            if measurement.soil_moisture < 30: return 'Dry'
            if measurement.soil_moisture < 70: return 'Moist'
            return 'Wet'
            
        return 'Unknown'


class AuditLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = AuditLog
        fields = ['id', 'user', 'username', 'action', 'resource_type', 'resource_id', 'timestamp', 'details']

class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        if not User.objects.filter(email=value).exists():
            # Security: Don't raise error if email doesn't exist to prevent enumeration
            pass
        return value


class PasswordResetUpdateSerializer(serializers.Serializer):
    token = serializers.CharField(max_length=6)
    new_password = serializers.CharField(min_length=8, write_only=True)

    def validate_token(self, value):
        from .models import PasswordResetToken
        try:
            token_obj = PasswordResetToken.objects.get(token=value, is_used=False)
            if token_obj.is_expired():
                raise serializers.ValidationError("Token has expired.")
            return value
        except PasswordResetToken.DoesNotExist:
            raise serializers.ValidationError("Invalid token.")
