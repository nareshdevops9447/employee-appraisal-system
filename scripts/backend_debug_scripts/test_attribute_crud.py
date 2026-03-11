"""
Test Script for Phase 1: Attribute Template CRUD
================================================
Verifies that HR Admin can manage competency templates.
"""
import requests
import json

BASE_URL = "http://localhost:5000/api"

def test_phase_1():
    print("--- Testing Phase 1: Attribute Templates ---")
    
    # 1. Login as Alice (HR Admin)
    resp = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "alice.smith@example.com",
        "password": "password"
    })
    alice_token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {alice_token}"}
    print("Logged in as Alice Smith (HR Admin)")

    # 2. Create a Test Cycle
    cycle_resp = requests.post(f"{BASE_URL}/cycles", headers=headers, json={
        "name": "Phase 1 Test Cycle",
        "start_date": "2026-03-01",
        "end_date": "2026-12-31",
        "cycle_type": "annual"
    })
    cycle_id = cycle_resp.json()["id"]
    print(f"Created Test Cycle: {cycle_id}")

    # 3. Create an Attribute Template
    attr_resp = requests.post(f"{BASE_URL}/attributes/", headers=headers, json={
        "cycle_id": cycle_id,
        "title": "Technical Excellence",
        "description": "Demonstrates deep technical knowledge and high code quality.",
        "display_order": 1
    })
    try:
        attr_data = attr_resp.json()
    except Exception:
        print(f"FAILED to parse JSON. Response code: {attr_resp.status_code}")
        print(f"Response body: {attr_resp.text}")
        raise
    
    attr_id = attr_data["id"]
    print(f"Created Attribute Template: {attr_id} - {attr_data['title']}")

    # 4. List Attributes for Cycle
    list_resp = requests.get(f"{BASE_URL}/attributes/cycle/{cycle_id}", headers=headers)
    attrs = list_resp.json()
    print(f"Found {len(attrs)} attributes for cycle")
    assert len(attrs) >= 1
    assert any(a['title'] == "Technical Excellence" for a in attrs)

    # 5. Test Unauthorized Access (Login as David)
    david_resp = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "david.wilson@example.com",
        "password": "password"
    })
    david_token = david_resp.json()["access_token"]
    david_headers = {"Authorization": f"Bearer {david_token}"}
    
    # Try to delete the attribute as David
    del_resp = requests.delete(f"{BASE_URL}/attributes/{attr_id}", headers=david_headers)
    print(f"David trying to delete attribute: Status {del_resp.status_code} (Expected 403)")
    assert del_resp.status_code == 403

    # 6. Delete (Deactivate) as Alice
    alice_del_resp = requests.delete(f"{BASE_URL}/attributes/{attr_id}", headers=headers)
    print(f"Alice deleting attribute: {alice_del_resp.json()['message']}")
    
    # Verify it's gone from active list
    final_list_resp = requests.get(f"{BASE_URL}/attributes/cycle/{cycle_id}", headers=headers)
    assert not any(a['id'] == attr_id for a in final_list_resp.json())

    print("--- Phase 1 Verification Successful! ---")

if __name__ == "__main__":
    try:
        test_phase_1()
    except Exception as e:
        print(f"TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
