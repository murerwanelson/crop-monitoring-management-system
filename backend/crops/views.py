from django.contrib.auth.models import User
from .permissions import IsAdmin, IsSupervisorOrAdmin, IsFieldCollector, IsOwnerOrSupervisorOrAdmin
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
    CropManagementSerializer,
    CropMeasurementSerializer,
    MediaSerializer,
    RegisterSerializer,
    UserSerializer,
    AuditLogSerializer
)
from rest_framework.generics import CreateAPIView
from .stats import get_dashboard_stats, get_moisture_trends, get_growth_analysis


class FieldViewSet(viewsets.ModelViewSet):
    queryset = Field.objects.all()
    serializer_class = FieldSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=False, methods=['get'])
    def map_data(self, request):
        """Return fields as GeoJSON for map visualization"""
        fields = self.get_queryset()
        serializer = FieldGeoSerializer(fields, many=True)
        return Response(serializer.data)


class ObservationViewSet(viewsets.ModelViewSet):
    queryset = Observation.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrSupervisorOrAdmin]
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
        
        # Check for staff/admin status directly for super-access
        if user.is_staff or user.is_superuser:
            return Observation.objects.all()

        try:
            # Match strictly against the role string in models.py
            role = user.userprofile.role
            if role in ['SUPERVISOR', 'ADMIN']:
                return Observation.objects.all()
            elif role == 'FIELD_COLLECTOR':
                return Observation.objects.filter(data_collector=user)
        except:
            pass

        # Default to only own observations if authenticated but role unknown
        return Observation.objects.filter(data_collector=user)
    
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


class CropManagementViewSet(viewsets.ModelViewSet):
    queryset = CropManagement.objects.all()
    serializer_class = CropManagementSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrSupervisorOrAdmin]


class CropMeasurementViewSet(viewsets.ModelViewSet):
    queryset = CropMeasurement.objects.all()
    serializer_class = CropMeasurementSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrSupervisorOrAdmin]


class MediaViewSet(viewsets.ModelViewSet):
    queryset = Media.objects.all()
    serializer_class = MediaSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrSupervisorOrAdmin]


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
        trends = get_moisture_trends(user=request.user, days=days)
        return Response(trends)
    
    @action(detail=False, methods=['get'])
    def growth_analysis(self, request):
        """Get crop growth analysis"""
        crop_variety = request.query_params.get('crop_variety', None)
        analysis = get_growth_analysis(crop_variety=crop_variety, user=request.user)
        return Response(analysis)


class RegisterView(CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer


class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing users.
    - List/Retrieve/Update (Admin only)
    - me (Authenticated users)
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]

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
    permission_classes = [IsAdmin]

   

