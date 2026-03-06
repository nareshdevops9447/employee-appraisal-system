import os
import sys
from sqlalchemy import create_engine, text

# Get Database URL
DATABASE_URL = os.environ.get('DATABASE_URL') or os.environ.get('USER_DB_URL')
if not DATABASE_URL:
    print("Error: DATABASE_URL not found in environment")
    sys.exit(1)

def fix_hierarchy():
    engine = create_engine(DATABASE_URL)
    
    finance_manager_email = 'finance.manager@appraisalhub.site'
    finance_member_email = 'finance.member@appraisalhub.site'

    with engine.connect() as conn:
        # Get Manager ID
        result = conn.execute(text("SELECT id FROM user_profiles WHERE email = :email"), {'email': finance_manager_email})
        manager = result.fetchone()
        
        if not manager:
            print(f"Manager {finance_manager_email} not found!")
            return

        manager_id = manager[0]
        print(f"Found Manager ID: {manager_id}")

        # Update Member
        result = conn.execute(text("UPDATE user_profiles SET manager_id = :manager_id WHERE email = :email"), 
                              {'manager_id': manager_id, 'email': finance_member_email})
        conn.commit()
        print(f"Updated {finance_member_email} with manager_id {manager_id}")

if __name__ == "__main__":
    fix_hierarchy()
