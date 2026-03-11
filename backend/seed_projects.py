from extensions import db
from models.project import Project

def seed_projects():
    """Seed initial projects."""
    print("Seeding projects...")
    
    projects = [
        {"code": "EAS-CORE", "name": "Employee Appraisal System Core", "description": "Main development of the EAS platform"},
        {"code": "EAS-LEAVE", "name": "EAS Leave & Timesheet Module", "description": "Implementation of leave and timesheet tracking"},
        {"code": "INTERNAL", "name": "Internal Training & Admin", "description": "General internal activities"},
        {"code": "CLIENT-001", "name": "Financial Services App", "description": "Client project for FinCorp"}
    ]
    
    for p_data in projects:
        existing = Project.query.filter_by(code=p_data['code']).first()
        if not existing:
            new_project = Project(**p_data)
            db.session.add(new_project)
    
    db.session.commit()
    print("Projects seeded successfully.")

if __name__ == "__main__":
    from app import create_app
    app = create_app()
    with app.app_context():
        seed_projects()
