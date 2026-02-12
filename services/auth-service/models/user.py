"""
UserAuth model — stores authentication credentials for all users.
"""
import uuid
from datetime import datetime, timezone

from app import db


class UserAuth(db.Model):
    __tablename__ = 'user_auth'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    azure_oid = db.Column(db.String(255), unique=True, nullable=True)
    password_hash = db.Column(db.String(255), nullable=True)
    role = db.Column(
        db.String(20),
        nullable=False,
        default='employee'
    )  # employee | manager | hr_admin | super_admin
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    last_login = db.Column(db.DateTime(timezone=True), nullable=True)
    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relationships
    refresh_tokens = db.relationship('RefreshToken', backref='user', lazy='dynamic',
                                     cascade='all, delete-orphan')

    VALID_ROLES = ('employee', 'manager', 'hr_admin', 'super_admin')

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'azure_oid': self.azure_oid,
            'role': self.role,
            'is_active': self.is_active,
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f'<UserAuth {self.email}>'
