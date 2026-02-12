import uuid
from datetime import datetime, timezone
from extensions import db

class Goal(db.Model):
    __tablename__ = 'goals'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    employee_id = db.Column(db.String(36), nullable=False, index=True)
    
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    
    # enum: 'performance', 'development', 'project', 'mission_aligned'
    category = db.Column(db.String(50), nullable=False, default='performance')
    
    # enum: 'low', 'medium', 'high', 'critical'
    priority = db.Column(db.String(50), nullable=False, default='medium')
    
    # enum: 'draft', 'active', 'in_progress', 'completed', 'cancelled', 'deferred'
    status = db.Column(db.String(50), nullable=False, default='draft')
    
    progress_percentage = db.Column(db.Integer, default=0)
    
    start_date = db.Column(db.Date, nullable=False)
    target_date = db.Column(db.Date, nullable=False)
    completed_date = db.Column(db.Date, nullable=True)
    
    parent_goal_id = db.Column(db.String(36), db.ForeignKey('goals.id'), nullable=True)
    appraisal_cycle_id = db.Column(db.String(36), nullable=True) 

    created_by = db.Column(db.String(36), nullable=False)
    approved_by = db.Column(db.String(36), nullable=True)
    
    # enum: 'pending', 'approved', 'revision_requested'
    approval_status = db.Column(db.String(50), default='pending')

    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    
    # Relationships
    key_results = db.relationship('KeyResult', backref='goal', cascade='all, delete-orphan')
    comments = db.relationship('GoalComment', backref='goal', cascade='all, delete-orphan')
    children = db.relationship('Goal', backref=db.backref('parent', remote_side=[id]))

    def to_dict(self):
        return {
            'id': self.id,
            'employee_id': self.employee_id,
            'title': self.title,
            'description': self.description,
            'category': self.category,
            'priority': self.priority,
            'status': self.status,
            'progress_percentage': self.progress_percentage,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'target_date': self.target_date.isoformat() if self.target_date else None,
            'completed_date': self.completed_date.isoformat() if self.completed_date else None,
            'parent_goal_id': self.parent_goal_id,
            'appraisal_cycle_id': self.appraisal_cycle_id,
            'created_by': self.created_by,
            'approved_by': self.approved_by,
            'approval_status': self.approval_status,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            # Optionally include limited children info or just IDs
            'key_results': [kr.to_dict() for kr in self.key_results]
        }
