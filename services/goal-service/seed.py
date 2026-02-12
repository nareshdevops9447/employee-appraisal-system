
"""
Seed script for Goal Service.
Creates sample goals for testing.
"""
import sys
import os
from datetime import date, timedelta
import uuid

# Add current directory to path so imports work
sys.path.append(os.getcwd())

from app import create_app, db
from models.goal import Goal
from models.key_result import KeyResult

app = create_app()

def seed_data():
    with app.app_context():
        print("Seeding Goal Service...")
        
        # 1. Clear existing data
        db.drop_all()
        db.create_all()
        
        # We need a user ID to attach goals to. 
        # In a real seed, we might fetch from User Service or just generate a placeholder
        # and rely on the user manually creating goals later for real users.
        # For validation, let's use a dummy ID that matches the admin user we use for testing if possible,
        # or just random ones. 
        # The prompt asked for specific examples.
        
        dummy_user_id = str(uuid.uuid4()) # We'll just create them floating for now, or use a known ID if we had one.
        
        goals = [
            {
                "title": "Increase beneficiary reach by 20% in Q3",
                "category": "mission_aligned",
                "priority": "high",
                "status": "active",
                "start_date": date.today(),
                "target_date": date.today() + timedelta(days=90),
                "krs": [
                    {"title": "Reach 1000 new beneficiaries", "target": 1000, "unit": "count"},
                    {"title": "Expand to 2 new regions", "target": 2, "unit": "count"}
                ]
            },
            {
                "title": "Complete safeguarding training certification",
                "category": "development",
                "priority": "critical",
                "status": "in_progress",
                "start_date": date.today() - timedelta(days=10),
                "target_date": date.today() + timedelta(days=20),
                "krs": [
                    {"title": "Watch all training modules", "target": 100, "unit": "percentage", "current": 50},
                    {"title": "Pass final exam", "target": 1, "unit": "boolean"}
                ]
            },
            {
                "title": "Process 95% of grant applications within SLA",
                "category": "performance",
                "priority": "medium",
                "status": "active",
                "start_date": date.today(),
                "target_date": date.today() + timedelta(days=180),
                "krs": []
            }
        ]
        
        for g_data in goals:
            g = Goal(
                employee_id=dummy_user_id,
                title=g_data['title'],
                category=g_data['category'],
                priority=g_data['priority'],
                status=g_data['status'],
                start_date=g_data['start_date'],
                target_date=g_data['target_date'],
                created_by=dummy_user_id
            )
            db.session.add(g)
            db.session.commit()
            
            for kr_data in g_data['krs']:
                kr = KeyResult(
                    goal_id=g.id,
                    title=kr_data['title'],
                    target_value=kr_data['target'],
                    current_value=kr_data.get('current', 0),
                    unit=kr_data['unit'],
                    due_date=g.target_date
                )
                db.session.add(kr)
            
        db.session.commit()
        print(f"Created {len(goals)} sample goals.")

if __name__ == '__main__':
    seed_data()
