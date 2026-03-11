
from extensions import db
from models.leave_type import LeaveType
from models.leave_balance import LeaveBalance
from models.user_profile import UserProfile
import uuid

def seed_leave_module():
    """Seed base leave types and initial balances for demo users."""
    print("Seeding leave module...")
    
    # 1. Create Base Leave Types
    base_types = [
        {
            "name": "Annual Leave",
            "description": "Statutory UK annual leave (28 inclusive of bank holidays).",
            "default_days_per_year": 28,
            "is_paid": True,
            "requires_approval": True
        },
        {
            "name": "Sick Leave",
            "description": "Paid leave for health related issues.",
            "default_days_per_year": 10,
            "is_paid": True,
            "requires_approval": True
        },
        {
            "name": "WFH",
            "description": "Work from home allowance.",
            "default_days_per_year": 30,
            "is_paid": True,
            "requires_approval": False
        }
    ]
    
    created_types = []
    for t_data in base_types:
        existing = LeaveType.query.filter_by(name=t_data['name']).first()
        if not existing:
            new_type = LeaveType(**t_data)
            db.session.add(new_type)
            created_types.append(new_type)
        else:
            created_types.append(existing)
            
    db.session.flush()
    
    # 2. Assign initial balances to demo users (Tom, Naresh, etc.)
    users = UserProfile.query.all()
    for user in users:
        for lt in created_types:
            existing_balance = LeaveBalance.query.filter_by(user_id=user.id, leave_type_id=lt.id, year=2026).first()
            if not existing_balance:
                new_balance = LeaveBalance(
                    user_id=user.id,
                    leave_type_id=lt.id,
                    year=2026,
                    total_days=lt.default_days_per_year
                )
                db.session.add(new_balance)
                
    db.session.commit()
    print("Leave module seeded successfully.")

if __name__ == "__main__":
    from app import create_app
    app = create_app()
    with app.app_context():
        seed_leave_module()
