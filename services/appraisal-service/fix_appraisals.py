import requests
from app import create_app
from extensions import db
from models.appraisal_cycle import AppraisalCycle
from models.appraisal import Appraisal

app = create_app()

CYCLE_ID = '46de0a24-1db6-46b6-92d6-482d5bd87d0d'

def fix_appraisals():
    with app.app_context():
        cycle = AppraisalCycle.query.get(CYCLE_ID)
        if not cycle:
            print("Cycle not found")
            return
            
        print(f"Fixing appraisals for cycle: {cycle.name}")
        
        # Simulate fetching users from user-service
        # We need to manually call user-service with X headers
        user_service_url = app.config.get('USER_SERVICE_URL')
        headers = {
            'X-User-Id': 'system',  # Simulate system/admin user
            'X-User-Role': 'super_admin'
        }
        
        print(f"Fetching users from {user_service_url}...")
        try:
            resp = requests.get(
                f"{user_service_url}/api/users",
                params={'is_active': 'true', 'per_page': 1000}, 
                headers=headers, 
                timeout=10
            )
            resp.raise_for_status()
            users = resp.json().get('users', [])
            print(f"Found {len(users)} users.")
            
            count = 0
            for user in users:
                exists = Appraisal.query.filter_by(
                    cycle_id=CYCLE_ID, employee_id=user['id']
                ).first()
                
                if not exists:
                    appraisal = Appraisal(
                        cycle_id=CYCLE_ID,
                        employee_id=user['id'],
                        manager_id=user.get('manager_id'),
                        status='not_started',
                    )
                    db.session.add(appraisal)
                    count += 1
            
            db.session.commit()
            print(f"Successfully created {count} appraisals.")
            
        except Exception as e:
            print(f"Error: {e}")

if __name__ == '__main__':
    fix_appraisals()
