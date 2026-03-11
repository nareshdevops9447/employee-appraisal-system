"""
Data Migration Script
=====================
Migrates data from the old 4-database schema (auth_db, user_db, goal_db, appraisal_db)
to the new single consolidated database (eas_db).

Usage:
    python migrate_data.py

Requirements:
    - The old databases must still be accessible
    - The new eas_db must already have its schema created (run the backend app once)
    - Set OLD_DB_HOST, NEW_DB_URL environment variables

This script is idempotent — it uses INSERT ... ON CONFLICT DO NOTHING
so it can be run multiple times safely.
"""
import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor

# ── Configuration ────────────────────────────────────────────────────

OLD_DB_HOST = os.getenv('OLD_DB_HOST', 'localhost')
OLD_DB_USER = os.getenv('POSTGRES_USER', 'postgres')
OLD_DB_PASS = os.getenv('POSTGRES_PASSWORD', 'postgres')
OLD_DB_PORT = os.getenv('OLD_DB_PORT', '5432')

NEW_DB_URL = os.getenv('NEW_DB_URL', f'postgresql://{OLD_DB_USER}:{OLD_DB_PASS}@{OLD_DB_HOST}:{OLD_DB_PORT}/eas_db')


def get_old_connection(db_name):
    """Connect to one of the old databases."""
    return psycopg2.connect(
        host=OLD_DB_HOST,
        port=OLD_DB_PORT,
        user=OLD_DB_USER,
        password=OLD_DB_PASS,
        dbname=db_name,
    )


def get_new_connection():
    """Connect to the new consolidated database."""
    return psycopg2.connect(NEW_DB_URL)


def migrate_table(old_conn, new_conn, table_name, columns, old_table_name=None):
    """Migrate rows from old DB table to new DB table.

    Uses INSERT ... ON CONFLICT DO NOTHING for idempotency.
    """
    old_table = old_table_name or table_name
    col_list = ', '.join(columns)
    placeholders = ', '.join(['%s'] * len(columns))

    with old_conn.cursor(cursor_factory=RealDictCursor) as old_cur:
        old_cur.execute(f'SELECT {col_list} FROM {old_table}')
        rows = old_cur.fetchall()

    if not rows:
        print(f'  {table_name}: 0 rows (empty)')
        return 0

    count = 0
    with new_conn.cursor() as new_cur:
        for row in rows:
            values = [row[col] for col in columns]
            try:
                new_cur.execute(
                    f'INSERT INTO {table_name} ({col_list}) VALUES ({placeholders}) '
                    f'ON CONFLICT DO NOTHING',
                    values,
                )
                if new_cur.rowcount > 0:
                    count += 1
            except Exception as e:
                print(f'  WARNING: Failed to insert row into {table_name}: {e}')
                new_conn.rollback()
                continue

    new_conn.commit()
    print(f'  {table_name}: {count}/{len(rows)} rows migrated')
    return count


def migrate_auth_db(new_conn):
    """Migrate data from auth_db."""
    print('\n=== Migrating auth_db ===')
    try:
        old_conn = get_old_connection('auth_db')
    except Exception as e:
        print(f'  SKIP: Cannot connect to auth_db: {e}')
        return

    try:
        migrate_table(old_conn, new_conn, 'user_auth', [
            'id', 'email', 'password_hash', 'azure_oid', 'role',
            'is_active', 'last_login', 'created_at', 'updated_at',
        ])

        migrate_table(old_conn, new_conn, 'refresh_tokens', [
            'id', 'user_id', 'token_hash', 'expires_at',
            'is_revoked', 'revoked_at', 'created_at',
        ])
    finally:
        old_conn.close()


def migrate_user_db(new_conn):
    """Migrate data from user_db."""
    print('\n=== Migrating user_db ===')
    try:
        old_conn = get_old_connection('user_db')
    except Exception as e:
        print(f'  SKIP: Cannot connect to user_db: {e}')
        return

    try:
        # Departments first (referenced by user_profiles)
        migrate_table(old_conn, new_conn, 'departments', [
            'id', 'name', 'description', 'head_id', 'created_at', 'updated_at',
        ])

        migrate_table(old_conn, new_conn, 'user_profiles', [
            'id', 'email', 'first_name', 'last_name', 'job_title',
            'phone', 'avatar_url', 'department_id', 'manager_id',
            'azure_oid', 'employment_type', 'start_date',
            'is_active', 'created_at', 'updated_at',
        ])
    finally:
        old_conn.close()


