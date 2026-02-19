from app import create_app
from extensions import db
from models.appraisal_cycle import AppraisalCycle

app = create_app()

with app.app_context():
    cycles = AppraisalCycle.query.all()
    print(f"Total cycles: {len(cycles)}")
    print("-" * 60)
    print(f"{'ID':<38} | {'Name':<25} | {'Status':<10} | {'Start':<12} | {'End':<12}")
    print("-" * 60)
    for c in cycles:
        print(f"{c.id:<38} | {c.name[:25]:<25} | {c.status:<10} | {c.start_date} | {c.end_date}")
    print("-" * 60)
