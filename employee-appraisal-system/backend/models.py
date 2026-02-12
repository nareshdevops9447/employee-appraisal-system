"""
Database Models for Employee Appraisal System
"""

from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()


class Department(db.Model):
    __tablename__ = 'departments'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    users = db.relationship('User', backref='department', lazy='dynamic')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description
        }


class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(20), default='employee')
    user_type = db.Column(db.String(20), nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey('departments.id'))
    manager_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    hr_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    job_title = db.Column(db.String(100))
    hire_date = db.Column(db.Date)
    is_active = db.Column(db.Boolean, default=True)
    profile_picture = db.Column(db.String(500))
    phone = db.Column(db.String(20))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    subordinates = db.relationship('User', backref=db.backref('manager', remote_side=[id]), 
                                   foreign_keys=[manager_id], lazy='dynamic')
    hr_employees = db.relationship('User', backref=db.backref('hr', remote_side=[id]), 
                                   foreign_keys=[hr_id], lazy='dynamic')
    appraisals = db.relationship('Appraisal', foreign_keys='Appraisal.employee_id', backref='employee', lazy='dynamic')
    reviews = db.relationship('Appraisal', foreign_keys='Appraisal.reviewer_id', backref='reviewer', lazy='dynamic')
    
    def to_dict(self, include_sensitive=False):
        return {
            'id': self.id,
            'email': self.email,
            'firstName': self.first_name,
            'lastName': self.last_name,
            'fullName': self.first_name + ' ' + self.last_name,
            'role': self.role if self.role else 'employee',
            'userType': self.user_type if self.user_type else 'office',
            'departmentId': self.department_id,
            'departmentName': self.department.name if self.department else None,
            'managerId': self.manager_id,
            'managerName': (self.manager.first_name + ' ' + self.manager.last_name) if self.manager else None,
            'hrId': self.hr_id,
            'hrName': (self.hr.first_name + ' ' + self.hr.last_name) if self.hr else None,
            'jobTitle': self.job_title,
            'hireDate': self.hire_date.isoformat() if self.hire_date else None,
            'isActive': self.is_active,
            'profilePicture': self.profile_picture,
            'phone': self.phone
        }


class AppraisalPeriod(db.Model):
    __tablename__ = 'appraisal_periods'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    submission_deadline = db.Column(db.Date, nullable=False)
    review_deadline = db.Column(db.Date, nullable=False)
    is_active = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    appraisals = db.relationship('Appraisal', backref='period', lazy='dynamic')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'startDate': self.start_date.isoformat(),
            'endDate': self.end_date.isoformat(),
            'submissionDeadline': self.submission_deadline.isoformat(),
            'reviewDeadline': self.review_deadline.isoformat(),
            'isActive': self.is_active
        }


class RatingCriteria(db.Model):
    __tablename__ = 'rating_criteria'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    category = db.Column(db.String(50))
    weight = db.Column(db.Numeric(3, 2), default=1.00)
    is_active = db.Column(db.Boolean, default=True)
    applies_to = db.Column(db.String(20), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'category': self.category,
            'weight': float(self.weight) if self.weight else 1.0,
            'isActive': self.is_active,
            'appliesTo': self.applies_to if self.applies_to else 'all'
        }


class Appraisal(db.Model):
    __tablename__ = 'appraisals'
    
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    reviewer_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    period_id = db.Column(db.Integer, db.ForeignKey('appraisal_periods.id'), nullable=False)
    status = db.Column(db.String(30), default='draft')
    self_rating = db.Column(db.Numeric(3, 2))
    manager_rating = db.Column(db.Numeric(3, 2))
    final_rating = db.Column(db.Numeric(3, 2))
    employee_comments = db.Column(db.Text)
    manager_comments = db.Column(db.Text)
    goals_achieved = db.Column(db.Text)
    areas_of_improvement = db.Column(db.Text)
    training_needs = db.Column(db.Text)
    submitted_at = db.Column(db.DateTime)
    reviewed_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    ratings = db.relationship('AppraisalRating', backref='appraisal', lazy='dynamic', cascade='all, delete-orphan')
    comments = db.relationship('AppraisalComment', backref='appraisal', lazy='dynamic', cascade='all, delete-orphan')
    
    __table_args__ = (
        db.UniqueConstraint('employee_id', 'period_id', name='unique_employee_period'),
    )
    
    def to_dict(self, include_ratings=False):
        data = {
            'id': self.id,
            'employeeId': self.employee_id,
            'employeeName': (self.employee.first_name + ' ' + self.employee.last_name) if self.employee else None,
            'employeeEmail': self.employee.email if self.employee else None,
            'reviewerId': self.reviewer_id,
            'reviewerName': (self.reviewer.first_name + ' ' + self.reviewer.last_name) if self.reviewer else None,
            'periodId': self.period_id,
            'periodName': self.period.name if self.period else None,
            'status': self.status if self.status else 'draft',
            'selfRating': float(self.self_rating) if self.self_rating else None,
            'managerRating': float(self.manager_rating) if self.manager_rating else None,
            'finalRating': float(self.final_rating) if self.final_rating else None,
            'employeeComments': self.employee_comments,
            'managerComments': self.manager_comments,
            'goalsAchieved': self.goals_achieved,
            'areasOfImprovement': self.areas_of_improvement,
            'trainingNeeds': self.training_needs,
            'submittedAt': self.submitted_at.isoformat() if self.submitted_at else None,
            'reviewedAt': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }
        
        if include_ratings:
            data['ratings'] = [r.to_dict() for r in self.ratings]
            data['commentThread'] = [c.to_dict() for c in self.comments.order_by(AppraisalComment.created_at)]
        
        return data


