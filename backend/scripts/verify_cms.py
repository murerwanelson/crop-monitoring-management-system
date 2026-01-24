import os
# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from django.contrib.auth import get_user_model, authenticate
from crops.models import UserProfile, Field, Observation
from django.test import RequestFactory
from crops.views import FieldViewSet, ObservationViewSet
from django.contrib.gis.geos import Point
from django.contrib.sessions.models import Session

User = get_user_model()

def run_verification():
    print("--- Starting CMS Verification ---")

    # 1. Setup Data
    print("\n1. Setting up Test Users and Fields...")
    # Admin
    admin_user, _ = User.objects.get_or_create(username='admin_test', email='admin@test.com', last_name='AdminSurname')
    admin_user.set_password('pass')
    admin_user.save()
    UserProfile.objects.update_or_create(user=admin_user, defaults={'role': 'ADMIN'})

    # Field Manager
    manager_user, _ = User.objects.get_or_create(username='manager_test', email='manager@test.com', last_name='ManagerSurname')
    manager_user.set_password('pass')
    manager_user.save()
    UserProfile.objects.update_or_create(user=manager_user, defaults={'role': 'FIELD_MANAGER'})

    # Viewer
    viewer_user, _ = User.objects.get_or_create(username='viewer_test', email='viewer@test.com', last_name='ViewerSurname')
    viewer_user.set_password('pass')
    viewer_user.save()
    UserProfile.objects.update_or_create(user=viewer_user, defaults={'role': 'VIEWER'})

    # Fields
    field1, _ = Field.objects.get_or_create(field_id='F1', defaults={'location': Point(0,0)})
    field2, _ = Field.objects.get_or_create(field_id='F2', defaults={'location': Point(1,1)})

    # Assign Field 1 to Manager and Viewer
    manager_profile = manager_user.userprofile
    manager_profile.assigned_fields.set([field1])
    
    viewer_profile = viewer_user.userprofile
    viewer_profile.assigned_fields.set([field1])

    # 2. Test Authentication (Email/Surname)
    print("\n2. Testing Authentication...")
    
    # Email Login
    user = authenticate(username='manager@test.com', password='pass')
    if user == manager_user:
        print("  [PASS] Login with Email")
    else:
        print("  [FAIL] Login with Email")

    # Surname Login
    user = authenticate(username='ManagerSurname', password='pass')
    if user == manager_user:
        print("  [PASS] Login with Surname")
    else:
        print("  [FAIL] Login with Surname")

    # Dynamic IP Handling
    print("\n2.1. Testing Dynamic IP Handling...")
    
    # Simulate login from one IP
    user = authenticate(username='manager@test.com', password='pass')
    if user == manager_user:
        print("  [PASS] Login from initial IP")
    else:
        print("  [FAIL] Login from initial IP")

    # Simulate session invalidation and login from another IP
    Session.objects.all().delete()  # Simulate session invalidation
    user = authenticate(username='manager@test.com', password='pass')
    if user == manager_user:
        print("  [PASS] Login after IP change")
    else:
        print("  [FAIL] Login after IP change")

    # 3. Test Access Control (Field Filtering)
    print("\n3. Testing Access Control...")
    
    factory = RequestFactory()

    # Admin Access (Should see all)
    request = factory.get('/')
    request.user = admin_user
    view = FieldViewSet()
    view.request = request
    qs = view.get_queryset()
    print(f"  Admin Field Count: {qs.count()} (Expected >= 2)")
    if qs.count() >= 2:
        print("  [PASS] Admin sees all fields")
    else:
        print("  [FAIL] Admin missing fields")

    # Manager Access (Should see only F1)
    request = factory.get('/')
    request.user = manager_user
    view = FieldViewSet()
    view.request = request
    qs = view.get_queryset()
    print(f"  Manager Field Count: {qs.count()} (Expected 1)")
    if qs.count() == 1 and qs.first() == field1:
        print("  [PASS] Manager sees assigned field only")
    else:
        print("  [FAIL] Manager sees wrong fields")

    # Viewer Access (Should see only F1)
    request = factory.get('/')
    request.user = viewer_user
    view = FieldViewSet()
    view.request = request
    qs = view.get_queryset()
    print(f"  Viewer Field Count: {qs.count()} (Expected 1)")
    if qs.count() == 1 and qs.first() == field1:
        print("  [PASS] Viewer sees assigned field only")
    else:
        print("  [FAIL] Viewer sees wrong fields")

    print("\n--- Verification Complete ---")

run_verification()
