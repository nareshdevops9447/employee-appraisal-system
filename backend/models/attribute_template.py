"""Attribute Template model — HR-defined competencies for appraisal cycles."""
import uuid
from datetime import datetime, timezone
from extensions import db


class AttributeTemplate(db.Model):
    __tablename__ = 'attribute_templates'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    cycle_id = db.Column(db.String(36), db.ForeignKey('appraisal_cycles.id'), nullable=False, index=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    display_order = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)

    created_by = db.Column(db.String(36), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationship
    cycle = db.relationship('AppraisalCycle', backref=db.backref('attribute_templates', lazy='dynamic'))

    __table_args__ = (
        db.UniqueConstraint('cycle_id', 'title', name='_cycle_attribute_title_uc'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'cycle_id': self.cycle_id,
            'title': self.title,
            'description': self.description,
            'display_order': self.display_order,
            'is_active': self.is_active,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
