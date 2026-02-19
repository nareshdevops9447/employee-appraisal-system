"""
User Service — handles user profile management.
"""
import os
import uuid
from datetime import datetime
from flask import Flask, jsonify, request, g
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text
from config import config
from extensions import db
from extensions import migrate

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
        }
    })

    # Import models within app context
    with app.app_context():
        # Use absolute imports for clarity
        from models.user_profile import UserProfile
        from models.department import Department
        

    # Register blueprints
    from routes.users import users_bp
    from routes.departments import departments_bp

    app.register_blueprint(users_bp)
    app.register_blueprint(departments_bp)

    # ---- Request ID Tracing ----
    @app.before_request
    def add_request_id():
        g.request_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))

    @app.after_request
    def add_request_id_header(response):
        response.headers['X-Request-ID'] = g.request_id
        return response

    @app.route('/health')
    def health():
        try:
            # Test database connection
            db.session.execute(text('SELECT 1'))
            return jsonify({
                'status': 'healthy',
                'service': 'user-service',
                'database': 'connected',
                'timestamp': datetime.utcnow().isoformat()
            }), 200
        except Exception as e:
            return jsonify({
                'status': 'unhealthy',
                'service': 'user-service',
                'error': str(e)
            }), 503

    return app

app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002, debug=True)
