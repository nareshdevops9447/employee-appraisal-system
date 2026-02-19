"""
Auth Service — handles authentication, registration, and SSO.
"""
import os
import logging
import uuid
from datetime import datetime

from flask import Flask, jsonify, request, g
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy

from sqlalchemy import text
from extensions import db, migrate
from config import config



# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(name)s] %(levelname)s: %(message)s',
)
logger = logging.getLogger(__name__)


def create_app(config_name=None):
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')

    app = Flask(__name__)
    app.config.from_object(config.get(config_name, config['default']))

    db.init_app(app)
    migrate.init_app(app, db)
    # Standardized CORS Configuration
    CORS(app, resources={
        r"/api/*": {
            "origins": ["http://localhost:3000", "http://localhost:5000"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization", "X-Request-ID"]
        },
        r"/auth/*": {
            "origins": ["http://localhost:3000", "http://localhost:5000"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization", "X-Request-ID"]
        }
    })

    # Import models so SQLAlchemy knows about them
    with app.app_context():
        from models.user import UserAuth          # noqa: F401
        from models.refresh_token import RefreshToken  # noqa: F401
        
        logger.info('Database tables created / verified')

    # Register blueprints
    from routes.auth import auth_bp
    app.register_blueprint(auth_bp)

    # ---- Request ID Tracing ----
    @app.before_request
    def add_request_id():
        g.request_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))
        # Add request ID to logger context if using structured logging, or just log it
        logger.info(f"Request ID: {g.request_id} - {request.method} {request.path}")

    @app.after_request
    def add_request_id_header(response):
        response.headers['X-Request-ID'] = g.request_id
        return response

    # ---- Health endpoint ----
    @app.route('/health')
    def health():
        try:
            # Test database connection
            db.session.execute(text('SELECT 1'))
            return jsonify({
                'status': 'healthy',
                'service': 'auth-service',
                'database': 'connected',
                'timestamp': datetime.utcnow().isoformat()
            }), 200
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return jsonify({
                'status': 'unhealthy',
                'service': 'auth-service',
                'error': str(e)
            }), 503

    return app


app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
