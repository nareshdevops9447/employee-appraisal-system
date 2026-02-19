
import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev_key')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///appraisal.db')
    
    # Service URLs
    # Service URLs
    USER_SERVICE_URL = os.environ.get('USER_SERVICE_URL', 'http://user-service:5002')
    GOAL_SERVICE_URL = os.environ.get('GOAL_SERVICE_URL', 'http://goal-service:5004')

class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False

class TestingConfig(Config):
    TESTING = True

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
