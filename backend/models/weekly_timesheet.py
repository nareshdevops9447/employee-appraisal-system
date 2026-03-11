import uuid
from datetime import datetime
from extensions import db

class WeeklyTimesheet(db.Model):
    """
    Weekly aggregation of timesheet entries with approval workflow.
    """
    __tablename__ = 'weekly_timesheets'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('user_profiles.id', ondelete='CASCADE'), nullable=False)
    
    week_start = db.Column(db.Date, nullable=False) # Always a Monday
    week_end = db.Column(db.Date, nullable=False)   # Always a Sunday
    
    total_hours = db.Column(db.Numeric(5, 2), default=0.0)
    status = db.Column(db.String(20), default='DRAFT', nullable=False) # DRAFT, SUBMITTED, APPROVED, REJECTED
    
    submitted_at = db.Column(db.DateTime)
    reviewed_by = db.Column(db.String(36), db.ForeignKey('user_profiles.id', ondelete='SET NULL'))
    reviewed_at = db.Column(db.DateTime)
    reviewer_comment = db.Column(db.Text)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = db.relationship('UserProfile', foreign_keys=[user_id], backref=db.backref('weekly_timesheets', lazy=True))
    reviewer = db.relationship('UserProfile', foreign_keys=[reviewed_by])

    __table_args__ = (
        db.UniqueConstraint('user_id', 'week_start', name='_user_week_start_uc'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'week_start': self.week_start.isoformat() if self.week_start else None,
            'week_end': self.week_end.isoformat() if self.week_end else None,
            'total_hours': float(self.total_hours),
            'status': self.status,
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else None,
            'reviewed_by': self.reviewed_by,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'reviewer_comment': self.reviewer_comment,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
