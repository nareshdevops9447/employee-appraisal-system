from app import create_app, db
from sqlalchemy import text

app = create_app()

def run_migrations():
    with app.app_context():
        # 1. Add columns to goals table
        columns_to_add = [
            ("approved_date", "TIMESTAMP WITH TIME ZONE"),
            ("rejected_reason", "VARCHAR(500)"),
            ("version_number", "INTEGER DEFAULT 1 NOT NULL"),
            ("approved_by", "VARCHAR(36)"),
            ("approval_status", "VARCHAR(20) DEFAULT 'draft' NOT NULL")
        ]

        with db.engine.connect() as conn:
            for col_name, col_type in columns_to_add:
                try:
                    conn.execute(text(f"ALTER TABLE goals ADD COLUMN {col_name} {col_type}"))
                    conn.commit()
                    print(f"Added column {col_name}")
                except Exception as e:
                    # simplistic check for duplicate column error
                    # or checking pg_catalog would be better but this is quick fix
                    print(f"Skipping {col_name}, likely exists. Error: {e}")
                    conn.rollback()

        # 2. Add column to goal_comments table
        try:
             with db.engine.connect() as conn:
                conn.execute(text("ALTER TABLE goal_comments ADD COLUMN created_by_role VARCHAR(50) DEFAULT 'employee'"))
                conn.commit()
                print("Added column created_by_role")
        except Exception as e:
             print(f"Skipping created_by_role, likely exists. Error: {e}")

        # 3. Create new tables
        print("Creating new tables...")
        db.create_all()
        print("Migration complete.")

if __name__ == '__main__':
    run_migrations()
