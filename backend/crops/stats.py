from .models import Field, Observation, CropManagement, CropMeasurement
from django.db.models import Count, Avg, Q, FloatField, Case, When
from django.db.models.functions import TruncDate
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


def get_moisture_trends(user=None, days=30, field_id=None):
    """Get soil moisture trends over time"""
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=days)
    
    observations_qs = Observation.objects.filter(
        observation_date__gte=start_date,
        observation_date__lte=end_date
    )
    
    if field_id:
        observations_qs = observations_qs.filter(field__field_id=field_id)
    
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


def get_growth_analysis(crop_variety=None, user=None, field_id=None):
    """Analyze crop growth over time for a specific variety or field"""
    measurements_qs = CropMeasurement.objects.select_related('observation')
    
    if crop_variety:
        measurements_qs = measurements_qs.filter(observation__crop_variety=crop_variety)
    
    if field_id:
        measurements_qs = measurements_qs.filter(observation__field__field_id=field_id)
    
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


def get_insights(user=None, days=30):
    """
    Analyze recent data to generate actionable insights and stories.
    """
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=days)
    
    # Base Query
    obs_qs = Observation.objects.filter(
        observation_date__gte=start_date,
        observation_date__lte=end_date
    )
    
    # Filter by user role if applicable
    if user and hasattr(user, 'userprofile') and user.userprofile.role == 'FIELD_COLLECTOR':
        obs_qs = obs_qs.filter(data_collector=user)

    insights = []
    
    # 1. Urgent Attention Analysis
    urgent_count = obs_qs.filter(urgent_attention=True).count()
    if urgent_count > 0:
        insights.append({
            'type': 'alert',
            'title': 'Urgent Attention Required',
            'message': f'{urgent_count} field observation(s) have been flagged for urgent attention this month.',
            'metric': str(urgent_count),
            'trend': 'negative'
        })

    # 2. Pest & Disease Analysis
    pest_count = CropManagement.objects.filter(observation__in=obs_qs, pest_present=True).count()
    total_obs = obs_qs.count()
    if total_obs > 0 and pest_count > 0:
        pest_rate = (pest_count / total_obs) * 100
        if pest_rate > 20:
             insights.append({
                'type': 'warning',
                'title': 'High Pest Activity',
                'message': f'Pests detected in {pest_rate:.1f}% of recent observations. Check pest management protocols.',
                'metric': f'{pest_rate:.0f}%',
                'trend': 'negative'
            })
    
    # 3. Fertilizer Efficiency Analysis
    measurements = CropMeasurement.objects.filter(observation__in=obs_qs, crop_height_cm__isnull=False)
    fertilized_avg = measurements.filter(observation__crop_management__fertilizer_applied=True).aggregate(Avg('crop_height_cm'))['crop_height_cm__avg']
    unfertilized_avg = measurements.filter(observation__crop_management__fertilizer_applied=False).aggregate(Avg('crop_height_cm'))['crop_height_cm__avg']
    
    if fertilized_avg and unfertilized_avg and unfertilized_avg > 0:
        diff_percent = ((fertilized_avg - unfertilized_avg) / unfertilized_avg) * 100
        if diff_percent > 10:
            insights.append({
                'type': 'success',
                'title': 'Fertilizer Impact',
                'message': f'Fertilized crops are {diff_percent:.1f}% taller on average than unfertilized ones.',
                'metric': f'+{diff_percent:.0f}%',
                'trend': 'positive'
            })

    # 4. Moisture Analysis
    dry_count = CropMeasurement.objects.filter(observation__in=obs_qs, soil_moisture_level='Dry').count()
    if dry_count > 0 and total_obs > 0:
        dry_rate = (dry_count / total_obs) * 100
        if dry_rate > 30:
             insights.append({
                'type': 'warning',
                'title': 'Water Stress Risk',
                'message': f'{dry_rate:.1f}% of fields are reporting "Dry" soil conditions. Consider irrigation schedule review.',
                'metric': f'{dry_rate:.0f}%',
                'trend': 'negative'
            })
            
    # Fallback if no specific insights
    if not insights:
        insights.append({
            'type': 'info',
            'title': 'Steady Monitoring',
            'message': f'Recorded {total_obs} observations in the last {days} days. Keep collecting data to generate usage insights.',
            'metric': str(total_obs),
            'trend': 'neutral'
        })

    return insights


