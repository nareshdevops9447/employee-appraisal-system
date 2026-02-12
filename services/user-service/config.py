import os


class Config:
    """Base configuration for database-backed services."""
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL',
                                         'postgresql://postgres:postgres123@localhost:5432/user_db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.getenv('JWT_SECRET', 'dev-secret')
    JWT_SECRET = os.getenv('JWT_SECRET', 'dev-secret')
    JWT_ALGORITHM = os.getenv('JWT_ALGORITHM', 'HS256')
    DEBUG = os.getenv('FLASK_DEBUG', '0') == '1'


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig,
}
