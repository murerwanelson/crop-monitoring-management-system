from django.http import HttpResponse
import csv
from django.contrib.auth.models import User
from .permissions import IsAdministrator, IsViewerOrAdministrator, IsFieldManager, IsOwnerOrViewerOrAdministrator
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import (
    Field,
    Observation,
    CropManagement,
    CropMeasurement,
    Media,
    AuditLog
)
from .serializers import (
    FieldSerializer,
    FieldGeoSerializer,
    ObservationListSerializer,
    ObservationDetailSerializer,
    ObservationCreateSerializer,
    ObservationAnalyticsSerializer,
    CropManagementSerializer,
    CropMeasurementSerializer,
    MediaSerializer,
    RegisterSerializer,
    UserSerializer,
    AuditLogSerializer,
    PasswordResetRequestSerializer,
    PasswordResetUpdateSerializer
)
from rest_framework.views import APIView
from .models import PasswordResetToken
from django.utils import timezone
import random
import string
from django.core.mail import send_mail
from rest_framework.generics import CreateAPIView
from .stats import get_dashboard_stats, get_moisture_trends, get_growth_analysis, get_insights, get_advanced_analytics
from rest_framework.permissions import BasePermission


class IsAdministrator(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.userprofile.role == 'ADMIN'


class IsFieldManager(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.userprofile.role == 'FIELD_MANAGER'


class IsViewer(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.userprofile.role == 'VIEWER'


class IsFieldCollector(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.userprofile.role == 'FIELD_COLLECTOR'


class FieldViewSet(viewsets.ModelViewSet):
    queryset = Field.objects.all()
    serializer_class = FieldSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [permissions.IsAuthenticated()] # Anyone authenticated can create
        elif self.action == 'destroy':
            return [IsAdministrator()]
        elif self.action in ['update', 'partial_update']:
            return [IsFieldManager()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Field.objects.none()
        
        try:
            profile = user.userprofile
            if profile.role == 'ADMIN':
                 return Field.objects.all()
            return profile.assigned_fields.all()
        except:
            return Field.objects.none()

    def perform_create(self, serializer):
        field = serializer.save(created_by=self.request.user)
        # Auto-assign the field to the creator so they can see it
        self.request.user.userprofile.assigned_fields.add(field)
    
    @action(detail=False, methods=['get'])
    def map_data(self, request):
        """Return fields as GeoJSON for map visualization"""
        fields = self.get_queryset()
        serializer = FieldGeoSerializer(fields, many=True)
        data = serializer.data
        
        # Inject is_assigned property for each feature
        for feature in data.get('features', []):
            feature['properties']['isAssigned'] = True # All fields in get_queryset are assigned or visible to user
            
            
        return Response(data)

    @action(detail=True, methods=['get'])
    def indices(self, request, pk=None):
        """
        Simulate satellite indices calculation for a specific field.
        In a real scenario, this would query a GIS service or Sentinel Hub.
        """
        # field = self.get_object() # Access field object if needed for location-based logic

        # Simulated values representative of healthy vegetation
        data = {
            'NDVI': round(random.uniform(0.6, 0.85), 2),
            'EVI': round(random.uniform(0.4, 0.6), 2),
            'SAVI': round(random.uniform(0.3, 0.5), 2),
            'NDWI': round(random.uniform(0.2, 0.4), 2),
            'GNDVI': round(random.uniform(0.5, 0.75), 2),
            'NDRE': round(random.uniform(0.3, 0.5), 2),
            'LAI': round(random.uniform(2.5, 4.5), 1),
            'VCI': round(random.uniform(60.0, 95.0), 1),
        }
        
        return Response(data)


class ObservationViewSet(viewsets.ModelViewSet):
    queryset = Observation.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def perform_create(self, serializer):
        serializer.save(data_collector=self.request.user)

    def get_serializer_class(self):
        if self.action == 'list':
            return ObservationListSerializer
        elif self.action == 'create':
            return ObservationCreateSerializer
        return ObservationDetailSerializer
    
    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Observation.objects.none()
        
        try:
            profile = user.userprofile
            if profile.role == 'ADMIN':
                return Observation.objects.all()
            
            return Observation.objects.filter(field__in=profile.assigned_fields.all())
        except:
            return Observation.objects.none()
    
    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_media(self, request, pk=None):
        """Upload images for an observation"""
        observation = self.get_object()
        
        # Handle multiple file uploads
        files = request.FILES.getlist('images')
        if not files:
            return Response(
                {'error': 'No images provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        created_media = []
        for file in files:
            media_data = {
                'observation': observation.id,
                'image_url': file,  # Will be handled by model's ImageField
            }
            
            # Extract GPS from request if provided
            if 'latitude' in request.data and 'longitude' in request.data:
                from django.contrib.gis.geos import Point
                media_data['location'] = Point(
                    float(request.data['longitude']),
                    float(request.data['latitude'])
                )
            
            serializer = MediaSerializer(data=media_data)
            if serializer.is_valid():
                serializer.save()
                created_media.append(serializer.data)
        
        return Response(created_media, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        """Export observations to CSV"""
        observations = self.get_queryset().select_related('field', 'data_collector').prefetch_related('crop_management', 'crop_measurement')
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="observations_export.csv"'
        
        writer = csv.writer(response)
        # Write Header
        writer.writerow([
            'observation_id', 'field_id', 'collector', 'observation_date',
            'crop_variety', 'growth_stage', 'crop_height_cm', 'number_of_leaves',
            'plant_population', 'vigor', 'canopy_cover_percentage', 'weed_pressure',
            'soil_moisture', 'soil_moisture_level', 'weather', 'irrigation_applied',
            'watering_progress', 'fertilizer_applied', 'fertilizer_type',
            'fertilizer_amount', 'fertilizer_date', 'pest_present', 'pest_type',
            'pest_severity', 'pest_percentage_affected', 'sprayed', 'pesticide_used',
            'urgent_attention'
        ])
        
        for obs in observations:
            management = getattr(obs, 'crop_management', None)
            measurement = getattr(obs, 'crop_measurement', None)
            
            writer.writerow([
                obs.id,
                obs.field.field_id if obs.field else '',
                obs.data_collector_name or (obs.data_collector.username if obs.data_collector else ''),
                obs.observation_date,
                obs.crop_variety,
                obs.growth_stage,
                measurement.crop_height_cm if measurement else '',
                measurement.number_of_leaves if measurement else '',
                measurement.plant_population if measurement else '',
                measurement.vigor if measurement else '',
                measurement.canopy_cover_percentage if measurement else '',
                measurement.weed_pressure if measurement else '',
                measurement.soil_moisture if measurement else '',
                measurement.soil_moisture_level if measurement else '',
                management.weather if management else '',
                management.irrigation_applied if management else '',
                management.watering if management else '',
                management.fertilizer_applied if management else '',
                management.fertilizer_type if management else '',
                management.fertilizer_amount if management else '',
                management.fertilizer_date if management else '',
                management.pest_present if management else '',
                management.pest_type if management else '',
                management.pest_severity if management else '',
                management.pest_percentage_affected if management else '',
                management.sprayed if management else '',
                management.pesticide_used if management else '',
                obs.urgent_attention
            ])
            
        return response

    @action(detail=False, methods=['get'])
    def analytics_data(self, request):
        """Dedicated analytics endpoint with deep data depth"""
        observations = self.get_queryset().select_related(
            'field', 'data_collector'
        ).prefetch_related(
            'crop_management', 'crop_measurement'
        )
        serializer = ObservationAnalyticsSerializer(observations, many=True)
        return Response(serializer.data)


class CropManagementViewSet(viewsets.ModelViewSet):
    queryset = CropManagement.objects.all()
    serializer_class = CropManagementSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrViewerOrAdministrator]


class CropMeasurementViewSet(viewsets.ModelViewSet):
    queryset = CropMeasurement.objects.all()
    serializer_class = CropMeasurementSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrViewerOrAdministrator]


class MediaViewSet(viewsets.ModelViewSet):
    queryset = Media.objects.all()
    serializer_class = MediaSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrViewerOrAdministrator]


class StatsViewSet(viewsets.ViewSet):
    """Statistics and analytics endpoint"""
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Get dashboard statistics"""
        days = int(request.query_params.get('days', 30))
        stats = get_dashboard_stats(user=request.user, days=days)
        return Response(stats)
    
    @action(detail=False, methods=['get'])
    def moisture_trends(self, request):
        """Get soil moisture trends"""
        days = int(request.query_params.get('days', 30))
        field_id = request.query_params.get('field_id', None)
        trends = get_moisture_trends(user=request.user, days=days, field_id=field_id)
        return Response(trends)
    
    @action(detail=False, methods=['get'])
    def growth_analysis(self, request):
        """Get crop growth analysis"""
        crop_variety = request.query_params.get('crop_variety', None)
        field_id = request.query_params.get('field_id', None)
        analysis = get_growth_analysis(crop_variety=crop_variety, user=request.user, field_id=field_id)
        return Response(analysis)

    @action(detail=False, methods=['get'])
    def insights(self, request):
        """Get automated insights and stories"""
        days = int(request.query_params.get('days', 30))
        insights = get_insights(user=request.user, days=days)
        return Response(insights)

    @action(detail=False, methods=['get'])
    def advanced(self, request):
        """Get advanced agricultural analytics"""
        days = int(request.query_params.get('days', 30))
        stats = get_advanced_analytics(user=request.user, days=days)
        return Response(stats)


class RegisterView(CreateAPIView):
    """
    Registration endpoint for field collectors.
    Returns JWT tokens immediately upon successful registration.
    """
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        """
        Override create to return JWT tokens along with user data.
        This allows immediate access to professional field tools without admin approval.
        """
        # Validate and create user
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Generate JWT tokens
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        
        # Get user profile data
        profile = user.userprofile
        
        # Construct response with tokens and user data
        response_data = {
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'role': profile.role,
                'permissions': profile.permissions,
            },
            'tokens': {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            },
            'message': 'Registration successful. You can now access professional field tools.'
        }
        
        return Response(response_data, status=status.HTTP_201_CREATED)


class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing users.
    - List/Retrieve/Update (Admin only)
    - me (Authenticated users)
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdministrator]

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    def get_permissions(self):
        if self.action == 'me':
            return [permissions.IsAuthenticated()]
        return super().get_permissions()


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing audit logs (Admin only).
    """
    queryset = AuditLog.objects.all().order_by('-timestamp')
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdministrator]



class RequestPasswordResetView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        
        try:
            user = User.objects.get(email=email)
            # Generate 6-digit OTP
            token = ''.join(random.choices(string.digits, k=6))
            expires_at = timezone.now() + timezone.timedelta(minutes=20)
            
            # Invalidate any old tokens for this user
            PasswordResetToken.objects.filter(user=user, is_used=False).update(is_used=True)
            
            PasswordResetToken.objects.create(
                user=user,
                token=token,
                expires_at=expires_at
            )
            
            # Send email
            send_mail(
                'Password Reset Token',
                f'Your password reset token is: {token}. It will expire in 20 minutes.',
                'from@example.com',
                [email],
                fail_silently=False,
            )
        except User.DoesNotExist:
            # Security: Blind response
            pass
            
        return Response(
            {"message": "If an account exists for this email, a reset token has been sent."},
            status=status.HTTP_200_OK
        )


class ResetPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        token_str = serializer.validated_data['token']
        new_password = serializer.validated_data['new_password']
        
        token_obj = PasswordResetToken.objects.get(token=token_str, is_used=False)
        user = token_obj.user
        
        # Security: Update user password
        user.set_password(new_password)
        user.save()
        
        # Invalidate token
        token_obj.is_used = True
        token_obj.save()
        
        # Send confirmation email
        send_mail(
            'Password Successfully Updated',
            'Your password has been successfully updated. If you did not perform this action, please contact support immediately.',
            'from@example.com',
            [user.email],
            fail_silently=False,
        )
        
        return Response(
            {"message": "Password updated successfully."},
            status=status.HTTP_200_OK
        )
