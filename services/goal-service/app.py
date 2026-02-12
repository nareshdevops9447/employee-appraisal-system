
"""
Goal Service — handles employee goals and key results.
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
        import models
        db.create_all()

    # Register blueprints
    from routes.goals import goals_bp
    from routes.key_results import key_results_bp
    from routes.comments import comments_bp
    from routes.reports import reports_bp

    app.register_blueprint(goals_bp, url_prefix='/api/goals')
    app.register_blueprint(key_results_bp, url_prefix='/api/goals') # nested routes like /goals/:id/key-results
    app.register_blueprint(comments_bp, url_prefix='/api/goals') # nested routes like /goals/:id/comments
    app.register_blueprint(reports_bp, url_prefix='/api/goals') # /api/goals/stats/me

    @app.route('/health')
    def health():
        return jsonify({'status': 'healthy', 'service': 'goal-service'})

    return app

app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5004, debug=True)
