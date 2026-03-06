import os
import sys
from sqlalchemy import create_engine, text

# Get Database URL
DATABASE_URL = os.environ.get('DATABASE_URL') or os.environ.get('USER_DB_URL')
if not DATABASE_URL:
    print("Error: DATABASE_URL not found in environment")
    sys.exit(1)

def inspect_users():
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        print("\n--- All User Profiles ---")
        result = conn.execute(text("SELECT id, email, first_name, last_name, manager_id, department_id FROM user_profiles"))
        users = result.fetchall()
        
        # Helper to get name
        def get_name(u):
            return f"{u.first_name} {u.last_name}"

        user_map = {u.id: get_name(u) for u in users}
        
        print(f"{'ID':<36} | {'Email':<30} | {'Name':<20} | {'Manager':<20} | {'Dept ID':<36}")
        print("-" * 150)
        
        for user in users:
            manager_name = user_map.get(user.manager_id, "None") if user.manager_id else "None"
            print(f"{user.id:<36} | {user.email:<30} | {get_name(user):<20} | {manager_name:<20} | {str(user.department_id):<36}")

if __name__ == "__main__":
    inspect_users()
