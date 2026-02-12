import uuid
from datetime import datetime, timezone
from sqlalchemy.dialects.postgresql import JSONB
from extensions import db

class Appraisal(db.Model):
    __tablename__ = 'appraisals'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    cycle_id = db.Column(db.String(36), db.ForeignKey('appraisal_cycles.id'), nullable=False)
    
    employee_id = db.Column(db.String(36), nullable=False, index=True) # Ref User Service
    manager_id = db.Column(db.String(36), nullable=True) # Ref User Service
    
    # enum: 'not_started', 'self_assessment', 'manager_review', 
    #       'meeting_scheduled', 'meeting_completed', 'acknowledged', 'closed'
    status = db.Column(db.String(50), nullable=False, default='not_started')
    
    # JSON content for flexible form responses
    self_assessment = db.Column(JSONB, nullable=True)
    self_assessment_submitted_at = db.Column(db.DateTime(timezone=True), nullable=True)
    
    manager_assessment = db.Column(JSONB, nullable=True)
    manager_assessment_submitted_at = db.Column(db.DateTime(timezone=True), nullable=True)
    
    # 1-5 scale
    overall_rating = db.Column(db.Integer, nullable=True)
    
    meeting_date = db.Column(db.DateTime(timezone=True), nullable=True)
    meeting_notes = db.Column(db.Text, nullable=True)
    
    employee_acknowledgement = db.Column(db.Boolean, default=False)
    employee_acknowledgement_date = db.Column(db.DateTime(timezone=True), nullable=True)
    employee_comments = db.Column(db.Text, nullable=True)

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
    peer_feedbacks = db.relationship('PeerFeedback', backref='appraisal', lazy='dynamic')

    def to_dict(self):
        return {
            'id': self.id,
            'cycle_id': self.cycle_id,
            'employee_id': self.employee_id,
            'manager_id': self.manager_id,
            'status': self.status,
            'self_assessment': self.self_assessment,
            'self_assessment_submitted_at': self.self_assessment_submitted_at.isoformat() if self.self_assessment_submitted_at else None,
            'manager_assessment': self.manager_assessment,
            'manager_assessment_submitted_at': self.manager_assessment_submitted_at.isoformat() if self.manager_assessment_submitted_at else None,
            'overall_rating': self.overall_rating,
            'meeting_date': self.meeting_date.isoformat() if self.meeting_date else None,
            'meeting_notes': self.meeting_notes,
            'employee_acknowledgement': self.employee_acknowledgement,
            'employee_acknowledgement_date': self.employee_acknowledgement_date.isoformat() if self.employee_acknowledgement_date else None,
            'employee_comments': self.employee_comments,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }
