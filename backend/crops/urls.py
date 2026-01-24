from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    FieldViewSet,
    ObservationViewSet,
    CropManagementViewSet,
    CropMeasurementViewSet,
    MediaViewSet,
    StatsViewSet,
    RegisterView,
    UserViewSet,
    AuditLogViewSet,
    RequestPasswordResetView,
    ResetPasswordView
)

router = DefaultRouter()
router.register(r'fields', FieldViewSet)
router.register(r'observations', ObservationViewSet)
router.register(r'crop-management', CropManagementViewSet)
router.register(r'crop-measurements', CropMeasurementViewSet)
router.register(r'media', MediaViewSet)
router.register(r'stats', StatsViewSet, basename='stats')
router.register(r'users', UserViewSet)
router.register(r'audit-logs', AuditLogViewSet)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('password-reset/request/', RequestPasswordResetView.as_view(), name='password_reset_request'),
    path('password-reset/confirm/', ResetPasswordView.as_view(), name='password_reset_confirm'),
    path('', include(router.urls)),
]

