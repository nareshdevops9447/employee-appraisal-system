import uuid
from datetime import datetime, timezone
from extensions import db

class AppraisalCycle(db.Model):
    __tablename__ = 'appraisal_cycles'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    
    # enum: 'annual', 'mid_year', 'probation', 'adhoc'
    cycle_type = db.Column(db.String(50), nullable=False, default='annual')
    
    # enum: 'draft', 'active', 'in_review', 'completed', 'archived'
    status = db.Column(db.String(50), nullable=False, default='draft')
    
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    self_assessment_deadline = db.Column(db.Date, nullable=True)
    manager_review_deadline = db.Column(db.Date, nullable=True)
    
    created_by = db.Column(db.String(36), nullable=False) # HR Admin ID
    
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
    questions = db.relationship('AppraisalQuestion', backref='cycle', cascade='all, delete-orphan')
    appraisals = db.relationship('Appraisal', backref='cycle', lazy='dynamic')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'cycle_type': self.cycle_type,
            'status': self.status,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'self_assessment_deadline': self.self_assessment_deadline.isoformat() if self.self_assessment_deadline else None,
            'manager_review_deadline': self.manager_review_deadline.isoformat() if self.manager_review_deadline else None,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }
