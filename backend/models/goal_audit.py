"""GoalAudit model — audit trail for goal approval workflow."""
import uuid
from datetime import datetime, timezone
from extensions import db


class GoalAudit(db.Model):
    __tablename__ = 'goal_audits'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    goal_id = db.Column(db.String(36), db.ForeignKey('goals.id', ondelete='CASCADE'), nullable=False, index=True)
    old_status = db.Column(db.String(30), nullable=True)
    new_status = db.Column(db.String(30), nullable=False)
    changed_by_user_id = db.Column(db.String(36), nullable=True)
    changed_by_role = db.Column(db.String(20), nullable=True)
    version_number = db.Column(db.Integer, nullable=True)
    timestamp = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'goal_id': self.goal_id,
            'old_status': self.old_status,
            'new_status': self.new_status,
            'changed_by_user_id': self.changed_by_user_id,
            'changed_by_role': self.changed_by_role,
            'version_number': self.version_number,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
        }
