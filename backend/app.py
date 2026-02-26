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
from extensions import db, migrate

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

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(users_bp, url_prefix='/api/users')
    app.register_blueprint(departments_bp, url_prefix='/api/departments')
    app.register_blueprint(goals_bp, url_prefix='/api/goals')
    app.register_blueprint(appraisals_bp, url_prefix='/api/appraisals')
    app.register_blueprint(cycles_bp, url_prefix='/api/cycles')
    app.register_blueprint(attributes_bp, url_prefix='/api/attributes')

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
        db.create_all()

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

    return app


# ── Entrypoint ──────────────────────────────────────────────────────

if __name__ == '__main__':
    app = create_app()
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
