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
    
    # ── New Joiner / Eligibility Config ──
    minimum_service_months = db.Column(db.Integer, default=3, nullable=False)
    eligibility_cutoff_date = db.Column(db.Date, nullable=True)
    include_probation_employees = db.Column(db.Boolean, default=False, nullable=False)
    prorated_evaluation_allowed = db.Column(db.Boolean, default=True, nullable=False)
    
    # Policy: 'AUTO_INCLUDE_IF_ELIGIBLE', 'MANUAL_HR_DECISION', 'ALWAYS_DEFER'
    new_joiner_policy = db.Column(db.String(50), default='AUTO_INCLUDE_IF_ELIGIBLE', nullable=False)

    
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
    # appraisals relationship is defined in Appraisal model via backref

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
            'minimum_service_months': self.minimum_service_months,
            'eligibility_cutoff_date': self.eligibility_cutoff_date.isoformat() if self.eligibility_cutoff_date else None,
            'include_probation_employees': self.include_probation_employees,
            'prorated_evaluation_allowed': self.prorated_evaluation_allowed,
            'new_joiner_policy': self.new_joiner_policy,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }
