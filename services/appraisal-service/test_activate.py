from app import create_app
from extensions import db
from models.appraisal_cycle import AppraisalCycle
import requests

app = create_app()

def test_activate(cycle_id):
    with app.app_context():
        # Check current status
        c = AppraisalCycle.query.get(cycle_id)
        if not c:
            print(f"Cycle {cycle_id} not found")
            return
            
        print(f"Target cycle: {c.name} ({c.id}) Status: {c.status}")
        
        # Check for other active cycles
        active = AppraisalCycle.query.filter(
            AppraisalCycle.status == 'active', 
            AppraisalCycle.id != cycle_id
        ).first()
        
        if active:
            print(f"BLOCKER: Found active cycle: {active.name} ({active.id})")
        else:
            print("No other active cycles found. Proceeding to simulate activation logic...")
            
            # Simulate the logic in routes/cycles.py
            try:
                c.status = 'active'
                db.session.commit()
                print("Commit successful. Status is now ACTIVE.")
                
                # Verify calling user service (simulated check)
                user_service_url = app.config.get('USER_SERVICE_URL')
                print(f"USER_SERVICE_URL: {user_service_url}")
                
                if not user_service_url:
                     print("WARNING: USER_SERVICE_URL is missing!")
                     
                try:
                    resp = requests.get(f"{user_service_url}/api/users", params={'per_page': 1}, timeout=5)
                    print(f"User Service Check: Status {resp.status_code}")
                except Exception as e:
                    print(f"User Service Check Failed: {e}")
                    
            except Exception as e:
                db.session.rollback()
                print(f"Activation Failed: {e}")

# Use one of the draft cycles from previous debug output
test_activate('46de0a24-1db6-46b6-92d6-482d5bd87d0d')
