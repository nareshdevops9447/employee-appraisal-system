"""
Appraisal model — stores per-employee appraisal data for a cycle.

Status flow (state machine in services/workflow.py):
    not_started → goals_pending_approval → goals_approved →
    self_assessment_in_progress → manager_review → completed
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy.dialects.postgresql import JSONB
from extensions import db


class Appraisal(db.Model):
    __tablename__ = 'appraisals'

    id = db.Column(db.String(36), primary_key=True,
                   default=lambda: str(uuid.uuid4()))
    cycle_id = db.Column(db.String(36),
                         db.ForeignKey('appraisal_cycles.id'), nullable=False)

    employee_id = db.Column(db.String(36), nullable=False, index=True)
    manager_id = db.Column(db.String(36), nullable=True)

    # ── Eligibility / Onboarding Info ──
    is_prorated = db.Column(db.Boolean, default=False)
    eligibility_status = db.Column(db.String(50), nullable=True)  # e.g. 'eligible', 'pending_hr_review'
    eligibility_reason = db.Column(db.String(255), nullable=True)


    # ── Workflow status ──
    # See APPRAISAL_STATES in services/workflow.py
    status = db.Column(db.String(50), nullable=False, default='not_started')

    # ── Submission flags (drive the state machine) ──
    self_submitted = db.Column(db.Boolean, default=False, nullable=False)
    manager_submitted = db.Column(db.Boolean, default=False, nullable=False)

    # ── Self-assessment data ──
    # goal_ratings: { "<goal_id>": { "rating": 4, "progress": 80, "comment": "..." }, ... }
    goal_ratings = db.Column(JSONB, nullable=True)
    # self_assessment: generic answers to cycle questions (JSONB)
    self_assessment = db.Column(JSONB, nullable=True)
    self_assessment_submitted_at = db.Column(
        db.DateTime(timezone=True), nullable=True)

    # ── Manager review data ──
    manager_assessment = db.Column(JSONB, nullable=True)
    manager_assessment_submitted_at = db.Column(
        db.DateTime(timezone=True), nullable=True)
    # manager_goal_ratings: { "<goal_id>": { "rating": 3, "comment": "..." }, ... }
    manager_goal_ratings = db.Column(JSONB, nullable=True)

    # ── Overall rating (1-5) ──
    overall_rating = db.Column(db.Integer, nullable=True)

    # ── Meeting ──
    meeting_date = db.Column(db.DateTime(timezone=True), nullable=True)
    meeting_notes = db.Column(db.Text, nullable=True)

    # ── Employee acknowledgement ──
    employee_acknowledgement = db.Column(db.Boolean, default=False)
    employee_acknowledgement_date = db.Column(
        db.DateTime(timezone=True), nullable=True)
    employee_comments = db.Column(db.Text, nullable=True)

    # ── Timestamps ──
    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # ── Relationships ──
    cycle = db.relationship(
        'AppraisalCycle', backref=db.backref('appraisals', lazy='dynamic'), lazy='joined')

    def to_dict(self, include_cycle=True):
        data = {
            'id': self.id,
            'cycle_id': self.cycle_id,
            'employee_id': self.employee_id,
            'manager_id': self.manager_id,
            'is_prorated': self.is_prorated,
            'eligibility_status': self.eligibility_status,
            'eligibility_reason': self.eligibility_reason,
            'status': self.status,
            'self_submitted': self.self_submitted,
            'manager_submitted': self.manager_submitted,
            'goal_ratings': self.goal_ratings,
            'self_assessment': self.self_assessment,
            'self_assessment_submitted_at': (
                self.self_assessment_submitted_at.isoformat()
                if self.self_assessment_submitted_at else None
            ),
            'manager_assessment': self.manager_assessment,
            'manager_assessment_submitted_at': (
                self.manager_assessment_submitted_at.isoformat()
                if self.manager_assessment_submitted_at else None
            ),
            'manager_goal_ratings': self.manager_goal_ratings,
            'overall_rating': self.overall_rating,
            'meeting_date': (
                self.meeting_date.isoformat() if self.meeting_date else None),
            'meeting_notes': self.meeting_notes,
            'employee_acknowledgement': self.employee_acknowledgement,
            'employee_acknowledgement_date': (
                self.employee_acknowledgement_date.isoformat()
                if self.employee_acknowledgement_date else None
            ),
            'employee_comments': self.employee_comments,
            'created_at': (
                self.created_at.isoformat() if self.created_at else None),
            'updated_at': (
                self.updated_at.isoformat() if self.updated_at else None),
        }

        if include_cycle and self.cycle:
            data['cycle_name'] = self.cycle.name
            data['cycle_type'] = self.cycle.cycle_type
            data['cycle_status'] = self.cycle.status
            data['cycle_start_date'] = (
                self.cycle.start_date.isoformat()
                if self.cycle.start_date else None
            )
            data['cycle_end_date'] = (
                self.cycle.end_date.isoformat()
                if self.cycle.end_date else None
            )
            data['self_assessment_deadline'] = (
                self.cycle.self_assessment_deadline.isoformat()
                if self.cycle.self_assessment_deadline else None
            )
            data['manager_review_deadline'] = (
                self.cycle.manager_review_deadline.isoformat()
                if self.cycle.manager_review_deadline else None
            )

        return data