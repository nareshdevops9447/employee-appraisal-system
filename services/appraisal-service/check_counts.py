from app import create_app
from extensions import db
from models.appraisal_cycle import AppraisalCycle
from models.appraisal import Appraisal

app = create_app()

with app.app_context():
    cycles = AppraisalCycle.query.all()
    print("-" * 80)
    print(f"{'ID':<38} | {'Name':<25} | {'Status':<8} | {'Appraisals'}")
    print("-" * 80)
    for c in cycles:
        count = Appraisal.query.filter_by(cycle_id=c.id).count()
        print(f"{c.id:<38} | {c.name[:25]:<25} | {c.status:<8} | {count}")
    print("-" * 80)
