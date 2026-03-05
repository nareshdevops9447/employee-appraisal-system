import os
import sys

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))

from app import create_app
from extensions import db
from models.user import UserProfile, UserAuth
from models.goal import Goal
from models.appraisal import AppraisalCycle

app = create_app()

with app.app_context():
    # Find Tom
    auth = UserAuth.query.filter_by(email='tom.lane@example.com').first()
    if not auth:
        print("Tom not found")
        sys.exit(1)
        
    tom_id = auth.id
    print(f"Tom ID: {tom_id}")
    
    # Get all goals for Tom
    goals = Goal.query.filter_by(employee_id=tom_id).all()
    print(f"Total goals found for Tom: {len(goals)}")
    
    for g in goals:
        print(f"- [{g.id}] Title: '{g.title}' | Status: {g.approval_status} | Creator: {g.created_by} | Cycle: {g.appraisal_cycle_id}")
        
    # Get active cycles
    cycles = AppraisalCycle.query.filter_by(status='active').all()
    print("\nActive Cycles:")
    for c in cycles:
        print(f"- [{c.id}] {c.name} ({c.cycle_type})")
