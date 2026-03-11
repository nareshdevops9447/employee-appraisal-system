import uuid
from datetime import datetime
from extensions import db

class LeaveRequest(db.Model):
    """
    Leave requests with status and dates.
    """
    __tablename__ = 'leave_requests'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('user_profiles.id', ondelete='CASCADE'), nullable=False)
    leave_type_id = db.Column(db.String(36), db.ForeignKey('leave_types.id', ondelete='CASCADE'), nullable=False)
    
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    duration_days = db.Column(db.Numeric(5, 1), nullable=False)
    
    is_half_day = db.Column(db.Boolean, default=False)
    half_day_period = db.Column(db.String(20)) # FIRST_HALF / SECOND_HALF
    
    reason = db.Column(db.Text)
    status = db.Column(db.String(30), default='DRAFT', nullable=False) # DRAFT, PENDING, APPROVED, REJECTED, CANCELLED
    
    reviewed_by = db.Column(db.String(36), db.ForeignKey('user_profiles.id', ondelete='SET NULL'))
    reviewed_at = db.Column(db.DateTime)
    reviewer_comment = db.Column(db.Text)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = db.relationship('UserProfile', foreign_keys=[user_id], backref=db.backref('leave_requests', lazy=True))
    leave_type = db.relationship('LeaveType', backref=db.backref('requests', lazy=True))
    reviewer = db.relationship('UserProfile', foreign_keys=[reviewed_by])

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user_name': f"{self.user.first_name} {self.user.last_name}" if self.user else "Unknown",
            'leave_type_id': self.leave_type_id,
            'leave_type_name': self.leave_type.name if self.leave_type else None,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'duration_days': float(self.duration_days),
            'is_half_day': self.is_half_day,
            'half_day_period': self.half_day_period,
            'reason': self.reason,
            'status': self.status,
            'reviewed_by': self.reviewed_by,
            'reviewed_by_name': f"{self.reviewer.first_name} {self.reviewer.last_name}" if self.reviewer else None,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'reviewer_comment': self.reviewer_comment,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
