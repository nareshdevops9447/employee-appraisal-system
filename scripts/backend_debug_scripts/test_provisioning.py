import os
import sys

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from extensions import db
from models.user_profile import UserProfile
from models.appraisal_cycle import AppraisalCycle
from models.goal_template import GoalTemplate
from models.attribute_template import AttributeTemplate
from models.appraisal import Appraisal
from models.goal import Goal
from models.employee_attribute import EmployeeAttribute
from routes.cycles import _create_appraisals_for_active_users

def test_provisioning():
    app = create_app()
    with app.app_context():
        print("--- Testing Auto-Provisioning Logic ---")
        
        from models.user_auth import UserAuth
        auth_admin = UserAuth.query.filter_by(role='hr_admin').first()
        auth_employee = UserAuth.query.filter_by(role='employee').first()
        
        if not auth_admin or not auth_employee:
            print("Please run seed_demo.py first to populate users.")
            return

        hr_admin = UserProfile.query.get(auth_admin.id)
        employee = UserProfile.query.get(auth_employee.id)
            
        print(f"Using Employee: (ID: {employee.id})")
        
        # 2. Create a test Appraisal Cycle
        cycle = AppraisalCycle(
            name='Test Provisioning Cycle 2026',
            description='Testing provisioning logic',
            start_date='2026-06-01',
            end_date='2026-12-31',
            status='draft',
            created_by=hr_admin.id
        )
        db.session.add(cycle)
        db.session.commit()
        print(f"Created Cycle: {cycle.id}")
        
        # 3. Create 5 Goal Templates
        for i in range(1, 6):
            gt = GoalTemplate(
                cycle_id=cycle.id,
                title=f'Mandatory Performance Goal {i}',
                description=f'Description for performance goal {i}',
                created_by=hr_admin.id
            )
            db.session.add(gt)
            
        # 4. Create 5 Attribute Templates
        for i in range(1, 6):
            at = AttributeTemplate(
                cycle_id=cycle.id,
                title=f'Mandatory Behavioral Attribute {i}',
                description=f'Description for behavioral attribute {i}',
                created_by=hr_admin.id
            )
            db.session.add(at)
            
        db.session.commit()
        print("Created 5 GoalTemplates and 5 AttributeTemplates")
        
        # 5. Activate Cycle & Run Provisioning
        cycle.status = 'active'
        db.session.commit()
        
        print("Activating cycle and creating appraisals...")
        # Simulating cycle activation flow
        _create_appraisals_for_active_users(cycle.id)
        
        # Wait, I should also commit since _create_appraisals_for_active_users commits
        
        print("Verification:")
        appraisal = Appraisal.query.filter_by(cycle_id=cycle.id, employee_id=employee.id).first()
        print(f"Appraisal created: {appraisal is not None}")
        
        if appraisal:
            goals = Goal.query.filter_by(employee_id=employee.id, appraisal_cycle_id=cycle.id).all()
            attributes = EmployeeAttribute.query.filter_by(employee_id=employee.id, cycle_id=cycle.id).all()
            
            print(f"Goals Provisioned: {len(goals)}")
            for g in goals:
                print(f" - {g.title} (Weight: {g.weight}%)")
                
            print(f"Attributes Provisioned: {len(attributes)}")
            for a in attributes:
                print(f" - ID: {a.id}")
                
            if len(goals) == 5 and len(attributes) == 5:
                print("SUCCESS: 5 goals and 5 attributes were automatically provisioned!")
            else:
                print("FAILURE: Did not provision 5 goals and 5 attributes correctly.")
        
if __name__ == "__main__":
    test_provisioning()
