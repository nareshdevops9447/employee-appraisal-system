import requests
import json
import uuid

# User Service URL
URL = "http://localhost:5002/api/users/sync"

def test_sync():
    manager_oid = f"oid-mgr-{uuid.uuid4().hex[:8]}"
    report_oid = f"oid-rpt-{uuid.uuid4().hex[:8]}"
    
    payload = {
        "auth_user_id": f"test-mgr-{uuid.uuid4().hex[:8]}",
        "email": "manager.test@example.com",
        "display_name": "Test Manager Auto",
        "role": "manager",
        "azure_oid": manager_oid,
        "direct_reports": [
            {
                "azure_oid": report_oid,
                "email": "report.test@example.com",
                "display_name": "Test Report Auto",
                "job_title": "Software Engineer",
                "department": "Engineering"
            }
        ]
    }
    
    print(f"Sending payload:\n{json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(URL, json=payload, timeout=5)
        print(f"\nStatus Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print("\n✅ Sync successful!")
            
            # Verify the report was created and linked
            # We can't easily check the DB from here without psycopg2, but we can try to fetch direct reports
            mgr_id = response.json().get('id')
            reports_url = f"http://localhost:5002/api/users/{mgr_id}/direct-reports"
            resp_reports = requests.get(reports_url)
            print(f"\nDirect Reports Fetch Status: {resp_reports.status_code}")
            print(f"Direct Reports: {resp_reports.text}")
            
            if resp_reports.status_code == 200 and len(resp_reports.json()) > 0:
                print("✅ Direct reports verification passed!")
            else:
                print("❌ Direct reports verification failed.")

        else:
            print("❌ Sync failed.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_sync()
