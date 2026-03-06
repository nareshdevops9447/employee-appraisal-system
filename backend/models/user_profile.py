"""UserProfile model — employee profile information."""
import uuid
from datetime import datetime, timezone
from extensions import db


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
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    department = db.relationship('Department', foreign_keys=[department_id], backref='employees')
    manager = db.relationship('UserProfile', remote_side=[id], backref='direct_reports')

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
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
