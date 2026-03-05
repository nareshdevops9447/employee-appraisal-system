"""Notification model — in-app notifications for appraisal lifecycle events."""
import uuid
from datetime import datetime, timezone
from extensions import db

EVENT_MESSAGES = {
    # Goal events
    'goal_assigned_pending': 'A new goal has been assigned to you for review.',
    'goal_approved': 'Your goal has been approved.',
    'goal_rejected': 'Your goal has been rejected.',
    'goal_submitted': 'A goal has been submitted for your approval.',
    'goal_resubmitted': 'A previously rejected goal has been resubmitted for your approval.',

    # Cycle events
    'cycle_started': 'A new appraisal cycle has started.',
    'cycle_completed': 'An appraisal cycle has been completed.',

    # Assessment lifecycle events
    'self_assessment_submitted': 'Employee has submitted their self-assessment. Please review.',
    'manager_review_submitted': 'Your manager has completed their review. Please acknowledge.',
    'appraisal_acknowledged': 'Employee has acknowledged their appraisal.',
    'appraisal_disputed': 'Employee has disputed their appraisal. Please review.',
    'appraisal_completed': 'Your appraisal has been completed.',

    # Deadline warnings
    'self_assessment_deadline_approaching': 'Your self-assessment deadline is approaching.',
    'manager_review_deadline_approaching': 'Manager review deadline is approaching.',
}


class Notification(db.Model):
    __tablename__ = 'notifications'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    recipient_id = db.Column(db.String(36), nullable=False, index=True)
    event = db.Column(db.String(50), nullable=False)
    goal_id = db.Column(db.String(36), nullable=True)
    resource_type = db.Column(db.String(50), nullable=True)
    resource_id = db.Column(db.String(36), nullable=True)
    triggered_by = db.Column(db.String(36), nullable=True)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    @property
    def message(self):
        return EVENT_MESSAGES.get(self.event, f'Notification: {self.event}')

    @classmethod
    def create(cls, recipient_id, event_type, message=None, related_id=None, triggered_by=None):
        """Convenience factory — creates, adds to session, and commits."""
        if not recipient_id:
            return None
        n = cls(
            recipient_id=recipient_id,
            event=event_type,
            resource_id=related_id,
            triggered_by=triggered_by,
        )
        db.session.add(n)
        db.session.commit()
        return n

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
