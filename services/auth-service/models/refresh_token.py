"""
RefreshToken model — stores hashed refresh tokens for JWT renewal.
"""
import uuid
from datetime import datetime, timezone

from app import db


class RefreshToken(db.Model):
    __tablename__ = 'refresh_tokens'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('user_auth.id', ondelete='CASCADE'),
                        nullable=False, index=True)
    token_hash = db.Column(db.String(255), nullable=False)
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False)
    is_revoked = db.Column(db.Boolean, default=False, nullable=False)
    revoked_at = db.Column(db.DateTime(timezone=True), nullable=True) # Added for grace period
    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    def is_expired(self):
        return datetime.now(timezone.utc) > self.expires_at

    def __repr__(self):
        return f'<RefreshToken user={self.user_id} revoked={self.is_revoked}>'
