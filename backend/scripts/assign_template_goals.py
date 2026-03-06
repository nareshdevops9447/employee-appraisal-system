"""
Retroactively assign template goals to all eligible employees.
"""
import os
import sys

# Fix DATABASE_URL for local execution on Windows
if os.name == 'nt' and 'DATABASE_URL' in os.environ:
    os.environ['DATABASE_URL'] = os.environ['DATABASE_URL'].replace('@postgres:', '@localhost:')

# Add parent directory to path to allow importing app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from extensions import db
from models.appraisal_cycle import AppraisalCycle
from models.appraisal import Appraisal
from services.provisioning import provision_appraisal_templates

def assign_template_goals():
    app = create_app('development')
    with app.app_context():
        print("--- Finding active annual cycle... ---")
        
        # Get active annual cycle
        active_cycle = AppraisalCycle.query.filter_by(
            cycle_type='annual',
            status='active'
        ).first()

        if not active_cycle:
            print("No active annual cycle found!")
            return
            
        print(f"Active Cycle Found: {active_cycle.name} (ID: {active_cycle.id})")
        
        # Get all appraisals for the active cycle
        appraisals = Appraisal.query.filter_by(
            cycle_id=active_cycle.id
        ).all()
        
        if not appraisals:
            print("No appraisals found for the active cycle.")
            return
            
        print(f"Found {len(appraisals)} appraisals in the active cycle. Re-provisioning templates...")
        
        count = 0
        for appraisal in appraisals:
            # Re-provision the goal templates (which is idempotent via existing_goal check)
            provision_appraisal_templates(appraisal)
            count += 1
            
        # Write to db
        db.session.commit()
        print(f"--- Successfully checked and assigned template goals for {count} employees ---")

if __name__ == "__main__":
    assign_template_goals()