def migrate_goal_db(new_conn):
    """Migrate data from goal_db."""
    print('\n=== Migrating goal_db ===')
    try:
        old_conn = get_old_connection('goal_db')
    except Exception as e:
        print(f'  SKIP: Cannot connect to goal_db: {e}')
        return

    try:
        migrate_table(old_conn, new_conn, 'goals', [
            'id', 'employee_id', 'title', 'description', 'category',
            'priority', 'status', 'progress_percentage',
            'start_date', 'target_date', 'completed_date',
            'approval_status', 'approved_by', 'approved_date',
            'rejected_reason', 'version_number',
            'parent_goal_id', 'appraisal_cycle_id', 'created_by',
            'created_at', 'updated_at',
        ])

        migrate_table(old_conn, new_conn, 'key_results', [
            'id', 'goal_id', 'title', 'description',
            'target_value', 'current_value', 'unit', 'status',
            'due_date', 'created_at', 'updated_at',
        ])

        migrate_table(old_conn, new_conn, 'goal_comments', [
            'id', 'goal_id', 'author_id', 'content',
            'comment_type', 'created_at',
        ])

        migrate_table(old_conn, new_conn, 'goal_audit', [
            'id', 'goal_id', 'old_status', 'new_status',
            'changed_by_user_id', 'changed_by_role',
            'version_number', 'timestamp',
        ])

        migrate_table(old_conn, new_conn, 'goal_versions', [
            'id', 'goal_id', 'version_number', 'title', 'description',
            'category', 'priority', 'start_date', 'target_date',
            'approval_status', 'rejected_reason', 'created_by', 'created_at',
        ])

        migrate_table(old_conn, new_conn, 'notifications', [
            'id', 'recipient_id', 'event', 'goal_id',
            'triggered_by', 'resource_type', 'resource_id',
            'is_read', 'created_at',
        ])
    finally:
        old_conn.close()


def migrate_appraisal_db(new_conn):
    """Migrate data from appraisal_db."""
    print('\n=== Migrating appraisal_db ===')
    try:
        old_conn = get_old_connection('appraisal_db')
    except Exception as e:
        print(f'  SKIP: Cannot connect to appraisal_db: {e}')
        return

    try:
        migrate_table(old_conn, new_conn, 'appraisal_cycles', [
            'id', 'name', 'description', 'cycle_type',
            'start_date', 'end_date',
            'self_assessment_deadline', 'manager_review_deadline',
            'status', 'created_by', 'created_at', 'updated_at',
        ])

        migrate_table(old_conn, new_conn, 'appraisal_questions', [
            'id', 'cycle_id', 'question_text', 'question_type',
            'category', 'order', 'is_required',
            'is_for_self', 'is_for_manager',
        ])

        migrate_table(old_conn, new_conn, 'appraisals', [
            'id', 'cycle_id', 'employee_id', 'manager_id',
            'status', 'goal_ratings', 'self_assessment',
            'manager_goal_ratings', 'manager_assessment',
            'overall_rating', 'self_submitted',
            'manager_submitted', 'meeting_date', 'meeting_notes',
            'employee_acknowledgement', 'employee_acknowledgement_date',
            'employee_comments', 'is_prorated',
            'eligibility_status', 'eligibility_reason',
            'self_assessment_submitted_at', 'manager_assessment_submitted_at',
            'created_at', 'updated_at',
        ])

        migrate_table(old_conn, new_conn, 'peer_feedback', [
            'id', 'appraisal_id', 'reviewer_id', 'feedback',
            'rating', 'status', 'created_at', 'updated_at',
        ])
    finally:
        old_conn.close()


def main():
    print('=' * 60)
    print('Employee Appraisal System — Data Migration')
    print('=' * 60)
    print(f'Target DB: {NEW_DB_URL}')

    try:
        new_conn = get_new_connection()
    except Exception as e:
        print(f'\nERROR: Cannot connect to new database: {e}')
        print('Make sure the backend has been started at least once to create tables.')
        sys.exit(1)

    try:
        migrate_auth_db(new_conn)
        migrate_user_db(new_conn)
        migrate_goal_db(new_conn)
        migrate_appraisal_db(new_conn)

        print('\n' + '=' * 60)
        print('Migration complete!')
        print('=' * 60)
    finally:
        new_conn.close()


if __name__ == '__main__':
    main()
