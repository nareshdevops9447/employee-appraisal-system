import requests
import json
import uuid
import time

# Configuration
GOAL_SERVICE_URL = "http://localhost:5004"
MANAGER_ID = "test-mgr-approval"
MANAGER_ROLE = "manager"
EMPLOYEE_ID = "test-emp-approval"
EMPLOYEE_ROLE = "employee"

def test_approval_workflow():
    print("🚀 Starting Goal Approval Workflow Test\n")

    # 1. Create a Goal (Draft)
    print("1️⃣  Creating Goal (Manager)...")
    create_payload = {
        "title": f"Approval Test Goal {uuid.uuid4().hex[:6]}",
        "description": "Testing the approval workflow",
        "category": "performance",
        "priority": "high",
        "start_date": "2023-01-01",
        "target_date": "2023-12-31",
        "employee_id": EMPLOYEE_ID
    }
    headers_mgr = {
        "X-User-Id": MANAGER_ID,
        "X-User-Role": MANAGER_ROLE,
        "Content-Type": "application/json"
    }
    
    resp = requests.post(f"{GOAL_SERVICE_URL}/api/goals", json=create_payload, headers=headers_mgr)
    if resp.status_code not in [200, 201]:
        print(f"❌ Failed to create goal: {resp.status_code} {resp.text}")
        return
    
    goal_data = resp.json()
    goal_id = goal_data['id']
    print(f"✅ Goal Created: {goal_id} (Status: {goal_data.get('approval_status', 'N/A')})")

    current_status = goal_data.get('approval_status')
    if current_status == 'pending':
        print("ℹ️  Goal is already pending approval. Skipping Submit step.")
    else:
        # 2. Submit for Approval
        print("\n2️⃣  Submitting for Approval (Manager)...")
        resp = requests.post(f"{GOAL_SERVICE_URL}/api/goals/{goal_id}/submit", headers=headers_mgr)
        if resp.status_code == 200:
            print(f"✅ Goal Submitted. New Status: {resp.json().get('approval_status')}")
        else:
            print(f"❌ Submit failed: {resp.status_code} {resp.text}")
            return

    # 3. Approve Goal (Employee)
    print("\n3️⃣  Approving Goal (Employee)...")
    headers_emp = {
        "X-User-Id": EMPLOYEE_ID,
        "X-User-Role": EMPLOYEE_ROLE,
        "Content-Type": "application/json"
    }
    resp = requests.post(f"{GOAL_SERVICE_URL}/api/goals/{goal_id}/approve", headers=headers_emp)
    if resp.status_code == 200:
        print(f"✅ Goal Approved. New Status: {resp.json().get('approval_status')}")
    else:
        print(f"❌ Approve failed: {resp.status_code} {resp.text}")
        return

    # 4. Check Audit Trail
    print("\n4️⃣  Checking Audit Trail...")
    resp = requests.get(f"{GOAL_SERVICE_URL}/api/goals/{goal_id}/audit", headers=headers_mgr)
    if resp.status_code == 200:
        audits = resp.json()
        print(f"✅ Audit Trail Retrieved ({len(audits)} records):")
        for audit in audits:
            print(f"   - {audit['timestamp']}: {audit['old_status']} -> {audit['new_status']} by {audit['changed_by_role']}")
    else:
        print(f"❌ Failed to fetch audit: {resp.status_code}")

    # 5. Check Notifications
    print("\n5️⃣  Checking Notifications (Employee)...")
    resp = requests.get(f"{GOAL_SERVICE_URL}/api/notifications", headers=headers_emp) # Check for employee notifications
    if resp.status_code == 200:
        notifs = resp.json()
        print(f"✅ Notifications ({len(notifs)}):")
        for n in notifs[:3]: # Show first 3
            print(f"   - {n['event']} (Read: {n['is_read']})")
    else:
        print(f"❌ Failed to fetch notifications: {resp.status_code}")

if __name__ == "__main__":
    try:
        test_approval_workflow()
    except Exception as e:
        print(f"❌ Unexpected Error: {e}")
