
"""
Seed script for Appraisal Service.
Creates a default "2025 Annual Review" cycle and sample questions.
"""
import sys
import os
from datetime import date, timedelta
import uuid

# Add current directory to path so imports work
sys.path.append(os.getcwd())

from app import create_app, db
from models.appraisal_cycle import AppraisalCycle
from models.appraisal_question import AppraisalQuestion

app = create_app()

def seed_data():
    with app.app_context():
        print("Seeding Appraisal Service...")
        
        # 1. Clear existing data
        db.drop_all()
        db.create_all()
        
        # 2. Create Cycle
        cycle = AppraisalCycle(
            id=str(uuid.uuid4()),
            name="2025 Annual Review",
            description="End of year performance review for all employees.",
            cycle_type='annual',
            status='active', # Active so we can test immediately
            start_date=date(2025, 1, 1),
            end_date=date(2025, 12, 31),
            self_assessment_deadline=date(2025, 11, 30),
            manager_review_deadline=date(2025, 12, 15),
            created_by='system'
        )
        db.session.add(cycle)
        db.session.commit()
        print(f"Created cycle: {cycle.name}")
        
        # 3. Create Questions
        questions = [
            {
                "text": "How have you contributed to our mission this period?",
                "type": "text",
                "category": "Impact",
                "order": 1
            },
            {
                "text": "Rate your effectiveness in working with beneficiaries.",
                "type": "rating",
                "category": "Performance",
                "order": 2
            },
            {
                "text": "What skills would you like to develop?",
                "type": "text",
                "category": "Development",
                "order": 3
            },
            {
                "text": "Mission Alignment",
                "type": "competency",
                "category": "Values",
                "order": 4
            },
            {
                "text": "Collaboration & Teamwork",
                "type": "competency",
                "category": "Values",
                "order": 5
            }
        ]
        
        for q_data in questions:
            q = AppraisalQuestion(
                cycle_id=cycle.id,
                question_text=q_data['text'],
                question_type=q_data['type'],
                category=q_data['category'],
                order=q_data['order']
            )
            db.session.add(q)
            
        db.session.commit()
        print(f"Created {len(questions)} questions.")

if __name__ == '__main__':
    seed_data()
