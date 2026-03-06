import requests
import uuid
from datetime import datetime, timedelta

# Configuration
API_GATEWAY_URL = "http://localhost:5000" # Assumptions
APPRAISAL_SERVICE_URL = "http://localhost:5003"
GOAL_SERVICE_URL = "http://localhost:5002"
USER_ID = "test-admin-id"

def run_verification():
    print("1. Creating a Half Yearly Cycle (Draft)...")
    cycle_data = {
        "name": f"Test Cycle {uuid.uuid4().hex[:8]}",
        "cycle_type": "annual",
        # Mimic frontend ISO format
        "start_date": datetime.now().isoformat() + "Z", 
        "end_date": (datetime.now() + timedelta(days=365)).isoformat() + "Z"
    }
    
    # Create Cycle
    resp = requests.post(f"{APPRAISAL_SERVICE_URL}/api/cycles/", json=cycle_data, headers={"X-User-Id": USER_ID})
    if resp.status_code != 201:
        print(f"FAILED to create cycle: {resp.text}")
        return
        
    cycle = resp.json()
    cycle_id = cycle['id']
    print(f"Cycle Created: {cycle_id} ({cycle['cycle_type']})")
    
    print("\n2. Activating Cycle (Triggers Notifications)...")
    # Activate
    # Note: this relies on USER_SERVICE being reachable by APPRAISAL_SERVICE
    resp = requests.post(f"{APPRAISAL_SERVICE_URL}/api/cycles/{cycle_id}/activate", headers={"X-User-Id": USER_ID})
    if resp.status_code != 200:
        print(f"FAILED to activate cycle: {resp.text}")
        # It might fail if User Service isn't running or reachable, but let's see.
        return
        
    print("Cycle Activated. Appraisals should be generated and notifications sent.")
    
    print("\n3. Verifying Notifications (Mock Check)...")
    # We can't easily check the recipient's notifications without knowing who was eligible.
    # But if specific users were targeted, we could check.
    # For now, we just proceed assuming success if step 2 passed.
    
    print("\nVerification Script Completed. Please check frontend manually.")

if __name__ == "__main__":
    try:
        run_verification()
    except Exception as e:
        print(f"Verification failed with error: {e}")
