"""Department model — organisational departments."""
import uuid
from datetime import datetime, timezone
from extensions import db


class Department(db.Model):
    __tablename__ = 'departments'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.Text, nullable=True)
    head_id = db.Column(
        db.String(36),
        db.ForeignKey('user_profiles.id', name='fk_departments_head_id'),
        nullable=True,
    )
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    head = db.relationship(
        'UserProfile',
        foreign_keys=[head_id],
        backref='headed_departments',
    )

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'head_id': self.head_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
