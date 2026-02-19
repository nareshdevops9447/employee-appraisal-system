from app import create_app
from extensions import db
from models.appraisal import Appraisal

app = create_app()

cycle_id = '46de0a24-1db6-46b6-92d6-482d5bd87d0d'

with app.app_context():
    count = Appraisal.query.filter_by(cycle_id=cycle_id).count()
    print(f"Cycle {cycle_id} has {count} appraisals.")
