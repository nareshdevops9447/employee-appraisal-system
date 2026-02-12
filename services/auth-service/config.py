import os


class Config:
    """Base configuration for the Auth Service."""
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL',
                                         'postgresql://postgres:postgres123@localhost:5432/auth_db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.getenv('JWT_SECRET', 'dev-secret')
    JWT_SECRET = os.getenv('JWT_SECRET', 'dev-secret')
    JWT_ALGORITHM = os.getenv('JWT_ALGORITHM', 'HS256')
    JWT_EXPIRATION_HOURS = int(os.getenv('JWT_EXPIRATION_HOURS', '24'))

    # Token expiry
    ACCESS_TOKEN_EXPIRY_MINUTES = 15
    REFRESH_TOKEN_EXPIRY_DAYS = 7

    # Azure AD
    AZURE_AD_CLIENT_ID = os.getenv('AZURE_AD_CLIENT_ID')
    AZURE_AD_CLIENT_SECRET = os.getenv('AZURE_AD_CLIENT_SECRET')
    AZURE_AD_TENANT_ID = os.getenv('AZURE_AD_TENANT_ID')
    AZURE_AD_JWKS_URL = (
        f'https://login.microsoftonline.com/{os.getenv("AZURE_AD_TENANT_ID", "common")}'
        f'/discovery/v2.0/keys'
    )

    # Other services
    USER_SERVICE_URL = os.getenv('USER_SERVICE_URL', 'http://user-service:5002')

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
