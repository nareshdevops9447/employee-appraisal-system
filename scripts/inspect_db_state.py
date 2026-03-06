import requests
import sys

APPRAISAL_SERVICE_URL = "http://localhost:5003"
USER_SERVICE_URL = "http://localhost:5002"

def inspect_state():
    print("--- Inspecting Cycles ---")
    try:
        resp = requests.get(f"{APPRAISAL_SERVICE_URL}/api/cycles/")
        cycles = resp.json()
        active_cycle = None
        for c in cycles:
            print(f"ID: {c['id']}, Name: {c['name']}, Status: {c['status']}, Type: {c.get('cycle_type')}, Dates: {c['start_date']} - {c['end_date']}")
            if c['status'] == 'active':
                active_cycle = c
    except Exception as e:
        print(f"Error fetching cycles: {e}")
        return

    if not active_cycle:
        print("\nNO ACTIVE CYCLE FOUND.")
        return

    print(f"\n--- Active Cycle: {active_cycle['name']} ({active_cycle['id']}) ---")

    print("\n--- Inspecting Appraisals for Active Cycle ---")
    # We need to list appraisals. Assuming there is an endpoint or we can query by cycle.
    # Looking at routes/appraisals.py usually... but let's try a generic list if available or guessing.
    # Actually, let's just use the `cycles.py` logic which might not expose a list of all appraisals easily without admin rights.
    # But usually there is GET /api/appraisals/
    
    try:
        # Fetch all appraisals (admin route usually)
        # Using a specialized header if needed, but often local dev allows it.
        resp = requests.get(f"{APPRAISAL_SERVICE_URL}/api/appraisals/", headers={"X-User-Role": "admin"})
        if resp.status_code == 200:
            all_appraisals = resp.json()
            # Filter for this cycle
            cycle_appraisals = [a for a in all_appraisals if a['cycle_id'] == active_cycle['id']]
            print(f"Total Appraisals for Cycle: {len(cycle_appraisals)}")
            for a in cycle_appraisals[:5]: # Show first 5
                print(f"  - User: {a['employee_id']}, Status: {a['status']}, Manager: {a.get('manager_id')}")
        else:
            print(f"Could not list appraisals: {resp.status_code} {resp.text}")
    except Exception as e:
        print(f"Error fetching appraisals: {e}")

if __name__ == "__main__":
    inspect_state()