def get_advanced_analytics(user=None, days=30):
    """
    Comprehensive advanced analytics for farm management.
    """
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=days)
    
    # Base Querysets
    obs_qs = Observation.objects.all()
    fields_qs = Field.objects.all()
    
    if user and hasattr(user, 'userprofile') and user.userprofile.role == 'FIELD_COLLECTOR':
        obs_qs = obs_qs.filter(data_collector=user)
        fields_qs = fields_qs.filter(created_by=user)

    recent_obs = obs_qs.filter(observation_date__gte=start_date)
    
    # 1. Field Health Scores
    health_scores = []
    for field in fields_qs:
        score = _calculate_health_score(field, days)
        health_scores.append({
            'field_id': field.field_id,
            'score': score,
            'status': 'Healthy' if score > 75 else 'Warning' if score > 40 else 'Critical'
        })
    
    # 2. Pest & Disease Distribution
    pest_management_recent = CropManagement.objects.filter(observation__in=recent_obs)
    pest_stats = pest_management_recent.aggregate(
        total=Count('id'),
        pest_present=Count('id', filter=Q(pest_present=True)),
        high_severity=Count('id', filter=Q(pest_severity='High')),
        med_severity=Count('id', filter=Q(pest_severity='Medium')),
        low_severity=Count('id', filter=Q(pest_severity='Low')),
        avg_area_affected=Avg('pest_percentage_affected')
    )
    
    # Top Pest Types
    pest_types = list(pest_management_recent.filter(pest_present=True)
                     .values('pest_type')
                     .annotate(count=Count('id'))
                     .order_by('-count')[:5])

    # 3. Intervention Effectiveness - Comparison Logic
    sprayed_obs = recent_obs.filter(crop_management__sprayed=True)
    effectiveness_stats = {
        'total_checks': 0,
        'reduced_severity': 0,
        'reduced_area': 0,
        'ineffective_fields': []
    }
    
    comparison_data = {
        'before': {'severity': 0, 'area': 0},
        'after': {'severity': 0, 'area': 0},
        'count': 0
    }
    
    severity_order = {'None': 0, 'Low': 1, 'Medium': 2, 'High': 3}
    
    for obs in sprayed_obs:
        # Find the next observation for the same field to see the outcome
        next_obs = Observation.objects.filter(
            field=obs.field,
            observation_date__gt=obs.observation_date
        ).order_by('observation_date').first()
        
        if next_obs:
            next_mgmt = getattr(next_obs, 'crop_management', None)
            if next_mgmt:
                comparison_data['count'] += 1
                curr_mgmt = obs.crop_management
                
                # Accumulate before stats
                comparison_data['before']['severity'] += severity_order.get(curr_mgmt.pest_severity, 0)
                comparison_data['before']['area'] += float(curr_mgmt.pest_percentage_affected or 0)
                
                # Accumulate after stats
                comparison_data['after']['severity'] += severity_order.get(next_mgmt.pest_severity, 0)
                comparison_data['after']['area'] += float(next_mgmt.pest_percentage_affected or 0)
                
                effectiveness_stats['total_checks'] += 1
                if severity_order.get(next_mgmt.pest_severity, 0) < severity_order.get(curr_mgmt.pest_severity, 0):
                    effectiveness_stats['reduced_severity'] += 1
                if (next_mgmt.pest_percentage_affected or 0) < (curr_mgmt.pest_percentage_affected or 0):
                    effectiveness_stats['reduced_area'] += 1
                
                # Flag ineffective treatments
                if next_mgmt.pest_severity == 'High' and curr_mgmt.pest_severity == 'High':
                    effectiveness_stats['ineffective_fields'].append({
                        'field_id': obs.field.field_id,
                        'pesticide': curr_mgmt.pesticide_used,
                        'date': next_obs.observation_date
                    })

    # Average the comparison data for charting
    if comparison_data['count'] > 0:
        c = comparison_data['count']
        comparison_data['before']['avg_severity'] = comparison_data['before']['severity'] / c
        comparison_data['before']['avg_area'] = comparison_data['before']['area'] / c
        comparison_data['after']['avg_severity'] = comparison_data['after']['severity'] / c
        comparison_data['after']['avg_area'] = comparison_data['after']['area'] / c

    # 3. Fertilizer Coverage & Usage
    progression_trend = list(recent_obs.annotate(date=TruncDate('observation_date'))
                            .values('date')
                            .annotate(pest_presence_rate=Avg(
                                Case(When(crop_management__pest_present=True, then=100), default=0, output_field=FloatField())
                            ))
                            .order_by('date'))

    # Hotspots - Per Field Risk
    hotspots = []
    for field in fields_qs:
        f_obs = recent_obs.filter(field=field)
        if f_obs.exists():
            avg_affected = f_obs.aggregate(avg=Avg('crop_management__pest_percentage_affected'))['avg'] or 0
            max_severity = f_obs.order_by('-crop_management__pest_severity').first().crop_management.pest_severity
            hotspots.append({
                'field_id': field.field_id,
                'avg_affected': avg_affected,
                'max_severity': max_severity,
                'observation_count': f_obs.count()
            })
    
    hotspots.sort(key=lambda x: x['avg_affected'], reverse=True)

    # 3. Fertilizer Coverage & Usage
    fert_management = CropManagement.objects.filter(observation__in=recent_obs, fertilizer_applied=True)
    
    # Usage by Type
    usage_by_type = list(fert_management.values('fertilizer_type').annotate(
        count=Count('id'),
        avg_amount=Avg('fertilizer_amount')
    ).order_by('-count'))

    fert_coverage = {
        'total_fields': fields_qs.count(),
        'fertilized_fields': recent_obs.filter(crop_management__fertilizer_applied=True).values('field').distinct().count(),
        'avg_amount_overall': fert_management.aggregate(avg=Avg('fertilizer_amount'))['avg'] or 0,
        'usage_by_type': usage_by_type
    }

    # 4. Action Gaps (Insights into accountability)
    action_gaps = []
    # Gap: Pest present but no spray recorded in the same observation
    pest_no_spray = recent_obs.filter(crop_management__pest_present=True, crop_management__sprayed=False)
    for obs in pest_no_spray[:5]: # Top 5 gaps
        action_gaps.append({
            'field_id': obs.field.field_id,
            'issue': 'Untreated Pest',
            'severity': obs.crop_management.pest_severity,
            'date': obs.observation_date
        })

    # Gap: Dry soil but no irrigation
    dry_no_irrigation = recent_obs.filter(crop_measurement__soil_moisture_level='Dry', crop_management__irrigation_applied=False)
    for obs in dry_no_irrigation[:5]:
        action_gaps.append({
            'field_id': obs.field.field_id,
            'issue': 'Water Stress (No Irrigation)',
            'severity': 'High',
            'date': obs.observation_date
        })

    return {
        'health_scores': health_scores,
        'pest_distribution': {
            **pest_stats,
            'top_types': pest_types,
            'progression': progression_trend,
            'hotspots': hotspots[:10],
            'effectiveness': {
                'severity_reduction_rate': (effectiveness_stats['reduced_severity'] / effectiveness_stats['total_checks'] * 100) if effectiveness_stats['total_checks'] > 0 else 0,
                'area_reduction_rate': (effectiveness_stats['reduced_area'] / effectiveness_stats['total_checks'] * 100) if effectiveness_stats['total_checks'] > 0 else 0,
                'ineffective_alerts': effectiveness_stats['ineffective_fields'],
                'comparison': comparison_data
            }
        },
        'fertilizer_coverage': fert_coverage,
        'action_gaps': action_gaps,
        'summary': {
            'avg_health': sum(h['score'] for h in health_scores) / len(health_scores) if health_scores else 0,
            'risk_level': 'High' if pest_stats['high_severity'] > 0 else 'Low'
        }
    }

