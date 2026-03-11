import uuid
from datetime import datetime
from extensions import db

class LeaveBalance(db.Model):
    """
    Tracks annual leave allocations and usage per user per leave type.
    """
    __tablename__ = 'leave_balances'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('user_profiles.id', ondelete='CASCADE'), nullable=False)
    leave_type_id = db.Column(db.String(36), db.ForeignKey('leave_types.id', ondelete='CASCADE'), nullable=False)
    year = db.Column(db.Integer, nullable=False, default=lambda: datetime.utcnow().year)
    
    total_days = db.Column(db.Numeric(5, 1), default=0.0)
    used_days = db.Column(db.Numeric(5, 1), default=0.0)
    pending_days = db.Column(db.Numeric(5, 1), default=0.0)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = db.relationship('UserProfile', backref=db.backref('leave_balances', lazy=True))
    leave_type = db.relationship('LeaveType', backref=db.backref('balances', lazy=True))

    __table_args__ = (
        db.UniqueConstraint('user_id', 'leave_type_id', 'year', name='_user_leave_year_uc'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'leave_type_id': self.leave_type_id,
            'leave_type_name': self.leave_type.name if self.leave_type else None,
            'year': self.year,
            'total_days': float(self.total_days),
            'used_days': float(self.used_days),
            'pending_days': float(self.pending_days),
            'remaining_days': float(self.total_days - self.used_days - self.pending_days),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
