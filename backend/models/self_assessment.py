import uuid
from datetime import datetime, timezone
from extensions import db

class SelfAssessment(db.Model):
    __tablename__ = 'self_assessments'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    appraisal_id = db.Column(db.String(36), db.ForeignKey('appraisals.id', ondelete='CASCADE'), nullable=False)
    goal_id = db.Column(db.String(36), db.ForeignKey('goals.id', ondelete='CASCADE'), nullable=False)
    
    # Text commentary
    employee_comment = db.Column(db.Text, nullable=True)
    
    # Numeric rating (e.g., 1-5 or 0-100 depending on your scoring system)
    employee_rating = db.Column(db.Float, nullable=True)
    
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Optional backrefs:
    # appraisal = db.relationship('Appraisal', backref=db.backref('self_assessments', lazy='dynamic', cascade='all, delete-orphan'))
    # goal = db.relationship('Goal', backref=db.backref('self_assessments', lazy='dynamic', cascade='all, delete-orphan'))

    def to_dict(self):
        return {
            'id': self.id,
            'appraisal_id': self.appraisal_id,
            'goal_id': self.goal_id,
            'employee_comment': self.employee_comment,
            'employee_rating': self.employee_rating,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
