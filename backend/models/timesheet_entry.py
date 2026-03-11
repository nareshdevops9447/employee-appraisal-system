import uuid
from datetime import datetime
from extensions import db

class TimesheetEntry(db.Model):
    """
    Daily hours logged by an employee.
    """
    __tablename__ = 'timesheet_entries'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('user_profiles.id', ondelete='CASCADE'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    
    project_id = db.Column(db.String(36), db.ForeignKey('projects.id', ondelete='SET NULL'))
    leave_request_id = db.Column(db.String(36), db.ForeignKey('leave_requests.id', ondelete='SET NULL'))
    
    hours = db.Column(db.Numeric(4, 2), nullable=False, default=0.0)
    entry_type = db.Column(db.String(20), default='WORK', nullable=False) # WORK, LEAVE, HOLIDAY, COMP_OFF
    description = db.Column(db.Text)
    
    is_auto_generated = db.Column(db.Boolean, default=False)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = db.relationship('UserProfile', backref=db.backref('timesheet_entries', lazy=True))
    project = db.relationship('Project', backref=db.backref('entries', lazy=True))
    leave_request = db.relationship('LeaveRequest', backref=db.backref('timesheet_entries', lazy=True))

    __table_args__ = (
        db.UniqueConstraint('user_id', 'date', 'project_id', name='_user_date_project_uc'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'date': self.date.isoformat() if self.date else None,
            'project_id': self.project_id,
            'project_code': self.project.code if self.project else None,
            'project_name': self.project.name if self.project else None,
            'leave_request_id': self.leave_request_id,
            'hours': float(self.hours),
            'entry_type': self.entry_type,
            'description': self.description,
            'is_auto_generated': self.is_auto_generated,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
