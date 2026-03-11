
import os
import sys
from datetime import date

# Add current directory to path so we can import app and models
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from extensions import db
from models.holiday import Holiday

def seed_uk_2026_holidays():
    app = create_app('development')
    with app.app_context():
        print("--- Seeding UK Bank Holidays 2026 ---")
        
        # England and Wales 2026
        holidays = [
            ("New Year's Day", date(2026, 1, 1)),
            ("Good Friday", date(2026, 4, 3)),
            ("Easter Monday", date(2026, 4, 6)),
            ("Early May Bank Holiday", date(2026, 5, 4)),
            ("Spring Bank Holiday", date(2026, 5, 25)),
            ("Summer Bank Holiday", date(2026, 8, 31)),
            ("Christmas Day", date(2026, 12, 25)),
            ("Boxing Day (Substitute)", date(2026, 12, 28)),
        ]
        
        for name, dt in holidays:
            existing = Holiday.query.filter_by(date=dt).first()
            if not existing:
                h = Holiday(
                    name=name,
                    date=dt,
                    year=dt.year,
                    is_optional=False
                )
                db.session.add(h)
                print(f"Added: {name} ({dt})")
            else:
                print(f"Skipped: {name} (already exists)")
        
        db.session.commit()
        print("--- UK Holidays Seeded Successfully ---")

if __name__ == "__main__":
    seed_uk_2026_holidays()
