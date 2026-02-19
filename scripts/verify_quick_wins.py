import requests
import sys

SERVICES = {
    'auth-service': 'http://localhost:5001',
    'user-service': 'http://localhost:5002',
    'appraisal-service': 'http://localhost:5003',
    'goal-service': 'http://localhost:5004',
}

def verify_health_and_tracing():
    all_passed = True
    print(f"{'Service':<20} | {'Status':<10} | {'DB':<10} | {'Request ID':<36}")
    print("-" * 85)

    for name, url in SERVICES.items():
        try:
            response = requests.get(f"{url}/health", timeout=5)
            
            # Check Status Code
            if response.status_code != 200:
                print(f"{name:<20} | FAIL ({response.status_code}) | {'?':<10} | {'?':<36}")
                all_passed = False
                continue

            data = response.json()
            db_status = data.get('database', 'unknown')
            
            # Check Request ID Header
            req_id = response.headers.get('X-Request-ID', 'MISSING')
            
            if req_id == 'MISSING' or db_status != 'connected':
                all_passed = False

            print(f"{name:<20} | {'PASS' if response.status_code == 200 else 'FAIL':<10} | {db_status:<10} | {req_id:<36}")

        except requests.exceptions.ConnectionError:
            print(f"{name:<20} | DOWN       | {'?':<10} | {'?':<36}")
            all_passed = False
        except Exception as e:
            print(f"{name:<20} | ERROR      | {'?':<10} | {str(e):<36}")
            all_passed = False

    return all_passed

if __name__ == "__main__":
    print("Verifying Quick Wins Implementation...\n")
    if verify_health_and_tracing():
        print("\nAll checks passed! ✅")
        sys.exit(0)
    else:
        print("\nSome checks failed. ❌")
        sys.exit(1)
