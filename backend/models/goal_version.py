"""GoalVersion model — historical snapshots of goal changes."""
import uuid
from datetime import datetime, timezone
from extensions import db


class GoalVersion(db.Model):
    __tablename__ = 'goal_versions'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    goal_id = db.Column(db.String(36), db.ForeignKey('goals.id', ondelete='CASCADE'), nullable=False, index=True)
    version_number = db.Column(db.Integer, nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    category = db.Column(db.String(50), nullable=True)
    priority = db.Column(db.String(20), nullable=True)
    start_date = db.Column(db.Date, nullable=True)
    target_date = db.Column(db.Date, nullable=True)
    approval_status = db.Column(db.String(30), nullable=True)
    rejected_reason = db.Column(db.Text, nullable=True)
    created_by = db.Column(db.String(36), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'goal_id': self.goal_id,
            'version_number': self.version_number,
            'title': self.title,
            'description': self.description,
            'category': self.category,
            'priority': self.priority,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'target_date': self.target_date.isoformat() if self.target_date else None,
            'approval_status': self.approval_status,
            'rejected_reason': self.rejected_reason,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
