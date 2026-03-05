"""
Employee Appraisal System — Consolidated Monolith Backend
=========================================================

Single Flask application that replaces the previous 5 microservices:
  api-gateway, auth-service, user-service, goal-service, appraisal-service

All routes are served on port 5000 with the following prefixes:
  /api/auth/*       — Authentication (login, SSO, token refresh)
  /api/users/*      — User profile management
  /api/departments/*— Department management
  /api/goals/*      — Goals, key results, comments, approvals
  /api/appraisals/* — Appraisal records, self/manager assessment
  /api/cycles/*     — Appraisal cycle management
"""
import os
import uuid
import logging

from flask import Flask, request, jsonify, g
from flask_cors import CORS

from config import config_map
from extensions import db, migrate, limiter

# Import all models so SQLAlchemy registers them
import models  # noqa: F401


def create_app(config_name=None):
    """Application factory."""
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')

    app = Flask(__name__)
    app.url_map.strict_slashes = False
    app.config.from_object(config_map.get(config_name, config_map['development']))

    # ── Extensions ──────────────────────────────────────────────────
    db.init_app(app)
    migrate.init_app(app, db)
    limiter.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

    # ── Logging ─────────────────────────────────────────────────────
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s %(levelname)s [%(name)s] %(message)s',
    )

    # ── Register blueprints ─────────────────────────────────────────
    from routes.auth import auth_bp
    from routes.users import users_bp
    from routes.departments import departments_bp
    from routes.goals import goals_bp
    from routes.appraisals import appraisals_bp
    from routes.cycles import cycles_bp
    from routes.attributes import attributes_bp
    from routes.goal_templates import goal_templates_bp
    from routes.self_assessments import self_assessments_bp
    from routes.reports import reports_bp
    from routes.manager_reviews import manager_reviews_bp
    from routes.peer_feedback import peer_feedback_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(users_bp, url_prefix='/api/users')
    app.register_blueprint(departments_bp, url_prefix='/api/departments')
    app.register_blueprint(goals_bp, url_prefix='/api/goals')
    app.register_blueprint(appraisals_bp, url_prefix='/api/appraisals')
    app.register_blueprint(cycles_bp, url_prefix='/api/cycles')
    app.register_blueprint(attributes_bp, url_prefix='/api/attributes')
    app.register_blueprint(goal_templates_bp, url_prefix='/api/goal-templates')
    app.register_blueprint(self_assessments_bp, url_prefix='/api/self-assessments')
    app.register_blueprint(reports_bp, url_prefix='/api/reports')
    app.register_blueprint(manager_reviews_bp, url_prefix='/api/manager-reviews')
    app.register_blueprint(peer_feedback_bp, url_prefix='/api/peer-feedback')

    # ── Request lifecycle ───────────────────────────────────────────

    @app.before_request
    def before_request():
        g.request_id = request.headers.get('X-Request-Id', str(uuid.uuid4()))

    @app.after_request
    def after_request(response):
        response.headers['X-Request-Id'] = getattr(g, 'request_id', '')
        return response

    # ── Health check ────────────────────────────────────────────────

    @app.route('/health', methods=['GET'])
    def health():
        return jsonify({
            'status': 'healthy',
            'service': 'eas-backend',
        })

    # ── Create tables ───────────────────────────────────────────────

    with app.app_context():
        try:
            db.create_all()
        except Exception as e:
            app.logger.warning(f"Could not create tables automatically (likely racing with other workers): {e}")

        # ── Migrate goal_comments for threading support ──────────
        migration_stmts = [
            "ALTER TABLE goal_comments ADD COLUMN reply_to_id VARCHAR(36) REFERENCES goal_comments(id) ON DELETE CASCADE",
            "ALTER TABLE goal_comments ADD COLUMN is_edited BOOLEAN DEFAULT FALSE",
            "ALTER TABLE goal_comments ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE",
            "ALTER TABLE goal_comments ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()",
        ]
        for stmt in migration_stmts:
            try:
                db.session.execute(db.text(stmt))
                db.session.commit()
            except Exception:
                db.session.rollback()  # Column already exists

        # ── Narrative fields + dispute flag on appraisals (Phase 2.2) ──────────
        appraisal_col_stmts = [
            "ALTER TABLE appraisals ADD COLUMN strengths TEXT",
            "ALTER TABLE appraisals ADD COLUMN development_areas TEXT",
            "ALTER TABLE appraisals ADD COLUMN overall_comment TEXT",
            "ALTER TABLE appraisals ADD COLUMN is_dispute BOOLEAN DEFAULT FALSE",
        ]
        for stmt in appraisal_col_stmts:
            try:
                db.session.execute(db.text(stmt))
                db.session.commit()
            except Exception:
                db.session.rollback()  # Column already exists

        # ── Configurable weights + calibration on appraisal_cycles (Phase 2.1) ──
        cycle_stmts = [
            "ALTER TABLE appraisal_cycles ADD COLUMN goals_weight INTEGER DEFAULT 70 NOT NULL",
            "ALTER TABLE appraisal_cycles ADD COLUMN attributes_weight INTEGER DEFAULT 30 NOT NULL",
            "ALTER TABLE appraisal_cycles ADD COLUMN requires_calibration BOOLEAN DEFAULT FALSE NOT NULL",
        ]
        for stmt in cycle_stmts:
            try:
                db.session.execute(db.text(stmt))
                db.session.commit()
            except Exception:
                db.session.rollback()  # Column already exists

        # ── Peer feedback weight + avg rating columns ─────────────
        peer_stmts = [
            "ALTER TABLE appraisal_cycles ADD COLUMN peer_feedback_weight INTEGER DEFAULT 0 NOT NULL",
            "ALTER TABLE appraisal_reviews ADD COLUMN peer_feedback_avg_rating FLOAT",
        ]
        for stmt in peer_stmts:
            try:
                db.session.execute(db.text(stmt))
                db.session.commit()
            except Exception:
                db.session.rollback()  # Column already exists

        # ── Account lockout columns on user_auth (Phase 1.7) ────────
        lockout_stmts = [
            "ALTER TABLE user_auth ADD COLUMN failed_login_count INTEGER DEFAULT 0 NOT NULL",
            "ALTER TABLE user_auth ADD COLUMN locked_until TIMESTAMP WITH TIME ZONE",
        ]
        for stmt in lockout_stmts:
            try:
                db.session.execute(db.text(stmt))
                db.session.commit()
            except Exception:
                db.session.rollback()  # Column already exists

        # ── FK constraints on appraisals (Phase 1.2) ─────────────
        fk_stmts = [
            """ALTER TABLE appraisals
               ADD CONSTRAINT fk_appraisals_employee
               FOREIGN KEY (employee_id) REFERENCES user_profiles(id) ON DELETE CASCADE""",
            """ALTER TABLE appraisals
               ADD CONSTRAINT fk_appraisals_manager
               FOREIGN KEY (manager_id) REFERENCES user_profiles(id) ON DELETE SET NULL""",
        ]
        for stmt in fk_stmts:
            try:
                db.session.execute(db.text(stmt))
                db.session.commit()
            except Exception:
                db.session.rollback()  # Constraint already exists

        # ── Performance indices (Phase 1.5) ──────────────────────
        index_stmts = [
            # Goals
            "CREATE INDEX IF NOT EXISTS ix_goals_approval_status ON goals (approval_status)",
            "CREATE INDEX IF NOT EXISTS ix_goals_status ON goals (status)",
            "CREATE INDEX IF NOT EXISTS ix_goals_employee_cycle ON goals (employee_id, appraisal_cycle_id)",
            # Appraisals
            "CREATE INDEX IF NOT EXISTS ix_appraisals_status ON appraisals (status)",
            # Notifications — composite for unread-per-user queries
            "CREATE INDEX IF NOT EXISTS ix_notifications_recipient_read ON notifications (recipient_id, is_read)",
        ]
        for stmt in index_stmts:
            try:
                db.session.execute(db.text(stmt))
                db.session.commit()
            except Exception:
                db.session.rollback()  # Index already exists

        # ── AppraisalAppeal table (Phase 5.2) ─────────────────────
        try:
            db.session.execute(db.text("""
                CREATE TABLE IF NOT EXISTS appraisal_appeals (
                    id VARCHAR(36) PRIMARY KEY,
                    appraisal_id VARCHAR(36) NOT NULL UNIQUE REFERENCES appraisals(id) ON DELETE CASCADE,
                    employee_reason TEXT NOT NULL,
                    status VARCHAR(20) NOT NULL DEFAULT 'pending',
                    reviewed_by VARCHAR(36),
                    review_notes TEXT,
                    new_overall_rating FLOAT,
                    reviewed_at TIMESTAMP WITH TIME ZONE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )
            """))
            db.session.commit()
        except Exception:
            db.session.rollback()  # Table already exists

        # ── Department-scoped goal templates (Phase: Hannah's feature) ────
        dept_template_stmts = [
            # Add department_id column (ON DELETE SET NULL keeps templates if dept deleted)
            "ALTER TABLE goal_templates ADD COLUMN department_id VARCHAR(36) REFERENCES departments(id) ON DELETE SET NULL",
            # Index for fast dept-scoped lookups
            "CREATE INDEX IF NOT EXISTS ix_goal_templates_department ON goal_templates (department_id)",
            # Drop old unique constraint
            "ALTER TABLE goal_templates DROP CONSTRAINT IF EXISTS _cycle_goal_title_uc",
            # New constraint covering (cycle_id, title, department_id)
            "ALTER TABLE goal_templates ADD CONSTRAINT _cycle_goal_title_dept_uc UNIQUE (cycle_id, title, department_id)",
        ]
        for stmt in dept_template_stmts:
            try:
                db.session.execute(db.text(stmt))
                db.session.commit()
            except Exception:
                db.session.rollback()  # Column/index/constraint already exists
        # Partial unique index: only one org-wide template per (cycle_id, title)
        try:
            db.session.execute(db.text(
                "CREATE UNIQUE INDEX IF NOT EXISTS ix_goal_template_orgwide_uc "
                "ON goal_templates (cycle_id, title) WHERE department_id IS NULL"
            ))
            db.session.commit()
        except Exception:
            db.session.rollback()  # Index already exists

    return app


# ── Entrypoint ──────────────────────────────────────────────────────

if __name__ == '__main__':
    app = create_app()
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
