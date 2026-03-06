"""
Consolidated configuration for the monolith backend.
All service-specific configs merged into a single file.
"""
import os


class Config:
    """Base configuration."""
    SECRET_KEY = os.getenv('JWT_SECRET', '')

    # ── Database ────────────────────────────────────────────────────
    SQLALCHEMY_DATABASE_URI = os.getenv(
        'DATABASE_URL',
        'postgresql://postgres:postgres@localhost:5432/eas_db'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # ── JWT ─────────────────────────────────────────────────────────
    JWT_SECRET = os.getenv('JWT_SECRET', '')
    JWT_ALGORITHM = os.getenv('JWT_ALGORITHM', 'HS256')

    # ── Azure AD ────────────────────────────────────────────────────
    AZURE_AD_TENANT_ID = os.getenv('AZURE_AD_TENANT_ID', '')
    AZURE_AD_CLIENT_ID = os.getenv('AZURE_AD_CLIENT_ID', '')
    AZURE_AD_CLIENT_SECRET = os.getenv('AZURE_AD_CLIENT_SECRET', '')

    # ── Internal secrets ────────────────────────────────────────────
    INTERNAL_SYNC_SECRET = os.getenv('INTERNAL_SYNC_SECRET', '')

    # ── CORS ────────────────────────────────────────────────────────
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')

class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'


config_map = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
}
