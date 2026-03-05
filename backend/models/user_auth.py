"""UserAuth model — authentication credentials and roles."""
import uuid
from datetime import datetime, timezone
from extensions import db


class UserAuth(db.Model):
    __tablename__ = 'user_auth'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    azure_oid = db.Column(db.String(255), unique=True, nullable=True)
    password_hash = db.Column(db.String(255), nullable=True)
    role = db.Column(db.String(20), nullable=False, default='employee')
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    last_login = db.Column(db.DateTime(timezone=True), nullable=True)

    # Account lockout tracking
    failed_login_count = db.Column(db.Integer, default=0, nullable=False)
    locked_until = db.Column(db.DateTime(timezone=True), nullable=True)

    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    refresh_tokens = db.relationship(
        'RefreshToken', backref='user', lazy='dynamic', cascade='all, delete-orphan'
    )

    def is_locked(self):
        """Return True if the account is currently locked out."""
        if self.locked_until and self.locked_until > datetime.now(timezone.utc):
            return True
        return False

    def record_failed_login(self, session):
        """Increment failed login counter; lock account after 5 failures."""
        self.failed_login_count = (self.failed_login_count or 0) + 1
        if self.failed_login_count >= 5:
            from datetime import timedelta
            self.locked_until = datetime.now(timezone.utc) + timedelta(minutes=15)
        session.commit()

    def reset_failed_logins(self, session):
        """Clear lockout state after a successful login."""
        if self.failed_login_count or self.locked_until:
            self.failed_login_count = 0
            self.locked_until = None
            session.commit()

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'role': self.role,
            'is_active': self.is_active,
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
