from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    FieldViewSet,
    ObservationViewSet,
    CropManagementViewSet,
    CropMeasurementViewSet,
    MediaViewSet,
    StatsViewSet,
    RegisterView
)

router = DefaultRouter()
router.register(r'fields', FieldViewSet)
router.register(r'observations', ObservationViewSet)
router.register(r'crop-management', CropManagementViewSet)
router.register(r'crop-measurements', CropMeasurementViewSet)
router.register(r'media', MediaViewSet)
router.register(r'stats', StatsViewSet, basename='stats')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('', include(router.urls)),
]

