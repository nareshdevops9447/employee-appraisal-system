"""Goal model — employee goals and OKRs."""
import uuid
from datetime import datetime, timezone
from extensions import db


class Goal(db.Model):
    __tablename__ = 'goals'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    employee_id = db.Column(db.String(36), nullable=False, index=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    category = db.Column(db.String(50), default='performance')
    priority = db.Column(db.String(20), default='medium')
    status = db.Column(db.String(20), default='active')
    progress_percentage = db.Column(db.Integer, default=0)
    start_date = db.Column(db.Date, nullable=True)
    target_date = db.Column(db.Date, nullable=True)
    completed_date = db.Column(db.Date, nullable=True)
    parent_goal_id = db.Column(db.String(36), db.ForeignKey('goals.id'), nullable=True)
    appraisal_cycle_id = db.Column(db.String(36), nullable=True, index=True)
    created_by = db.Column(db.String(36), nullable=True)
    approval_status = db.Column(db.String(30), default='draft')
    approved_by = db.Column(db.String(36), nullable=True)
    approved_date = db.Column(db.DateTime(timezone=True), nullable=True)
    rejected_reason = db.Column(db.Text, nullable=True)
    
    # New Tier 2/3 fields
    goal_type = db.Column(db.String(20), default='performance')  # performance, development
    weight = db.Column(db.Integer, default=0)  # 0-100, only for performance
    dev_status = db.Column(db.String(20), nullable=True)  # not_started, in_progress, completed
    self_rating = db.Column(db.Integer, nullable=True)
    self_comment = db.Column(db.Text, nullable=True)
    manager_rating = db.Column(db.Integer, nullable=True)
    manager_comment = db.Column(db.Text, nullable=True)

    # Department scope — NULL = org-wide, set = department-specific
    department_id = db.Column(db.String(36), db.ForeignKey('departments.id'), nullable=True, index=True)

    version_number = db.Column(db.Integer, default=1)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    key_results = db.relationship('KeyResult', backref='goal', lazy='dynamic', cascade='all, delete-orphan')
    comments = db.relationship('GoalComment', backref='goal', lazy='dynamic', cascade='all, delete-orphan')
    children = db.relationship('Goal', backref=db.backref('parent', remote_side=[id]), lazy='dynamic')
    department = db.relationship('Department', backref=db.backref('goals', lazy='dynamic'))

    def to_dict(self):
        from models.user_profile import UserProfile
        emp = UserProfile.query.get(self.employee_id) if self.employee_id else None
        employee_name = f"{emp.first_name} {emp.last_name}" if emp else None
        return {
            'id': self.id,
            'employee_id': self.employee_id,
            'employee_name': employee_name,
            'title': self.title,
            'description': self.description,
            'category': self.category,
            'priority': self.priority,
            'status': self.status,
            'progress_percentage': self.progress_percentage,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'target_date': self.target_date.isoformat() if self.target_date else None,
            'completed_date': self.completed_date.isoformat() if self.completed_date else None,
            'parent_goal_id': self.parent_goal_id,
            'appraisal_cycle_id': self.appraisal_cycle_id,
            'created_by': self.created_by,
            'approval_status': self.approval_status,
            'approved_by': self.approved_by,
            'approved_date': self.approved_date.isoformat() if self.approved_date else None,
            'rejected_reason': self.rejected_reason,
            'version_number': self.version_number,
            'goal_type': self.goal_type,
            'weight': self.weight,
            'dev_status': self.dev_status,
            'self_rating': self.self_rating,
            'self_comment': self.self_comment,
            'manager_rating': self.manager_rating,
            'manager_comment': self.manager_comment,
            'key_results': [kr.to_dict() for kr in self.key_results],
            'department_id': self.department_id,
            'department_name': self.department.name if self.department else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
