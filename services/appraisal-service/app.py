
"""
Appraisal Service — handles performance review cycles and assessments.
"""
import os
from flask import Flask, jsonify
from flask_cors import CORS
from extensions import db
from config import config

def create_app(config_name=None):
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')

    app = Flask(__name__)
    app.config.from_object(config.get(config_name, config['default']))

    db.init_app(app)
    CORS(app)

    # Import models within app context
    with app.app_context():
        # Ensure models are imported for SQLAlchemy
        import models
        db.create_all()

    # Register blueprints
    from routes.cycles import cycles_bp
    from routes.appraisals import appraisals_bp
    from routes.reports import reports_bp

    app.register_blueprint(cycles_bp, url_prefix='/api/cycles')
    app.register_blueprint(appraisals_bp, url_prefix='/api/appraisals')
    app.register_blueprint(reports_bp, url_prefix='/api/reports')

    @app.route('/health')
    def health():
        return jsonify({'status': 'healthy', 'service': 'appraisal-service'})

    return app

app = create_app()

if __name__ == '__main__':
    # Run on port 5003
    app.run(host='0.0.0.0', port=5003, debug=True)
