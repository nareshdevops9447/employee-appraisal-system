"""
Time Travel & Progression Simulation Script
===========================================
Fast-forwards David Wilson's timeline and populates a weighted appraisal.
"""
import os
import sys
from datetime import date, datetime, timezone
from dateutil.relativedelta import relativedelta

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from extensions import db
from models.user_profile import UserProfile
from models.appraisal import Appraisal
from models.appraisal_cycle import AppraisalCycle
from models.goal import Goal
from models.attribute_template import AttributeTemplate
from models.employee_attribute import EmployeeAttribute
from services.review_service import ReviewService

def simulate():
    app = create_app('development')
    with app.app_context():
        print("--- Initiating Time Travel Simulation ---")
        
        # 1. Find Alice and David
        alice = UserProfile.query.filter_by(email="alice.smith@example.com").first()
        david = UserProfile.query.filter_by(email="david.wilson@example.com").first()
        if not david or not alice:
            print("ERROR: David or Alice not found. Please run reset-db.bat first.")
            return

        # 2. Backdate David's joining date
        david.start_date = date.today() - relativedelta(months=6)
        print(f"Set David's start date to: {david.start_date} (Eligible for Annual Cycle)")

        # 3. Find or Create the active Annual cycle
        annual_cycle = AppraisalCycle.query.filter_by(status='active', cycle_type='annual').first()
        if not annual_cycle:
            print("Creating new Annual 2026 Cycle...")
            annual_cycle = AppraisalCycle(
                name="2026 Annual review",
                cycle_type="annual",
                status="active",
                start_date=date(2026, 1, 1),
                end_date=date(2026, 12, 31),
                self_assessment_deadline=datetime(2026, 6, 30),
                manager_review_deadline=datetime(2026, 7, 31)
            )
            db.session.add(annual_cycle)
            db.session.commit()
            
        print(f"Using cycle: {annual_cycle.name} ({annual_cycle.id})")

        # 4. Seed Attribute Templates (Tier 1) if missing
        attributes_data = [
            ("Commitment to MSF Principles", "Upholds humanitarian charter and values in all work."),
            ("Teamwork & Collaboration", "Works effectively across departments and with field teams."),
            ("Accountability & Integrity", "Takes responsibility for actions and acts with honesty."),
            ("Adaptability", "Remains effective in changing environments and roles."),
            ("Communication & Respect", "Listens actively and speaks with kindness and clarity.")
        ]
        
        for i, (title, desc) in enumerate(attributes_data):
            tmpl = AttributeTemplate.query.filter_by(cycle_id=annual_cycle.id, title=title).first()
            if not tmpl:
                tmpl = AttributeTemplate(
                    cycle_id=annual_cycle.id,
                    title=title,
                    description=desc,
                    display_order=i,
                    created_by=alice.id
                )
                db.session.add(tmpl)
        db.session.commit()

        # 5. Create or Update David's Appraisal
        appraisal = Appraisal.query.filter_by(
            employee_id=david.id, 
            cycle_id=annual_cycle.id
        ).first()

        if not appraisal:
            appraisal = Appraisal(
                employee_id=david.id,
                cycle_id=annual_cycle.id,
                manager_id=david.manager_id,
                eligibility_status='eligible',
                eligibility_reason='Probation successfully completed (Simulation)',
            )
            db.session.add(appraisal)
            db.session.flush()

        # 6. Create Weighted Performance Goals (Tier 2)
        # Clear existing to ensure fresh start
        Goal.query.filter_by(employee_id=david.id, appraisal_cycle_id=annual_cycle.id).delete()
        
        goal1 = Goal(
            employee_id=david.id,
            appraisal_cycle_id=annual_cycle.id,
            title="Drive Regional Sales Growth",
            goal_type="performance",
            weight=60,
            manager_rating=4,
            status="completed",
            approval_status="approved"
        )
        
        goal2 = Goal(
            employee_id=david.id,
            appraisal_cycle_id=annual_cycle.id,
            title="Optimize CRM Usage",
            goal_type="performance",
            weight=40,
            manager_rating=5,
            status="completed",
            approval_status="approved"
        )
        
        db.session.add_all([goal1, goal2])

        # 7. Rate HR Attributes (Tier 1) for David
        all_templates = AttributeTemplate.query.filter_by(cycle_id=annual_cycle.id).all()
        for tmpl in all_templates:
            er = EmployeeAttribute.query.filter_by(
                employee_id=david.id,
                cycle_id=annual_cycle.id,
                attribute_template_id=tmpl.id
            ).first()
            if not er:
                er = EmployeeAttribute(
                    employee_id=david.id,
                    cycle_id=annual_cycle.id,
                    attribute_template_id=tmpl.id
                )
                db.session.add(er)
            er.manager_rating = 4
            er.manager_comment = "Displays MSF values consistently."

        db.session.commit()

        # 8. Trigger Calculation Engine (Phase 3)
        results = ReviewService.calculate_scores(appraisal.id)

        # 9. Finalize Appraisal status
        appraisal.status = 'completed'
        appraisal.meeting_date = datetime.now(timezone.utc)
        db.session.commit()
        
        print(f"--- Simulation Complete ---")
        print(f"David Wilson's Weighted Results:")
        print(f"  - Goals Avg (70%): {results['goals_avg']}")
        print(f"  - Attributes Avg (30%): {results['attributes_avg']}")
        print(f"  - Final Calculated: {results['calculated']}")
        print(f"  - Final Rating: {results['overall']}")
        print(f"Persona: david.wilson@example.com / password")

if __name__ == "__main__":
    simulate()
