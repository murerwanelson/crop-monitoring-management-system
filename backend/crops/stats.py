from django.db.models import Count, Avg, Q
from django.db.models.functions import TruncDate
from .models import Field, Observation, CropManagement, CropMeasurement
from datetime import datetime, timedelta


def get_dashboard_stats(user=None, days=30):
    """
    Get dashboard statistics for the specified time period
    If user is provided and is a field collector, filter by their data
    """
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=days)
    
    # Base querysets
    observations_qs = Observation.objects.all()
    fields_qs = Field.objects.all()
    
    # Filter by user role if applicable
    if user and hasattr(user, 'userprofile'):
        role = user.userprofile.role
        if role == 'FIELD_COLLECTOR':
            observations_qs = observations_qs.filter(data_collector=user)
            fields_qs = fields_qs.filter(created_by=user)
    
    # Filter by date range
    observations_in_range = observations_qs.filter(
        observation_date__gte=start_date,
        observation_date__lte=end_date
    )
    
    # Calculate statistics
    stats = {
        'total_fields': fields_qs.count(),
        'total_observations': observations_qs.count(),
        'observations_in_period': observations_in_range.count(),
        'unique_crop_varieties': observations_qs.values('crop_variety').distinct().count(),
        
        # Growth stage distribution
        'growth_stages': list(
            observations_in_range.values('growth_stage')
            .annotate(count=Count('id'))
            .order_by('-count')
        ),
        
        # Observations per day (last 30 days)
        'observations_over_time': list(
            observations_in_range.annotate(date=TruncDate('observation_date'))
            .values('date')
            .annotate(count=Count('id'))
            .order_by('date')
        ),
        
        # Crop variety distribution
        'crop_varieties': list(
            observations_in_range.values('crop_variety')
            .annotate(count=Count('id'))
            .order_by('-count')[:10]  # Top 10
        ),
        
        # Fertilizer usage
        'fertilizer_usage': CropManagement.objects.filter(
            observation__in=observations_in_range
        ).aggregate(
            total_fertilized=Count('id', filter=Q(fertilizer_applied=True)),
            total=Count('id')
        ),
        
        # Pesticide usage
        'pesticide_usage': CropManagement.objects.filter(
            observation__in=observations_in_range
        ).aggregate(
            total_sprayed=Count('id', filter=Q(sprayed=True)),
            total=Count('id')
        ),
        
        # Average measurements
        'avg_measurements': CropMeasurement.objects.filter(
            observation__in=observations_in_range
        ).aggregate(
            avg_height=Avg('crop_height_cm'),
            avg_diameter=Avg('stalk_diameter'),
            avg_leaves=Avg('number_of_leaves'),
            avg_moisture=Avg('soil_moisture')
        ),
        
        # Fertilizer vs Performance (avg height)
        'fertilizer_performance': {
            'fertilized': CropMeasurement.objects.filter(
                observation__in=observations_in_range,
                observation__crop_management__fertilizer_applied=True
            ).aggregate(avg_height=Avg('crop_height_cm'))['avg_height'] or 0,
            'unfertilized': CropMeasurement.objects.filter(
                observation__in=observations_in_range,
                observation__crop_management__fertilizer_applied=False
            ).aggregate(avg_height=Avg('crop_height_cm'))['avg_height'] or 0,
        }
    }
    
    return stats


def get_moisture_trends(user=None, days=30):
    """Get soil moisture trends over time"""
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=days)
    
    observations_qs = Observation.objects.filter(
        observation_date__gte=start_date,
        observation_date__lte=end_date
    )
    
    if user and hasattr(user, 'userprofile') and user.userprofile.role == 'FIELD_COLLECTOR':
        observations_qs = observations_qs.filter(data_collector=user)
    
    moisture_data = CropMeasurement.objects.filter(
        observation__in=observations_qs,
        soil_moisture__isnull=False
    ).annotate(
        date=TruncDate('observation__observation_date')
    ).values('date').annotate(
        avg_moisture=Avg('soil_moisture'),
        count=Count('id')
    ).order_by('date')
    
    return list(moisture_data)


def get_growth_analysis(crop_variety=None, user=None):
    """Analyze crop growth over time for a specific variety"""
    measurements_qs = CropMeasurement.objects.select_related('observation')
    
    if crop_variety:
        measurements_qs = measurements_qs.filter(observation__crop_variety=crop_variety)
    
    if user and hasattr(user, 'userprofile') and user.userprofile.role == 'FIELD_COLLECTOR':
        measurements_qs = measurements_qs.filter(observation__data_collector=user)
    
    growth_data = measurements_qs.annotate(
        date=TruncDate('observation__observation_date')
    ).values('date').annotate(
        avg_height=Avg('crop_height_cm'),
        avg_diameter=Avg('stalk_diameter'),
        avg_leaves=Avg('number_of_leaves'),
        avg_population=Avg('plant_population'),
        count=Count('id')
    ).order_by('date')
    
    # Calculate fertilizer stats for this selection
    fert_stats = {
        'fertilized': measurements_qs.filter(
            observation__crop_management__fertilizer_applied=True
        ).aggregate(avg=Avg('crop_height_cm'))['avg'] or 0,
        'unfertilized': measurements_qs.filter(
            observation__crop_management__fertilizer_applied=False
        ).aggregate(avg=Avg('crop_height_cm'))['avg'] or 0,
    }
    
    return {
        'trends': list(growth_data),
        'fertilizer_stats': fert_stats
    }
