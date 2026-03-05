"""AppraisalAppeal model — employee-raised appeals after appraisal completion."""
import uuid
from datetime import datetime, timezone
from extensions import db


class AppraisalAppeal(db.Model):
    __tablename__ = 'appraisal_appeals'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    appraisal_id = db.Column(
        db.String(36),
        db.ForeignKey('appraisals.id', ondelete='CASCADE'),
        nullable=False,
        unique=True,  # One appeal per appraisal
    )

    # Raised by the employee
    employee_reason = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default='pending', nullable=False)
    # status: 'pending' | 'under_review' | 'upheld' | 'overturned'

    # HR review
    reviewed_by = db.Column(db.String(36), nullable=True)     # HR user_id
    review_notes = db.Column(db.Text, nullable=True)
    new_overall_rating = db.Column(db.Float, nullable=True)   # Populated if rating changes
    reviewed_at = db.Column(db.DateTime(timezone=True), nullable=True)

    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'appraisal_id': self.appraisal_id,
            'employee_reason': self.employee_reason,
            'status': self.status,
            'reviewed_by': self.reviewed_by,
            'review_notes': self.review_notes,
            'new_overall_rating': self.new_overall_rating,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
