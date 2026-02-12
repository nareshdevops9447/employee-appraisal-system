import uuid
from datetime import datetime, timezone
from sqlalchemy.dialects.postgresql import JSONB
from extensions import db

class PeerFeedback(db.Model):
    __tablename__ = 'peer_feedbacks'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    appraisal_id = db.Column(db.String(36), db.ForeignKey('appraisals.id'), nullable=False)
    
    reviewer_id = db.Column(db.String(36), nullable=False) # Ref User Service
    requested_by = db.Column(db.String(36), nullable=False) # Manager ID usually
    
    # enum: 'requested', 'submitted', 'declined'
    status = db.Column(db.String(50), nullable=False, default='requested')
    
    feedback = db.Column(JSONB, nullable=True)
    submitted_at = db.Column(db.DateTime(timezone=True), nullable=True)
    
    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    def to_dict(self):
        return {
            'id': self.id,
            'appraisal_id': self.appraisal_id,
            'reviewer_id': self.reviewer_id,
            'requested_by': self.requested_by,
            'status': self.status,
            'feedback': self.feedback,
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else None,
            'created_at': self.created_at.isoformat(),
        }
