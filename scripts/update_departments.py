import os
import sys
import uuid
from sqlalchemy import create_engine, text

# Get Database URL
DATABASE_URL = os.environ.get('DATABASE_URL') or os.environ.get('USER_DB_URL')
if not DATABASE_URL:
    print("Error: DATABASE_URL not found in environment")
    sys.exit(1)

TARGET_DEPARTMENTS = ['Finance', 'IT', 'HR']

def update_departments():
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        print("\n--- Updating Departments ---")
        
        # 1. Fetch existing departments
        result = conn.execute(text("SELECT id, name FROM departments"))
        existing_depts = {row.name: row.id for row in result.fetchall()}
        print(f"Existing: {list(existing_depts.keys())}")
        
        # 2. Add missing target departments
        for name in TARGET_DEPARTMENTS:
            if name not in existing_depts:
                new_id = str(uuid.uuid4())
                print(f"Adding new department: {name}")
                conn.execute(
                    text("INSERT INTO departments (id, name, description, created_at, updated_at) VALUES (:id, :name, :desc, NOW(), NOW())"),
                    {'id': new_id, 'name': name, 'desc': f'{name} Department'}
                )
                existing_depts[name] = new_id
        
        conn.commit()
        
        # 3. Identify departments to remove
        to_remove = [name for name in existing_depts if name not in TARGET_DEPARTMENTS]
        
        if not to_remove:
            print("No extra departments to remove.")
            return

        print(f"Departments to remove: {to_remove}")
        
        # 4. Check for users in these departments
        for name in to_remove:
            dept_id = existing_depts[name]
            result = conn.execute(text("SELECT count(*) FROM user_profiles WHERE department_id = :dept_id"), {'dept_id': dept_id})
            count = result.scalar()
            
            if count > 0:
                print(f"WARNING: Department '{name}' has {count} users. Moving them to 'HR' before deletion.")
                # Move to HR
                hr_id = existing_depts.get('HR')
                if hr_id:
                    conn.execute(
                        text("UPDATE user_profiles SET department_id = :new_id WHERE department_id = :old_id"),
                        {'new_id': hr_id, 'old_id': dept_id}
                    )
                    conn.commit()
                    print(f"Moved users from {name} to HR.")
                else:
                    print("Error: Target department HR not found! Skipping deletion.")
                    continue
            
            # Delete department
            conn.execute(text("DELETE FROM departments WHERE id = :id"), {'id': dept_id})
            conn.commit()
            print(f"Deleted department: {name}")

    print("\nDepartment update complete.")

if __name__ == "__main__":
    update_departments()
