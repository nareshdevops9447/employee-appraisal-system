import requests
import json
import uuid
import datetime
import jwt

# Configure these to match docker-compose
JWT_SECRET = "" 
JWT_ALGORITHM = "HS256"

# Direct access to Goal Service (bypass Gateway for backend logic test)
URL = "http://localhost:5004/api/goals"
MANAGER_ID = "test-mgr-0c00f0bf"
REPORT_ID = "9f2c5fe5-792f-45dc-aeb6-bed579fb376b"

def test_goal_creation():
    # Goal Service expects X-User-Id, not JWT (Gateway handles JWT)
    headers = {
        "X-User-Id": MANAGER_ID,
        "Content-Type": "application/json"
    }
    
    payload = {
        "title": "Test Goal Assignment",
        "description": "Goal assigned via API test",
        "category": "performance",
        "priority": "high",
        "start_date": "2023-01-01",
        "target_date": "2023-12-31",
        "employee_id": REPORT_ID 
    }
    
    print(f"Testing POST {URL} with X-User-Id: {MANAGER_ID}")
    
    try:
        response = requests.post(URL, headers=headers, json=payload, timeout=5)
        print(f"\nStatus Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 201 or response.status_code == 200:
            data = response.json()
            print(f"\n✅ Goal created successfully! ID: {data.get('id')}")
            print(f"Assigned To: {data.get('employee_id')}")
        else:
            print(f"\n❌ Failed. Status: {response.status_code}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_goal_creation()
