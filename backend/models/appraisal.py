"""Appraisal model — individual employee appraisal records."""
import uuid
from datetime import datetime, timezone
from extensions import db


class Appraisal(db.Model):
    __tablename__ = 'appraisals'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    cycle_id = db.Column(db.String(36), db.ForeignKey('appraisal_cycles.id'), nullable=False, index=True)
    employee_id = db.Column(
        db.String(36),
        db.ForeignKey('user_profiles.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
    )
    manager_id = db.Column(
        db.String(36),
        db.ForeignKey('user_profiles.id', ondelete='SET NULL'),
        nullable=True,
    )
    status = db.Column(db.String(30), default='not_started')
    goals_finalized = db.Column(db.Boolean, default=False)
    
    # Cycle Overrides (for individual probation timelines)
    start_date = db.Column(db.Date, nullable=True)
    end_date = db.Column(db.Date, nullable=True)

    # Eligibility
    eligibility_status = db.Column(db.String(30), nullable=True)
    eligibility_reason = db.Column(db.Text, nullable=True)
    is_prorated = db.Column(db.Boolean, default=False)

    # Self-assessment data
    self_assessment = db.Column(db.JSON, nullable=True)
    goal_ratings = db.Column(db.JSON, nullable=True)
    self_submitted = db.Column(db.Boolean, default=False)
    self_assessment_submitted_at = db.Column(db.DateTime(timezone=True), nullable=True)

    # Manager assessment data
    manager_assessment = db.Column(db.JSON, nullable=True)
    manager_goal_ratings = db.Column(db.JSON, nullable=True)
    manager_submitted = db.Column(db.Boolean, default=False)
    manager_assessment_submitted_at = db.Column(db.DateTime(timezone=True), nullable=True)

    # Ratings
    goals_avg_rating = db.Column(db.Numeric(3, 2), nullable=True)  # 1.00 - 5.00
    attributes_avg_rating = db.Column(db.Numeric(3, 2), nullable=True)
    calculated_rating = db.Column(db.Numeric(3, 2), nullable=True)
    overall_rating = db.Column(db.Integer, nullable=True)

    # Meeting
    meeting_date = db.Column(db.DateTime(timezone=True), nullable=True)
    meeting_notes = db.Column(db.Text, nullable=True)

    # Manager narrative (Phase 2.2)
    strengths = db.Column(db.Text, nullable=True)
    development_areas = db.Column(db.Text, nullable=True)
    overall_comment = db.Column(db.Text, nullable=True)

    # Acknowledgement
    employee_acknowledgement = db.Column(db.Boolean, default=False)
    employee_acknowledgement_date = db.Column(db.DateTime(timezone=True), nullable=True)
    employee_comments = db.Column(db.Text, nullable=True)
    is_dispute = db.Column(db.Boolean, default=False)

    # Timestamps
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    cycle = db.relationship('AppraisalCycle', backref='appraisals')
    employee = db.relationship(
        'UserProfile',
        foreign_keys=[employee_id],
        primaryjoin='Appraisal.employee_id == UserProfile.id',
        backref='appraisals',
        overlaps="appraisals"
    )
    manager = db.relationship(
        'UserProfile',
        foreign_keys=[manager_id],
        primaryjoin='Appraisal.manager_id == UserProfile.id',
        backref='manager_appraisals',
        overlaps="manager_appraisals"
    )
    peer_feedbacks = db.relationship('PeerFeedback', backref='appraisal', lazy='dynamic')

    def to_dict(self):
        # Base dictionary
        d = {
            'id': self.id,
            'cycle_id': self.cycle_id,
            'employee_id': self.employee_id,
            'manager_id': self.manager_id,
            'status': self.status,
            'eligibility_status': self.eligibility_status,
            'eligibility_reason': self.eligibility_reason,
            'is_prorated': self.is_prorated,
            'self_assessment': self.self_assessment,
            'goal_ratings': self.goal_ratings,
            'self_submitted': self.self_submitted,
            'self_assessment_submitted_at': self.self_assessment_submitted_at.isoformat() if self.self_assessment_submitted_at else None,
            'manager_assessment': self.manager_assessment,
            'manager_goal_ratings': self.manager_goal_ratings,
            'manager_submitted': self.manager_submitted,
            'manager_assessment_submitted_at': self.manager_assessment_submitted_at.isoformat() if self.manager_assessment_submitted_at else None,
            'goals_avg_rating': float(self.goals_avg_rating) if self.goals_avg_rating else None,
            'attributes_avg_rating': float(self.attributes_avg_rating) if self.attributes_avg_rating else None,
            'calculated_rating': float(self.calculated_rating) if self.calculated_rating else None,
            'overall_rating': self.overall_rating,
            'goals_finalized': self.goals_finalized,
            'strengths': self.strengths,
            'development_areas': self.development_areas,
            'overall_comment': self.overall_comment,
            'meeting_date': self.meeting_date.isoformat() if self.meeting_date else None,
            'meeting_notes': self.meeting_notes,
            'employee_acknowledgement': self.employee_acknowledgement,
            'employee_acknowledgement_date': self.employee_acknowledgement_date.isoformat() if self.employee_acknowledgement_date else None,
            'employee_comments': self.employee_comments,
            'is_dispute': self.is_dispute,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

        # Enrich with Cycle details
        if self.cycle:
            # Determine effective dates: Use individual overrides if present, else fallback to cycle dates
            eff_start_date = self.start_date if self.start_date else self.cycle.start_date
            eff_end_date = self.end_date if self.end_date else self.cycle.end_date
            
            d.update({
                'cycle_name': self.cycle.name,
                'cycle_type': self.cycle.cycle_type,
                'cycle_status': self.cycle.status,
                'cycle_start_date': eff_start_date.isoformat() if eff_start_date else None,
                'cycle_end_date': eff_end_date.isoformat() if eff_end_date else None,
                'self_assessment_deadline': self.cycle.self_assessment_deadline.isoformat() if self.cycle.self_assessment_deadline else None,
                'manager_review_deadline': self.cycle.manager_review_deadline.isoformat() if self.cycle.manager_review_deadline else None,
            })
            # Legacy field for some UI parts
            d['cycle'] = {
                'id': self.cycle.id,
                'name': self.cycle.name,
                'cycle_type': self.cycle.cycle_type,
                'status': self.cycle.status,
            }

        # Enrich with Employee details
        if self.employee:
            full_name = f"{self.employee.first_name} {self.employee.last_name}".strip()
            d.update({
                'employee_name': full_name or self.employee.email or self.employee_id,
                'employee_email': self.employee.email,
            })
        else:
            d.update({
                'employee_name': self.employee_id,
                'employee_email': '',
            })

        # Enrich with Manager details
        if self.manager:
            full_name = f"{self.manager.first_name} {self.manager.last_name}".strip()
            d.update({
                'manager_name': full_name or self.manager.email or self.manager_id,
                'manager_email': self.manager.email,
            })
        else:
            d.update({
                'manager_name': self.manager_id or 'N/A',
                'manager_email': '',
            })

        return d
