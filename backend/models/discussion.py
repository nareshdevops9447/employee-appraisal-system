"""Discussion model — 1-on-1 meeting notes between managers and employees."""
import uuid
from datetime import datetime, timezone
from extensions import db

class Discussion(db.Model):
    __tablename__ = 'discussions'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    employee_id = db.Column(db.String(36), db.ForeignKey('user_profiles.id', ondelete='CASCADE'), nullable=False, index=True)
    manager_id = db.Column(db.String(36), db.ForeignKey('user_profiles.id', ondelete='CASCADE'), nullable=False, index=True)
    content = db.Column(db.Text, nullable=False)
    is_private = db.Column(db.Boolean, default=False)
    meeting_date = db.Column(db.Date, nullable=False)
    
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships (optional, depending on how they are used)
    employee = db.relationship('UserProfile', foreign_keys=[employee_id])
    manager = db.relationship('UserProfile', foreign_keys=[manager_id])

    def to_dict(self):
        return {
            'id': self.id,
            'employee_id': self.employee_id,
            'manager_id': self.manager_id,
            'content': self.content,
            'is_private': self.is_private,
            'meeting_date': self.meeting_date.isoformat() if self.meeting_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
