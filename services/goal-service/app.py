"""
Goal Service — handles employee goals, key results, and notifications.
"""
import os
import uuid
from datetime import datetime
from flask import Flask, jsonify, request, g
from flask_cors import CORS
from sqlalchemy import text
from extensions import db
from extensions import migrate
from config import config


def create_app(config_name=None):
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')

    app = Flask(__name__)
    app.config.from_object(config.get(config_name, config['default']))

    db.init_app(app)
    migrate.init_app(app, db)

    CORS(app, resources={
        r"/api/*": {
            "origins": ["http://localhost:3000", "http://localhost:5000"],
            "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization", "X-Request-ID", "X-User-Id", "X-User-Role"]
        }
    })

    # Import models and create tables
    with app.app_context():
        import models  # noqa: F401 — ensures all models are registered
        
    # Register blueprints
    from routes.goals import goals_bp
    from routes.key_results import key_results_bp
    from routes.comments import comments_bp
    from routes.reports import reports_bp
    from routes.approval_routes import approval_bp
    from routes.notifications import notifications_bp
    from routes.bulk_goals import bulk_goals_bp

    app.register_blueprint(goals_bp, url_prefix='/api/goals')
    app.register_blueprint(key_results_bp, url_prefix='/api/goals')
    app.register_blueprint(comments_bp, url_prefix='/api/goals')
    app.register_blueprint(reports_bp, url_prefix='/api/goals')
    app.register_blueprint(approval_bp, url_prefix='/api')
    app.register_blueprint(notifications_bp, url_prefix='/api/notifications')
    app.register_blueprint(bulk_goals_bp, url_prefix='/api/goals/bulk')

    # ── Request ID tracing ──
    @app.before_request
    def add_request_id():
        g.request_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))

    @app.after_request
    def add_request_id_header(response):
        response.headers['X-Request-ID'] = g.request_id
        return response

    # ── Health check ──
    @app.route('/health')
    def health():
        try:
            db.session.execute(text('SELECT 1'))
            return jsonify({
                'status': 'healthy',
                'service': 'goal-service',
                'database': 'connected',
                'timestamp': datetime.utcnow().isoformat()
            }), 200
        except Exception as e:
            return jsonify({
                'status': 'unhealthy',
                'service': 'goal-service',
                'error': str(e)
            }), 503

    return app


app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5004, debug=True)