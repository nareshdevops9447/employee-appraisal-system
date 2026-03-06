"""Test the active cycle endpoints."""
import requests
import json

BASE = "http://localhost:5003"

def pp(label, resp):
    print(f"\n{'='*60}")
    print(f"{label}  =>  Status: {resp.status_code}")
    print(json.dumps(resp.json(), indent=2, default=str))

# 1. Check GET /api/cycles/active
resp = requests.get(f"{BASE}/api/cycles/active")
pp("GET /api/cycles/active", resp)

# 2. Check GET /api/appraisals/active (as a random employee with no appraisal)
resp = requests.get(
    f"{BASE}/api/appraisals/active",
    headers={"X-User-Id": "random-employee-12345"}
)
pp("GET /api/appraisals/active (random employee)", resp)

# 3. List all cycles
resp = requests.get(f"{BASE}/api/cycles")
pp("GET /api/cycles (all)", resp)
cycles = resp.json()
active_count = sum(1 for c in cycles if c.get('status') == 'active')
print(f"\n=> Active cycles count: {active_count}")

if active_count == 0:
    print("\nNo active cycle found. Creating and activating one for testing...")
    # Create a test cycle
    create_resp = requests.post(f"{BASE}/api/cycles/", json={
        "name": "Test Cycle 2026",
        "start_date": "2026-01-01",
        "end_date": "2026-12-31",
        "cycle_type": "annual"
    }, headers={"X-User-Id": "test-admin"})
    pp("POST /api/cycles (create)", create_resp)
    cycle_id = create_resp.json().get("id")

    # Activate it
    act_resp = requests.post(f"{BASE}/api/cycles/{cycle_id}/activate",
                             headers={"X-User-Id": "test-admin"})
    pp(f"POST /api/cycles/{cycle_id}/activate", act_resp)

    # Now re-check active
    resp = requests.get(f"{BASE}/api/cycles/active")
    pp("GET /api/cycles/active (after activation)", resp)

    # And appraisals/active for random employee
    resp = requests.get(
        f"{BASE}/api/appraisals/active",
        headers={"X-User-Id": "random-employee-12345"}
    )
    pp("GET /api/appraisals/active (random employee, after activation)", resp)

print("\n✅ Test complete.")
