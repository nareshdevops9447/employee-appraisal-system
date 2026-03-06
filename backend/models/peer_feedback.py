"""PeerFeedback model — peer feedback for appraisals."""
import uuid
from datetime import datetime, timezone
from extensions import db


class PeerFeedback(db.Model):
    __tablename__ = 'peer_feedbacks'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    appraisal_id = db.Column(db.String(36), db.ForeignKey('appraisals.id', ondelete='CASCADE'), nullable=False, index=True)
    reviewer_id = db.Column(db.String(36), nullable=False)
    status = db.Column(db.String(20), default='pending')
    feedback = db.Column(db.JSON, nullable=True)
    submitted_at = db.Column(db.DateTime(timezone=True), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'appraisal_id': self.appraisal_id,
            'reviewer_id': self.reviewer_id,
            'status': self.status,
            'feedback': self.feedback,
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
