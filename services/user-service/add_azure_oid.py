import os
import sys
from sqlalchemy import create_engine, text

# Adjust path to find config/models if needed, though we just need raw SQL here
sys.path.append(os.getcwd())

# Get DB URL from env or use default (adjusted for localhost)
db_url = os.getenv('USER_DB_URL', 'postgresql://postgres:postgres123@localhost:5432/user_db')

if 'postgres' in db_url and '@postgres' in db_url:
    print("Replacing 'postgres' hostname with 'localhost' for local execution...")
    db_url = db_url.replace('@postgres', '@localhost')

print(f"Connecting to: {db_url}")

try:
    engine = create_engine(db_url)
    with engine.connect() as connection:
        # Check if column exists
        check_sql = text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='user_profiles' AND column_name='azure_oid';
        """)
        result = connection.execute(check_sql)
        if result.fetchone():
            print("Column 'azure_oid' already exists.")
        else:
            print("Adding 'azure_oid' column...")
            alter_sql = text("ALTER TABLE user_profiles ADD COLUMN azure_oid VARCHAR(36);")
            connection.execute(alter_sql)
            # Add index
            index_sql = text("CREATE INDEX ix_user_profiles_azure_oid ON user_profiles (azure_oid);")
            connection.execute(index_sql)
            connection.commit()
            print("Column added successfully.")
            
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
