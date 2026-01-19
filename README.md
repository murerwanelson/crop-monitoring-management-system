# Crop Monitoring Management System

A full-stack agricultural data collection and analysis platform with offline-capable mobile app, REST API backend, and web dashboard.

## Architecture

```
Flutter Mobile App (Android)
          ↓
REST API (Token Authentication)
          ↓
Django + DRF Backend
          ↓
PostgreSQL + PostGIS
          ↑
React Web Dashboard
```

## Features

### Backend API (Django + DRF + PostGIS)
- ✅ Role-based access control (Field Collector, Supervisor, Admin)
- ✅ Nested serializers for complete observation data
- ✅ File upload API with GPS metadata
- ✅ Statistics and analytics endpoints
- ✅ GeoJSON map data endpoint
- ✅ PostGIS spatial database

### Mobile App (Flutter)
- ✅ Comprehensive observation form with all required fields
- ✅ GPS auto-capture for location tagging
- ✅ Camera integration for crop photos
- ✅ Offline-first with local SQLite database
- ✅ Auto-sync when connectivity restored
- ✅ State management with Provider

### Web Dashboard (React)
- ✅ Authentication with protected routes
- ✅ Interactive dashboard with charts (Recharts)
- ✅ Data table with search, filter, pagination
- ✅ Material-UI responsive design
- ✅ Statistics visualization
- ✅ CRUD operations for observations

## Quick Start

### Prerequisites
- Python 3.13+ with virtual environment
- PostgreSQL with PostGIS extension
- Flutter SDK
- Node.js and npm

### Backend Setup
```bash
cd backend
source env/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Mobile App Setup
```bash
cd mobile/crop_monitoring_mobile
flutter pub get
flutter run
```

### Web Dashboard Setup
```bash
cd web/crop-monitoring-web
npm install
npm start
```

## API Endpoints

- `GET /api/fields/` - List all fields
- `GET /api/fields/map_data/` - GeoJSON for map visualization
- `GET /api/observations/` - List observations (role-filtered)
- `POST /api/observations/` - Create observation with nested data
- `POST /api/observations/{id}/upload_media/` - Upload images for observation
- `GET /api/stats/dashboard/?days=30` - Dashboard statistics
- `GET /api/stats/moisture_trends/?days=30` - Soil moisture trends
- `GET /api/stats/growth_analysis/?crop_variety=Maize` - Growth metrics

## Authentication

Create user tokens:
```bash
python manage.py drf_create_token <username>
```

Use token in requests:
```
Authorization: Token <your_token>
```

## Project Structure

```
crop-monitoring-management-system/
├── backend/                  # Django API
│   ├── crops/               # Main app
│   │   ├── models.py        # Database models
│   │   ├── serializers.py   # DRF serializers
│   │   ├── views.py         # API views
│   │   ├── permissions.py   # Role-based permissions
│   │   └── stats.py         # Analytics functions
│   └── config/              # Django settings
├── mobile/                  # Flutter app
│   └── crop_monitoring_mobile/
│       └── lib/
│           ├── screens/     # UI screens
│           ├── services/    # API, DB, sync
│           └── providers/   # State management
└── web/                     # React dashboard
    └── crop-monitoring-web/
        └── src/
            ├── pages/       # Route pages
            ├── components/  # Reusable components
            ├── contexts/    # React contexts
            └── services/    # API client
```

## Technologies Used

**Backend:**
- Django 6.0.1
- Django REST Framework 3.16.1
- PostGIS (spatial database)
- djangorestframework-gis
- Pillow (image processing)

**Mobile:**
- Flutter SDK
- geolocator (GPS)
- image_picker (camera)
- sqflite (local database)
- connectivity_plus (network status)

**Web:**
- React 19.2.3
- Material-UI
- Recharts (data visualization)
- React Router
- Axios (HTTP client)

## Screenshots

<!-- Add screenshots here after testing -->

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/improvement`)
3. Commit changes (`git commit -am 'Add new feature'`)
4. Push to branch (`git push origin feature/improvement`)
5. Create a Pull Request

## License

This project is licensed under the MIT License.

## Contact

For questions or support, please contact the development team.
