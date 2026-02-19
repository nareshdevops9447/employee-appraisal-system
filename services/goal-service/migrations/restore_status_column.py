import sys
import os
sys.path.append(os.getcwd())
from app import create_app
from extensions import db
from sqlalchemy import text

app = create_app()

def migrate():
    with app.app_context():
        # Add status column if it doesn't exist
        try:
            with db.engine.connect() as connection:
                connection.execute(text("ALTER TABLE goals ADD COLUMN status VARCHAR(20) DEFAULT 'draft' NOT NULL"))
                connection.commit()
            print("Successfully added status column.")
        except Exception as e:
            print(f"Error adding status column (might already exist): {e}")

if __name__ == "__main__":
    migrate()
