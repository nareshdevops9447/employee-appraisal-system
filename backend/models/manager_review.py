from extensions import db
from datetime import datetime, timezone
import uuid

class ManagerReview(db.Model):
    """
    Stores a manager's review (rating and comments) for a specific goal during the appraisal.
    1:1 relationship with Goal for a specific Appraisal cycle.
    """
    __tablename__ = 'manager_reviews'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    appraisal_id = db.Column(db.String(36), db.ForeignKey('appraisals.id'), nullable=False)
    goal_id = db.Column(db.String(36), db.ForeignKey('goals.id'), nullable=False)
    
    manager_comment = db.Column(db.Text, nullable=True)
    manager_rating = db.Column(db.Float, nullable=True)  # 1-5 scale
    
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    appraisal = db.relationship('Appraisal', backref=db.backref('manager_goal_reviews', lazy='dynamic'))
    goal = db.relationship('Goal', backref=db.backref('manager_reviews', lazy='dynamic'))

    def to_dict(self):
        return {
            'id': self.id,
            'appraisal_id': self.appraisal_id,
            'goal_id': self.goal_id,
            'manager_comment': self.manager_comment,
            'manager_rating': self.manager_rating,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
