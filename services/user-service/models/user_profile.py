import uuid
from datetime import datetime, timezone
from extensions import db

class UserProfile(db.Model):
    __tablename__ = 'user_profiles'

    id = db.Column(db.String(36), primary_key=True)  # Matches Auth Service ID
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    job_title = db.Column(db.String(100), nullable=True)
    department_id = db.Column(db.String(36), db.ForeignKey('departments.id'), nullable=True)
    
    # Self-referential partial key for manager
    manager_id = db.Column(db.String(36), db.ForeignKey('user_profiles.id'), nullable=True)
    
    # Azure Object ID for syncing
    azure_oid = db.Column(db.String(36), unique=True, nullable=True, index=True)
    
    employment_type = db.Column(db.String(20), nullable=False, default='full_time') 
    # full_time, part_time, contractor, volunteer
    
    start_date = db.Column(db.Date, nullable=True)
    avatar_url = db.Column(db.String(255), nullable=True)
    phone = db.Column(db.String(20), nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    
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
    manager = db.relationship('UserProfile', remote_side=[id], backref='direct_reports')
    # Department relationship is defined in Department model via backref 'department_ref'
    # but we can access it via .department_ref

    @property
    def department_name(self):
        return self.department_ref.name if self.department_ref else None

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'full_name': f"{self.first_name} {self.last_name}",
            'job_title': self.job_title,
            'department_id': self.department_id,
            'department_name': self.department_name,
            'manager_id': self.manager_id,
            'azure_oid': self.azure_oid,
            'employment_type': self.employment_type,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'avatar_url': self.avatar_url,
            'phone': self.phone,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
