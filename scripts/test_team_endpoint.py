import requests
import json

# User Service URL
URL = "http://localhost:5002/api/users/team"

# ID of the manager created in previous test
MANAGER_ID = "test-mgr-0c00f0bf" 

def test_team_endpoint():
    headers = {
        "X-User-Id": MANAGER_ID,
        "Content-Type": "application/json"
    }
    
    print(f"Testing GET {URL} with X-User-Id: {MANAGER_ID}")
    
    try:
        response = requests.get(URL, headers=headers, timeout=5)
        print(f"\nStatus Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                print(f"\n✅ Success! Found {len(data)} team members.")
                print("First member:", data[0].get('email'))
            else:
                print("\n⚠️ Endpoint returned 200 but list is empty (or not a list).")
        else:
            print(f"\n❌ Failed. Status: {response.status_code}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_team_endpoint()