class AppraisalRating(db.Model):
    __tablename__ = 'appraisal_ratings'
    
    id = db.Column(db.Integer, primary_key=True)
    appraisal_id = db.Column(db.Integer, db.ForeignKey('appraisals.id', ondelete='CASCADE'), nullable=False)
    criteria_id = db.Column(db.Integer, db.ForeignKey('rating_criteria.id'), nullable=False)
    self_score = db.Column(db.Integer)
    manager_score = db.Column(db.Integer)
    self_comment = db.Column(db.Text)
    manager_comment = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    criteria = db.relationship('RatingCriteria')
    
    __table_args__ = (
        db.UniqueConstraint('appraisal_id', 'criteria_id', name='unique_appraisal_criteria'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'criteriaId': self.criteria_id,
            'criteriaName': self.criteria.name if self.criteria else None,
            'criteriaDescription': self.criteria.description if self.criteria else None,
            'category': self.criteria.category if self.criteria else None,
            'selfScore': self.self_score,
            'managerScore': self.manager_score,
            'selfComment': self.self_comment,
            'managerComment': self.manager_comment
        }


class AppraisalComment(db.Model):
    __tablename__ = 'appraisal_comments'
    
    id = db.Column(db.Integer, primary_key=True)
    appraisal_id = db.Column(db.Integer, db.ForeignKey('appraisals.id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    comment = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    user = db.relationship('User')
    
    def to_dict(self):
        return {
            'id': self.id,
            'userId': self.user_id,
            'userName': (self.user.first_name + ' ' + self.user.last_name) if self.user else None,
            'comment': self.comment,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }


class Goal(db.Model):
    __tablename__ = 'goals'
    
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    manager_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    period_id = db.Column(db.Integer, db.ForeignKey('appraisal_periods.id'))
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    target_date = db.Column(db.Date)
    status = db.Column(db.String(30), default='pending_acceptance')
    progress = db.Column(db.Integer, default=0)
    employee_accepted = db.Column(db.Boolean, default=False)
    manager_notes = db.Column(db.Text)
    employee_notes = db.Column(db.Text)
    rejection_reason = db.Column(db.Text)
    modification_request = db.Column(db.Text)
    self_rating = db.Column(db.Integer)
    manager_rating = db.Column(db.Integer)
    final_rating = db.Column(db.Numeric(3, 2))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    employee = db.relationship('User', foreign_keys=[employee_id], backref='goals_assigned')
    manager = db.relationship('User', foreign_keys=[manager_id], backref='goals_created')
    period = db.relationship('AppraisalPeriod', backref='goals')
    comments = db.relationship('GoalComment', backref='goal', lazy='dynamic', cascade='all, delete-orphan')
    
    def to_dict(self, include_comments=False):
        data = {
            'id': self.id,
            'employeeId': self.employee_id,
            'employeeName': (self.employee.first_name + ' ' + self.employee.last_name) if self.employee else None,
            'managerId': self.manager_id,
            'managerName': (self.manager.first_name + ' ' + self.manager.last_name) if self.manager else None,
            'periodId': self.period_id,
            'periodName': self.period.name if self.period else None,
            'title': self.title,
            'description': self.description,
            'targetDate': self.target_date.isoformat() if self.target_date else None,
            'status': self.status,
            'progress': self.progress,
            'employeeAccepted': self.employee_accepted,
            'managerNotes': self.manager_notes,
            'employeeNotes': self.employee_notes,
            'rejectionReason': self.rejection_reason,
            'modificationRequest': self.modification_request,
            'selfRating': self.self_rating,
            'managerRating': self.manager_rating,
            'finalRating': float(self.final_rating) if self.final_rating else None,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_comments:
            data['comments'] = [c.to_dict() for c in self.comments.order_by(GoalComment.created_at.desc())]
        
        return data


class GoalComment(db.Model):
    __tablename__ = 'goal_comments'
    
    id = db.Column(db.Integer, primary_key=True)
    goal_id = db.Column(db.Integer, db.ForeignKey('goals.id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    comment = db.Column(db.Text, nullable=False)
    progress_update = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    user = db.relationship('User')
    
    def to_dict(self):
        return {
            'id': self.id,
            'goalId': self.goal_id,
            'userId': self.user_id,
            'userName': (self.user.first_name + ' ' + self.user.last_name) if self.user else None,
            'userRole': self.user.role if self.user else None,
            'comment': self.comment,
            'progressUpdate': self.progress_update,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }
