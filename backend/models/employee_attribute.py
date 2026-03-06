"""Employee Attribute model — stores ratings and comments for individual employees."""
import uuid
from datetime import datetime, timezone
from extensions import db


class EmployeeAttribute(db.Model):
    __tablename__ = 'employee_attributes'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    attribute_template_id = db.Column(db.String(36), db.ForeignKey('attribute_templates.id'), nullable=False)
    cycle_id = db.Column(db.String(36), db.ForeignKey('appraisal_cycles.id'), nullable=False, index=True)
    employee_id = db.Column(db.String(36), nullable=False, index=True)

    # Self Assessment
    self_rating = db.Column(db.Float, nullable=True)
    self_comment = db.Column(db.Text, nullable=True)

    # Manager Review
    manager_rating = db.Column(db.Float, nullable=True)
    manager_comment = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    attribute_template = db.relationship('AttributeTemplate', backref=db.backref('employee_ratings', lazy='dynamic'))
    cycle = db.relationship('AppraisalCycle')
    employee = db.relationship(
        'UserProfile',
        foreign_keys=[employee_id],
        primaryjoin='EmployeeAttribute.employee_id == UserProfile.id',
        backref='attribute_ratings'
    )

    __table_args__ = (
        db.UniqueConstraint('attribute_template_id', 'cycle_id', 'employee_id', name='_employee_attribute_uc'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'attribute_template_id': self.attribute_template_id,
            'cycle_id': self.cycle_id,
            'employee_id': self.employee_id,
            'self_rating': self.self_rating,
            'self_comment': self.self_comment,
            'manager_rating': self.manager_rating,
            'manager_comment': self.manager_comment,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'template_title': self.attribute_template.title if self.attribute_template else None,
            'template_description': self.attribute_template.description if self.attribute_template else None,
        }
