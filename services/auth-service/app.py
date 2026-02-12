"""
Auth Service — handles authentication, registration, and SSO.
"""
import os
import logging

from flask import Flask, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy

from config import config

db = SQLAlchemy()

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
    CORS(app)

    # Import models so SQLAlchemy knows about them
    with app.app_context():
        from models.user import UserAuth          # noqa: F401
        from models.refresh_token import RefreshToken  # noqa: F401
        db.create_all()
        logger.info('Database tables created / verified')

    # Register blueprints
    from routes.auth import auth_bp
    app.register_blueprint(auth_bp)

    # ---- Health endpoint ----
    @app.route('/health')
    def health():
        return jsonify({'status': 'healthy', 'service': 'auth-service'})

    return app


app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
