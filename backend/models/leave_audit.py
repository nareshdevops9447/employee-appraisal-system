import uuid
from datetime import datetime
from extensions import db

class LeaveAudit(db.Model):
    """
    Immutable audit trail for leave request status changes.
    """
    __tablename__ = 'leave_audit_logs'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    leave_request_id = db.Column(db.String(36), db.ForeignKey('leave_requests.id', ondelete='CASCADE'), nullable=False)
    performed_by = db.Column(db.String(36), db.ForeignKey('user_profiles.id', ondelete='SET NULL'))
    
    old_status = db.Column(db.String(30))
    new_status = db.Column(db.String(30), nullable=False)
    comment = db.Column(db.Text)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    leave_request = db.relationship('LeaveRequest', backref=db.backref('audit_logs', lazy=True, order_by='LeaveAudit.created_at'))
    performer = db.relationship('UserProfile')

    def to_dict(self):
        return {
            'id': self.id,
            'leave_request_id': self.leave_request_id,
            'performed_by': self.performed_by,
            'performed_by_name': f"{self.performer.first_name} {self.performer.last_name}" if self.performer else None,
            'old_status': self.old_status,
            'new_status': self.new_status,
            'comment': self.comment,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
