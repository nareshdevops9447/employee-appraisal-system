"""Goal Template model — HR-defined performance goals for appraisal cycles."""
import uuid
from datetime import datetime, timezone
from extensions import db


class GoalTemplate(db.Model):
    __tablename__ = 'goal_templates'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    cycle_id = db.Column(db.String(36), db.ForeignKey('appraisal_cycles.id'), nullable=False, index=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    category = db.Column(db.String(50), default='performance')
    display_order = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)

    # NULL = org-wide template; set to a department id = department-specific
    department_id = db.Column(db.String(36), db.ForeignKey('departments.id'), nullable=True, index=True)

    created_by = db.Column(db.String(36), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    cycle = db.relationship('AppraisalCycle', backref=db.backref('goal_templates', lazy='dynamic'))
    department = db.relationship('Department', backref=db.backref('goal_templates', lazy='dynamic'))

    __table_args__ = (
        db.UniqueConstraint('cycle_id', 'title', 'department_id', name='_cycle_goal_title_dept_uc'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'cycle_id': self.cycle_id,
            'cycle_name': self.cycle.name if self.cycle else None,
            'cycle_type': self.cycle.cycle_type if self.cycle else None,
            'title': self.title,
            'description': self.description,
            'category': self.category,
            'display_order': self.display_order,
            'is_active': self.is_active,
            'department_id': self.department_id,
            'department_name': self.department.name if self.department else None,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
