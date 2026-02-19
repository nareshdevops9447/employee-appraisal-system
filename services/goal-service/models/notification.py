import uuid
from datetime import datetime, timezone
from extensions import db


class Notification(db.Model):
    __tablename__ = 'notifications'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    recipient_id = db.Column(db.String(36), nullable=False, index=True)
    event = db.Column(db.String(50), nullable=False)
    goal_id = db.Column(db.String(36), nullable=True)
    resource_type = db.Column(db.String(50), nullable=True)  # 'appraisal_cycle', 'goal', etc.
    resource_id = db.Column(db.String(36), nullable=True)
    triggered_by = db.Column(db.String(36), nullable=False)
    is_read = db.Column(db.Boolean, default=False)

    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    @property
    def message(self):
        """Human-readable message based on event type."""
        messages = {
            'cycle_started': 'A new performance cycle has started',
            'goal_assigned_pending': 'A goal has been assigned to you (pending approval)',
            'goal_approved': 'Your goal has been approved',
            'goal_rejected': 'Your goal has been rejected',
            'self_assessment_due': 'Your self-assessment is due soon',
            'manager_review_due': 'You have pending manager reviews',
        }
        return messages.get(self.event, self.event.replace('_', ' ').title())

    def to_dict(self):
        return {
            'id': self.id,
            'recipient_id': self.recipient_id,
            'event': self.event,
            'message': self.message,
            'goal_id': self.goal_id,
            'resource_type': self.resource_type,
            'resource_id': self.resource_id,
            'triggered_by': self.triggered_by,
            'is_read': self.is_read,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }