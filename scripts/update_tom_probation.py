import os
import sys
from datetime import date
from dateutil.relativedelta import relativedelta

sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app import create_app
from extensions import db
from models.user_profile import UserProfile

def update_probation():
    app = create_app('development')
    with app.app_context():
        # Update Tom Lane specifically as he's the one user mentioned
        tom = UserProfile.query.filter_by(first_name='Tom').first()
        if tom:
            tom.probation_status = 'pending'
            if tom.start_date:
                tom.probation_end_date = tom.start_date + relativedelta(months=6)
            db.session.add(tom)

        # Let's also update Uma, Pete, Nathan, Jane, Zack, David, Mia, Ian, Yara 
        # (anyone classified as "New Starter" or "Probation" in seed_demo)
        pending_names = ['Tom', 'Uma', 'Pete', 'Nathan', 'Jane', 'Zack', 'David', 'Mia', 'Ian', 'Yara']
        for name in pending_names:
            u = UserProfile.query.filter_by(first_name=name).first()
            if u:
                u.probation_status = 'pending'
                if u.start_date:
                    u.probation_end_date = u.start_date + relativedelta(months=6)
                db.session.add(u)
        
        db.session.commit()
        print("Updated probation data.")

if __name__ == '__main__':
    update_probation()
