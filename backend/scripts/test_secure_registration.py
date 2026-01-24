#!/usr/bin/env python
"""
Test script to verify secure registration with field_collector role assignment.
Tests parameter pollution prevention and JWT token generation.
"""

import requests
import json

BASE_URL = "http://localhost:8000/api"

def test_normal_registration():
    """Test 1: Normal registration - Should succeed"""
    print("\n=== TEST 1: Normal Registration ===")
    data = {
        "username": "field_worker_001",
        "password": "securepass123",
        "email": "worker001@fieldapp.com",
        "first_name": "John",
        "last_name": "Doe"
    }
    
    response = requests.post(f"{BASE_URL}/register/", json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 201:
        result = response.json()
        assert result['user']['role'] == 'FIELD_COLLECTOR', "Role should be FIELD_COLLECTOR"
        assert result['user']['permissions'] == ["write_logs", "upload_gps", "access_camera"], "Default permissions missing"
        assert 'access' in result['tokens'], "Access token missing"
        assert 'refresh' in result['tokens'], "Refresh token missing"
        print("✅ PASSED: User created with correct role and permissions, JWT tokens returned")
    else:
        print(" FAILED: Registration failed")

def test_parameter_pollution():
    """Test 2: Parameter Pollution Attack - Should ignore role in request"""
    print("\n=== TEST 2: Parameter Pollution Attack ===")
    data = {
        "username": "hacker_001",
        "password": "securepass123",
        "email": "hacker@test.com",
        "first_name": "Evil",
        "last_name": "Hacker",
        "role": "ADMIN"  # Attempt to set role to ADMIN
    }
    
    response = requests.post(f"{BASE_URL}/register/", json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 201:
        result = response.json()
        assert result['user']['role'] == 'FIELD_COLLECTOR', "Security breach! User got ADMIN role"
        assert result['user']['role'] != 'ADMIN', "Security breach! Role was set from client"
        print("✅ PASSED: Parameter pollution prevented - user got FIELD_COLLECTOR, not ADMIN")
    else:
        print("❌ FAILED: Registration failed")

def test_duplicate_email():
    """Test 3: Duplicate Email - Should fail"""
    print("\n=== TEST 3: Duplicate Email Validation ===")
    data = {
        "username": "worker_002",
        "password": "securepass123",
        "email": "worker001@fieldapp.com",  # Duplicate email
        "first_name": "Jane",
        "last_name": "Smith"
    }
    
    response = requests.post(f"{BASE_URL}/register/", json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 400:
        print("✅ PASSED: Duplicate email rejected")
    else:
        print("❌ FAILED: Duplicate email was accepted")

def test_jwt_token_validity():
    """Test 4: JWT Token - Should be valid and contain role"""
    print("\n=== TEST 4: JWT Token Validity ===")
    # Register a new user
    data = {
        "username": "token_test_user",
        "password": "securepass123",
        "email": "tokentest@fieldapp.com",
        "first_name": "Token",
        "last_name": "Test"
    }
    
    response = requests.post(f"{BASE_URL}/register/", json=data)
    if response.status_code == 201:
        result = response.json()
        access_token = result['tokens']['access']
        
        # Try to access protected endpoint with token
        headers = {"Authorization": f"Bearer {access_token}"}
        me_response = requests.get(f"{BASE_URL}/users/me/", headers=headers)
        
        print(f"Protected Endpoint Status: {me_response.status_code}")
        if me_response.status_code == 200:
            user_data = me_response.json()
            print(f"User Data: {json.dumps(user_data, indent=2)}")
            print("✅ PASSED: JWT token is valid and working")
        else:
            print("❌ FAILED: JWT token is invalid")
    else:
        print("❌ FAILED: Could not register user for token test")

if __name__ == "__main__":
    print("=" * 60)
    print("SECURE REGISTRATION SECURITY TESTS")
    print("=" * 60)
    
    try:
        test_normal_registration()
        test_parameter_pollution()
        test_duplicate_email()
        test_jwt_token_validity()
        
        print("\n" + "=" * 60)
        print("ALL TESTS COMPLETED")
        print("=" * 60)
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
