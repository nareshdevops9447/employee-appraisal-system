"""UserProfile model — employee profile information."""
import uuid
from datetime import datetime, timezone
from extensions import db


# Default user preferences — all 5 settings with their initial values.
# Used to fill in any missing keys when reading preferences from DB.
DEFAULT_PREFERENCES = {
    'notify_appraisal_updates': True,
    'notify_goal_reminders': True,
    'notify_marketing': False,
    'compact_mode': False,
    'dark_mode': False,
}


class UserProfile(db.Model):
    __tablename__ = 'user_profiles'

    id = db.Column(db.String(36), primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    job_title = db.Column(db.String(100), nullable=True)
    department_id = db.Column(db.String(36), db.ForeignKey('departments.id'), nullable=True)
    manager_id = db.Column(db.String(36), db.ForeignKey('user_profiles.id'), nullable=True)
    azure_oid = db.Column(db.String(36), unique=True, nullable=True, index=True)
    employment_type = db.Column(db.String(20), default='full_time')
    start_date = db.Column(db.Date, nullable=True)
    end_date = db.Column(db.Date, nullable=True)
    phone = db.Column(db.String(20), nullable=True)
    avatar_url = db.Column(db.Text, nullable=True)
    preferences = db.Column(db.JSON, nullable=False, server_default='{}')
    is_active = db.Column(db.Boolean, default=True)
    has_completed_tour = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    department = db.relationship('Department', foreign_keys=[department_id], backref='employees')
    manager = db.relationship('UserProfile', remote_side=[id], backref='direct_reports')

    def get_preferences(self):
        """Return preferences merged with defaults so new keys are always present."""
        stored = self.preferences or {}
        return {**DEFAULT_PREFERENCES, **stored}

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'display_name': f'{self.first_name} {self.last_name}'.strip(),
            'job_title': self.job_title,
            'department_id': self.department_id,
            'department_name': self.department.name if self.department else None,
            'manager_id': self.manager_id,
            'azure_oid': self.azure_oid,
            'employment_type': self.employment_type,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'phone': self.phone,
            'avatar_url': self.avatar_url,
            'preferences': self.get_preferences(),
            'is_active': self.is_active,
            'has_completed_tour': self.has_completed_tour,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
