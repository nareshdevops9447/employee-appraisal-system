"""
User Service — handles user profile management.
"""
import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from config import config
from extensions import db

def create_app(config_name=None):
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')

    app = Flask(__name__)
    app.config.from_object(config.get(config_name, config['default']))

    db.init_app(app)
    CORS(app)

    # Import models within app context
    with app.app_context():
        # Use absolute imports for clarity
        from models.user_profile import UserProfile
        from models.department import Department
        db.create_all()

    # Register blueprints
    from routes.users import users_bp
    from routes.departments import departments_bp

    app.register_blueprint(users_bp)
    app.register_blueprint(departments_bp)

    @app.route('/health')
    def health():
        return jsonify({'status': 'healthy', 'service': 'user-service'})

    return app

app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002, debug=True)
