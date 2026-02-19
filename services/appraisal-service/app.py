
"""
Appraisal Service — handles performance review cycles and assessments.
"""
import os
import uuid
from datetime import datetime
from flask import Flask, jsonify, request, g
from flask_cors import CORS
from sqlalchemy import text
from extensions import db
from config import config
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
        # Ensure models are imported for SQLAlchemy
        import models
        

    # Register blueprints
    from routes.cycles import cycles_bp
    from routes.appraisals import appraisals_bp
    from routes.reports import reports_bp

    app.register_blueprint(cycles_bp, url_prefix='/api/cycles')
    app.register_blueprint(appraisals_bp, url_prefix='/api/appraisals')
    app.register_blueprint(reports_bp, url_prefix='/api/reports')

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
                'service': 'appraisal-service',
                'database': 'connected',
                'timestamp': datetime.utcnow().isoformat()
            }), 200
        except Exception as e:
            return jsonify({
                'status': 'unhealthy',
                'service': 'appraisal-service',
                'error': str(e)
            }), 503

    return app

app = create_app()

if __name__ == '__main__':
    # Run on port 5003
    app.run(host='0.0.0.0', port=5003, debug=True)