def _calculate_health_score(field, days=30):
    """
    Composite Health Score helper (0-100)
    Based on: Vigor, Moisture, Pests, Weeds
    """
    recent_measurements = CropMeasurement.objects.filter(
        observation__field=field,
        observation__observation_date__gte=datetime.now().date() - timedelta(days=days)
    ).order_by('-observation__observation_date').first()
    
    if not recent_measurements:
        return 50 # Default middle score for no data

    score = 100
    
    # Vigor impact (Weight: 40%)
    vigor_map = {'Excellent': 100, 'Good': 80, 'Fair': 50, 'Poor': 20}
    vigor_score = vigor_map.get(recent_measurements.vigor, 50)
    
    # Pest impact (Weight: 30%)
    pest_score = 100
    try:
        mgmt = recent_measurements.observation.crop_management
        if mgmt.pest_present:
            severity_map = {'Low': 70, 'Medium': 40, 'High': 10}
            pest_score = severity_map.get(mgmt.pest_severity, 50)
    except:
        pass

    # Soil Moisture (Weight: 20%)
    moisture_score = 100
    if recent_measurements.soil_moisture_level == 'Dry':
        moisture_score = 30
    elif recent_measurements.soil_moisture_level == 'Wet':
        moisture_score = 70 # Too wet can be bad too, but better than dry for score
    
    # Weed Pressure (Weight: 10%)
    weed_map = {'Low': 100, 'Medium': 60, 'High': 20}
    weed_score = weed_map.get(recent_measurements.weed_pressure, 80)

    # Weighted Average
    final_score = (vigor_score * 0.4) + (pest_score * 0.3) + (moisture_score * 0.2) + (weed_score * 0.1)
    
    return max(0, min(100, final_score))
