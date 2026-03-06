"""AppraisalCycle model — performance review cycle configuration."""
import uuid
from datetime import datetime, timezone
from extensions import db


class AppraisalCycle(db.Model):
    __tablename__ = 'appraisal_cycles'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    cycle_type = db.Column(db.String(30), default='annual')
    status = db.Column(db.String(20), default='draft')
    start_date = db.Column(db.Date, nullable=True)
    end_date = db.Column(db.Date, nullable=True)
    self_assessment_deadline = db.Column(db.Date, nullable=True)
    manager_review_deadline = db.Column(db.Date, nullable=True)
    created_by = db.Column(db.String(36), nullable=True)

    # New joiner eligibility configuration
    minimum_service_months = db.Column(db.Integer, default=0)
    eligibility_cutoff_date = db.Column(db.Date, nullable=True)
    include_probation_employees = db.Column(db.Boolean, default=True)
    new_joiner_policy = db.Column(db.String(30), default='AUTO_INCLUDE')
    prorated_evaluation_allowed = db.Column(db.Boolean, default=True)

    # Configurable score weights (must sum to 100)
    goals_weight = db.Column(db.Integer, default=70, nullable=False)
    attributes_weight = db.Column(db.Integer, default=30, nullable=False)

    peer_feedback_weight = db.Column(db.Integer, default=0, nullable=False)

    # Optional calibration step
    requires_calibration = db.Column(db.Boolean, default=False, nullable=False)

    # Links probation spillover cycle to its parent annual cycle
    parent_cycle_id = db.Column(db.String(36), db.ForeignKey('appraisal_cycles.id'), nullable=True)

    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    questions = db.relationship('AppraisalQuestion', backref='cycle', lazy='dynamic', cascade='all, delete-orphan')

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
            'minimum_service_months': self.minimum_service_months,
            'eligibility_cutoff_date': self.eligibility_cutoff_date.isoformat() if self.eligibility_cutoff_date else None,
            'include_probation_employees': self.include_probation_employees,
            'new_joiner_policy': self.new_joiner_policy,
            'prorated_evaluation_allowed': self.prorated_evaluation_allowed,
            'goals_weight': self.goals_weight,
            'attributes_weight': self.attributes_weight,
            'peer_feedback_weight': self.peer_feedback_weight,
            'requires_calibration': self.requires_calibration,
            'parent_cycle_id': self.parent_cycle_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
