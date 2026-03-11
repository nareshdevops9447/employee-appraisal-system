"""Debug: simulate what the my-department endpoint returns for IT manager."""
from app import create_app
from models.appraisal_cycle import AppraisalCycle
from models.goal_template import GoalTemplate
from models.user_profile import UserProfile
from extensions import db

app = create_app('development')
with app.app_context():
    # Find Sam King (IT manager)
    sam = UserProfile.query.filter_by(email='sam.king@example.com').first()
    if not sam:
        print("Sam King not found!")
        exit()
    print(f"Sam King: dept_id={sam.department_id}")
    
    # Find active annual cycle
    cycle = AppraisalCycle.query.filter_by(status='active', cycle_type='annual').first()
    if not cycle:
        print("No active cycle!")
        exit()
    print(f"Cycle: {cycle.id[:8]} - {cycle.name}")
    
    # Query my-department templates (same logic as the endpoint)
    query = GoalTemplate.query.filter_by(cycle_id=cycle.id, is_active=True)
    if sam.department_id:
        query = query.filter(
            db.or_(
                GoalTemplate.department_id.is_(None),
                GoalTemplate.department_id == sam.department_id
            )
        )
    else:
        query = query.filter(GoalTemplate.department_id.is_(None))
    
    templates = query.order_by(GoalTemplate.display_order.asc()).all()
    print(f"\nTemplates for Sam (IT): {len(templates)}")
    for t in templates:
        dept = t.department.name if t.department else 'Org-wide'
        print(f"  [{dept}] {t.title}")
