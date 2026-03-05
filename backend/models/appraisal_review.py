from extensions import db
from datetime import datetime, timezone
import uuid

class AppraisalReview(db.Model):
    """
    Stores the manager's overall review and final calculated rating for the employee.
    1:1 relationship with Appraisal.
    """
    __tablename__ = 'appraisal_reviews'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    appraisal_id = db.Column(db.String(36), db.ForeignKey('appraisals.id'), nullable=False, unique=True)
    
    # Phase 2.2 Narrative Feedback
    strengths = db.Column(db.Text, nullable=True)
    development_areas = db.Column(db.Text, nullable=True)
    overall_comment = db.Column(db.Text, nullable=True)
    
    # Scores (out of 5)
    overall_rating = db.Column(db.Float, nullable=True)
    calculated_rating = db.Column(db.Float, nullable=True)
    goals_avg_rating = db.Column(db.Float, nullable=True)
    attributes_avg_rating = db.Column(db.Float, nullable=True)
    peer_feedback_avg_rating = db.Column(db.Float, nullable=True)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    appraisal = db.relationship('Appraisal', backref=db.backref('manager_review_record', uselist=False))

    def to_dict(self):
        return {
            'id': self.id,
            'appraisal_id': self.appraisal_id,
            
            'strengths': self.strengths,
            'development_areas': self.development_areas,
            'overall_comment': self.overall_comment,
            
            'overall_rating': self.overall_rating,
            'calculated_rating': self.calculated_rating,
            'goals_avg_rating': self.goals_avg_rating,
            'attributes_avg_rating': self.attributes_avg_rating,
            'peer_feedback_avg_rating': self.peer_feedback_avg_rating,

            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
