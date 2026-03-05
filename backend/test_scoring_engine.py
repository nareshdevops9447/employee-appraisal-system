import sys
import uuid
import os

# Ensure the backend directory is in the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from app import create_app
from extensions import db
from models.user_profile import UserProfile
from models.appraisal_cycle import AppraisalCycle
from models.appraisal import Appraisal
from models.goal import Goal
from models.employee_attribute import EmployeeAttribute
from models.manager_review import ManagerReview
from models.appraisal_review import AppraisalReview
from models.attribute_template import AttributeTemplate
from services.review_service import ReviewService

def test_scoring():
    print("--- Testing Scoring Engine (Phase 5 Isolated) ---")
    app = create_app('development')
    with app.app_context():
        # Setup basic data
        charlie_id = str(uuid.uuid4())
        charlie = UserProfile(id=charlie_id, email="charlie.test@example.com", name="Charlie Test", is_active=True)
        
        cycle_id = str(uuid.uuid4())
        cycle = AppraisalCycle(id=cycle_id, name="Test Scoring Cycle", start_date="2026-01-01", end_date="2026-12-31", cycle_type="annual")
        
        appraisal_id = str(uuid.uuid4())
        appraisal = Appraisal(id=appraisal_id, employee_id=charlie_id, cycle_id=cycle_id, status="manager_review")
        
        db.session.add(charlie)
        db.session.add(cycle)
        db.session.add(appraisal)
        
        goal1_id = str(uuid.uuid4())
        goal1 = Goal(id=goal1_id, employee_id=charlie_id, appraisal_cycle_id=cycle_id, title="Goal 1", goal_type="performance", weight=60)
        
        goal2_id = str(uuid.uuid4())
        goal2 = Goal(id=goal2_id, employee_id=charlie_id, appraisal_cycle_id=cycle_id, title="Goal 2", goal_type="performance", weight=40)
        
        db.session.add(goal1)
        db.session.add(goal2)
        
        m_review1 = ManagerReview(appraisal_id=appraisal_id, goal_id=goal1_id, manager_rating=4, manager_comment="Good")
        m_review2 = ManagerReview(appraisal_id=appraisal_id, goal_id=goal2_id, manager_rating=5, manager_comment="Great")
        db.session.add(m_review1)
        db.session.add(m_review2)
        
        attr_template_id = str(uuid.uuid4())
        attr_temp = AttributeTemplate(id=attr_template_id, cycle_id=cycle_id, title="Teamwork")
        db.session.add(attr_temp)
        
        attr_rating = EmployeeAttribute(attribute_template_id=attr_template_id, cycle_id=cycle_id, employee_id=charlie_id, manager_rating=4)
        db.session.add(attr_rating)
        
        db.session.commit()
        
        try:
            print("Setup complete. Calculating scores...")
            results = ReviewService.calculate_scores(appraisal_id)
            print("Results:", results)
            
            assert results['goals_avg'] == 4.4, f"Expected goals_avg 4.4, got {results['goals_avg']}"
            assert results['attributes_avg'] == 4.0, f"Expected attributes_avg 4.0, got {results['attributes_avg']}"
            assert results['calculated'] == 4.28, f"Expected calculated 4.28, got {results['calculated']}"
            assert results['overall'] == 4, f"Expected overall 4, got {results['overall']}"
            
            print("--- Scoring Engine Verification Successful! ---")
        finally:
            print("Cleaning up...")
            db.session.delete(attr_rating)
            db.session.delete(attr_temp)
            db.session.delete(m_review1)
            db.session.delete(m_review2)
            db.session.delete(goal1)
            db.session.delete(goal2)
            
            app_rev = AppraisalReview.query.filter_by(appraisal_id=appraisal_id).first()
            if app_rev:
                 db.session.delete(app_rev)
                 
            db.session.delete(appraisal)
            db.session.delete(cycle)
            db.session.delete(charlie)
            db.session.commit()

if __name__ == "__main__":
    test_scoring()
