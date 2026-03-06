"""TeamTransfer model — tracks when employees change teams/departments."""
import uuid
from datetime import datetime, timezone
from extensions import db


class TeamTransfer(db.Model):
    __tablename__ = 'team_transfers'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('user_profiles.id'), nullable=False, index=True)
    from_department_id = db.Column(db.String(36), db.ForeignKey('departments.id'), nullable=True)
    to_department_id = db.Column(db.String(36), db.ForeignKey('departments.id'), nullable=True)
    from_manager_id = db.Column(db.String(36), db.ForeignKey('user_profiles.id'), nullable=True)
    to_manager_id = db.Column(db.String(36), db.ForeignKey('user_profiles.id'), nullable=True)
    transfer_date = db.Column(db.Date, nullable=False, default=lambda: datetime.now(timezone.utc).date())
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = db.relationship('UserProfile', foreign_keys=[user_id], backref='transfers')
    from_department = db.relationship('Department', foreign_keys=[from_department_id])
    to_department = db.relationship('Department', foreign_keys=[to_department_id])

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'from_department_id': self.from_department_id,
            'to_department_id': self.to_department_id,
            'from_manager_id': self.from_manager_id,
            'to_manager_id': self.to_manager_id,
            'transfer_date': self.transfer_date.isoformat() if self.transfer_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
