import requests
import json
import os

# Configuration
GOAL_SERVICE_URL = "http://localhost:5004/api/goals"
# Mock user ID (replace with a valid one if needed, or rely on loose auth in dev)
USER_ID = "test-manager-id" 

def test_create_goal_missing_dates():
    print("Testing creation with missing dates...")
    payload = {
        "title": "Test Goal - Missing Dates",
        "category": "performance",
        "priority": "medium",
        # start_date and target_date missing or empty
        "start_date": "", 
        "target_date": ""
    }
    
    headers = {
        "Content-Type": "application/json",
        "X-User-Id": USER_ID,
        "X-User-Role": "manager"
    }
    
    try:
        response = requests.post(GOAL_SERVICE_URL, json=payload, headers=headers)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Request failed: {e}")

def test_create_goal_valid():
    print("\nTesting creation with valid dates...")
    payload = {
        "title": "Test Goal - Valid",
        "category": "performance",
        "priority": "medium",
        "start_date": "2026-01-01",
        "target_date": "2026-12-31"
    }
    
    headers = {
        "Content-Type": "application/json",
        "X-User-Id": USER_ID,
        "X-User-Role": "manager"
    }
    
    try:
        response = requests.post(GOAL_SERVICE_URL, json=payload, headers=headers)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Request failed: {e}")

def test_create_goal_iso_z():
    print("\nTesting creation with ISO Z dates...")
    payload = {
        "title": "Test Goal - ISO Z",
        "category": "performance",
        "priority": "medium",
        "start_date": "2026-01-01T00:00:00.000Z",
        "target_date": "2026-12-31T00:00:00.000Z"
    }
    
    headers = {
        "Content-Type": "application/json",
        "X-User-Id": USER_ID,
        "X-User-Role": "manager"
    }
    
    try:
        response = requests.post(GOAL_SERVICE_URL, json=payload, headers=headers)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Request failed: {e}")

def test_create_goal_null_employee_id():
    print("\nTesting creation with employee_id=None...")
    payload = {
        "title": "Test Goal - Null Employee ID",
        "category": "performance",
        "priority": "medium",
        "start_date": "2026-01-01",
        "target_date": "2026-12-31",
        "employee_id": None
    }
    
    headers = {
        "Content-Type": "application/json",
        "X-User-Id": USER_ID,
        "X-User-Role": "manager"
    }
    
    try:
        response = requests.post(GOAL_SERVICE_URL, json=payload, headers=headers)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    # test_create_goal_missing_dates()
    # test_create_goal_valid()
    # test_create_goal_iso_z()
    test_create_goal_null_employee_id()
