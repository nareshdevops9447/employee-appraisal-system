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
        db.ForeignKey('user_profiles.id', name='fk_department_head', use_alter=True),
        nullable=True
    )
    
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

    # Relationship to head of department (User)
    head = db.relationship('UserProfile', foreign_keys=[head_id], post_update=True)
    
    # Relationship to employees in this department
    employees = db.relationship('UserProfile', backref='department_ref', foreign_keys='UserProfile.department_id')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'head_id': self.head_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }