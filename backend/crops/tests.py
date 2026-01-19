from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.gis.geos import Point
from .models import Field, UserProfile, Observation

class CropMonitoringTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', password='password123')
        self.user_profile = UserProfile.objects.create(user=self.user, role='field_collector')
        self.client.force_authenticate(user=self.user)
        
        self.field = Field.objects.create(
            field_id='TEST-FIELD-1',
            location=Point(36.817223, -1.286389),
            created_by=self.user
        )

    def test_get_fields(self):
        """Test retrieving fields list"""
        response = self.client.get('/api/fields/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_create_observation(self):
        """Test creating an observation with nested data"""
        data = {
            'field': self.field.id,
            'data_collector': self.user.id,
            'observation_date': '2026-01-17',
            'crop_variety': 'Maize',
            'growth_stage': 'Seedling',
            'crop_management': {
                'sprayed': True,
                'pesticide_type': 'Test Pesticide',
                'fertilizer_applied': False
            },
            'crop_measurement': {
                'crop_height_cm': 15.5,
                'green_leaves': 4,
                'soil_moisture': 35.0
            }
        }
        response = self.client.post('/api/observations/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Observation.objects.count(), 1)
        self.assertEqual(Observation.objects.first().crop_variety, 'Maize')

    def test_dashboard_stats(self):
        """Test statistics endpoint"""
        response = self.client.get('/api/stats/dashboard/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_fields', response.data)
        self.assertIn('total_observations', response.data)

    def test_map_data(self):
        """Test GeoJSON map data endpoint"""
        response = self.client.get('/api/fields/map_data/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['type'], 'FeatureCollection')
        self.assertEqual(len(response.data['features']), 1)

    def test_user_registration(self):
        """Test the self-registration endpoint"""
        self.client.force_authenticate(user=None)
        data = {
            'username': 'newuser',
            'password': 'newpassword123',
            'email': 'new@example.com',
            'role': 'field_collector'
        }
        response = self.client.post('/api/register/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username='newuser').exists())

    def test_jwt_token(self):
        """Test JWT token acquisition"""
        data = {
            'username': 'testuser',
            'password': 'password123'
        }
        response = self.client.post('/api/token/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
