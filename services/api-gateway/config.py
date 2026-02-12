import os


class Config:
    """Base configuration."""
    SECRET_KEY = os.getenv('JWT_SECRET', 'dev-secret')
    JWT_SECRET = os.getenv('JWT_SECRET', 'dev-secret')
    JWT_ALGORITHM = os.getenv('JWT_ALGORITHM', 'HS256')

    # Service URLs
    AUTH_SERVICE_URL = os.getenv('AUTH_SERVICE_URL', 'http://auth-service:5001')
    USER_SERVICE_URL = os.getenv('USER_SERVICE_URL', 'http://user-service:5002')
    APPRAISAL_SERVICE_URL = os.getenv('APPRAISAL_SERVICE_URL', 'http://appraisal-service:5003')
    GOAL_SERVICE_URL = os.getenv('GOAL_SERVICE_URL', 'http://goal-service:5004')

    # Flask
    DEBUG = os.getenv('FLASK_DEBUG', '0') == '1'


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
