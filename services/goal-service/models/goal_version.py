import uuid
from datetime import datetime, timezone
from extensions import db

class GoalVersion(db.Model):
    __tablename__ = 'goal_versions'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    goal_id = db.Column(db.String(36), db.ForeignKey('goals.id'), nullable=False)
    version_number = db.Column(db.Integer, nullable=False)
    
    # Snapshot fields
    title = db.Column(db.String(255))
    description = db.Column(db.Text)
    category = db.Column(db.String(50))
    priority = db.Column(db.String(50))
    start_date = db.Column(db.Date)
    target_date = db.Column(db.Date)
    
    approval_status = db.Column(db.String(50))
    rejected_reason = db.Column(db.String(500))
    
    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    
    created_by = db.Column(db.String(36))

    def to_dict(self):
        return {
            'id': self.id,
            'goal_id': self.goal_id,
            'version_number': self.version_number,
            'title': self.title,
            'description': self.description,
            'category': self.category,
            'priority': self.priority,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'target_date': self.target_date.isoformat() if self.target_date else None,
            'approval_status': self.approval_status,
            'rejected_reason': self.rejected_reason,
            'created_at': self.created_at.isoformat(),
            'created_by': self.created_by
        }
