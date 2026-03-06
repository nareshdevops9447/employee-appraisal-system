import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Database URL for User Service (Internal Docker URL is usually distinct, 
# but for running from host with exposed ports, we use localhost)
# Assuming port 5432 is exposed and mapped. 
# If not, we might need to run this inside the container or use the correct port.
# Based on docker-compose (usually), standard postgres port is 5432.
# Only one postgres container 'eas-postgres'.
# We need to know the DB name for user-service. usually 'user_db'.

DB_URL = "postgresql://postgres:postgres@localhost:5432/user_db"

def check_users():
    try:
        engine = create_engine(DB_URL)
        with engine.connect() as connection:
            result = connection.execute(text("SELECT id, email, role, manager_id, azure_oid FROM users"))
            print(f"{'ID':<5} | {'Email':<30} | {'Role':<10} | {'Manager ID':<10} | {'Azure OID':<36}")
            print("-" * 100)
            rows = result.fetchall()
            if not rows:
                print("No users found.")
                return

            for row in rows:
                print(f"{row.id:<5} | {row.email:<30} | {row.role:<10} | {str(row.manager_id):<10} | {row.azure_oid:<36}")
                
    except Exception as e:
        print(f"Error connecting to database: {e}")

if __name__ == "__main__":
    check_users()
