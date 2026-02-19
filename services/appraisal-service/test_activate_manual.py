from app import create_app
from extensions import db
from models.appraisal_cycle import AppraisalCycle
import requests

app = create_app()

CYCLE_NAME = 'Annual Review 2026'

with app.app_context():
    cycle = AppraisalCycle.query.filter_by(name=CYCLE_NAME).first()
    if not cycle:
        print(f"Cycle '{CYCLE_NAME}' not found")
    else:
        print(f"Attempting to activate cycle: {cycle.name} ({cycle.id}) Status: {cycle.status}")
        
        # Check for conflicts manually
        active = AppraisalCycle.query.filter(AppraisalCycle.status == 'active', AppraisalCycle.id != cycle.id).first()
        if active:
             print(f"CONFLICT: {active.name} is already active.")
        else:
             # Simulate request context for header forwarding? The script won't have it.
             # But the activation status commit happens BEFORE the user-service call.
             # So if it fails, it must be the commit or the conflict check.
             
             try:
                 cycle.status = 'active'
                 db.session.commit()
                 print("Activation successful in DB!")
             except Exception as e:
                 print(f"Activation failed: {e}")
