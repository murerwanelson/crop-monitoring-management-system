from django.contrib.auth.models import User
from django.contrib.gis.db import models


class UserProfile(models.Model):
    ROLE_CHOICES = [
        ('FIELD_COLLECTOR', 'Field Collector'),
        ('SUPERVISOR', 'Supervisor'),
        ('ADMIN', 'Admin'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE)
    role = models.CharField(max_length=30, choices=ROLE_CHOICES)


class Field(models.Model):
    field_id = models.CharField(max_length=50, unique=True)
    location = models.PointField()
    boundary = models.PolygonField(null=True, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)


class Observation(models.Model):
    field = models.ForeignKey(Field, on_delete=models.CASCADE)
    data_collector = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    data_collector_name = models.CharField(max_length=100, blank=True) # Manual entry requirement 4.2 A
    observation_date = models.DateField()
    crop_variety = models.CharField(max_length=100, blank=True)
    planting_date = models.DateField(null=True, blank=True)
    growth_stage = models.CharField(max_length=50, blank=True)
    observation_area = models.PolygonField(null=True, blank=True)
    synced = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)


class CropManagement(models.Model):
    observation = models.OneToOneField(Observation, on_delete=models.CASCADE, related_name='crop_management')
    sprayed = models.BooleanField(null=True)
    pesticide_used = models.CharField(max_length=100, blank=True)
    fertilizer_applied = models.BooleanField(null=True)
    fertilizer_type = models.CharField(max_length=100, blank=True)
    fertilizer_date = models.DateField(null=True, blank=True)
    weather = models.CharField(max_length=100, blank=True)
    watering = models.CharField(max_length=100, blank=True)


class CropMeasurement(models.Model):
    observation = models.OneToOneField(Observation, on_delete=models.CASCADE, related_name='crop_measurement')
    crop_height_cm = models.DecimalField(max_digits=6, decimal_places=2, null=True)
    stalk_diameter = models.DecimalField(max_digits=6, decimal_places=2, null=True)
    number_of_leaves = models.IntegerField(null=True)
    plant_population = models.IntegerField(null=True)
    soil_moisture = models.DecimalField(max_digits=5, decimal_places=2, null=True)


class Media(models.Model):
    observation = models.ForeignKey(Observation, on_delete=models.CASCADE)
    image_url = models.ImageField(upload_to='observations/%Y/%m/%d/')
    location = models.PointField(null=True, blank=True)
    captured_at = models.DateTimeField(auto_now_add=True)


class AuditLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=255)
    resource_type = models.CharField(max_length=100)
    resource_id = models.CharField(max_length=100, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    details = models.JSONField(null=True, blank=True)

    def __str__(self):
        return f"{self.user} - {self.action} - {self.timestamp}"


