"""
Employee Appraisal System - Main Application
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from datetime import timedelta, datetime
from dotenv import load_dotenv
import os
import bcrypt
import re

from models import (
    db, User, Department, AppraisalPeriod, RatingCriteria,
    Appraisal, AppraisalRating, AppraisalComment, Goal, GoalComment
)

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)

# Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'postgresql://postgres:password@localhost/employee_appraisal')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=8)

# Initialize extensions
CORS(app, origins=['http://localhost:3000'], supports_credentials=True)
jwt = JWTManager(app)
db.init_app(app)


# ============ HELPER FUNCTIONS ============

def determine_user_type(email):
    email_lower = email.lower()
    office_domains = ['outlook.com', 'hotmail.com', 'live.com', 'microsoft.com']
    
    for domain in office_domains:
        if email_lower.endswith('@' + domain):
            return 'office'
    
    field_domains = ['gmail.com', 'yahoo.com', 'aol.com', 'icloud.com', 'protonmail.com']
    for domain in field_domains:
        if email_lower.endswith('@' + domain):
            return 'field'
    
    return 'office'


def hash_password(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(password, password_hash):
    try:
        return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))
    except Exception as e:
        print("Password verification error:", e)
        return False


def calculate_average_rating(ratings, rating_type='self'):
    total_weight = 0
    weighted_sum = 0
    
    for rating in ratings:
        score = rating.self_score if rating_type == 'self' else rating.manager_score
        if score and rating.criteria:
            weight = float(rating.criteria.weight) if rating.criteria.weight else 1.0
            weighted_sum += score * weight
            total_weight += weight
    
    return round(weighted_sum / total_weight, 2) if total_weight > 0 else None


# ============ AUTH ROUTES ============

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email', '').lower().strip()
    password = data.get('password', '')
    
    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400
    
    user = User.query.filter_by(email=email).first()
    
    if not user:
        return jsonify({'error': 'Invalid email or password'}), 401
    
    if not verify_password(password, user.password_hash):
        return jsonify({'error': 'Invalid email or password'}), 401
    
    if not user.is_active:
        return jsonify({'error': 'Account is deactivated'}), 401
    
    access_token = create_access_token(identity=str(user.id))
    
    return jsonify({
        'token': access_token,
        'user': user.to_dict()
    })


@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json
    
    required_fields = ['email', 'password', 'firstName', 'lastName']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'error': field + ' is required'}), 400
    
    email = data['email'].lower().strip()
    
    if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
        return jsonify({'error': 'Invalid email format'}), 400
    
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 400
    
    user_type = determine_user_type(email)
    
    # Handle department_id
    dept_id = data.get('departmentId')
    if dept_id and dept_id != '':
        dept_id = int(dept_id)
    else:
        dept_id = None
    
    # Handle manager_id
    manager_id = data.get('managerId')
    if manager_id and manager_id != '':
        manager_id = int(manager_id)
    else:
        manager_id = None
    
    # Handle hr_id
    hr_id = data.get('hrId')
    if hr_id and hr_id != '':
        hr_id = int(hr_id)
    else:
        hr_id = None
    
    new_user = User(
        email=email,
        password_hash=hash_password(data['password']),
        first_name=data['firstName'],
        last_name=data['lastName'],
        user_type=user_type,
        role='employee',
        department_id=dept_id,
        manager_id=manager_id,
        hr_id=hr_id,
        job_title=data.get('jobTitle'),
        phone=data.get('phone')
    )
    
    db.session.add(new_user)
    db.session.commit()
    
    access_token = create_access_token(identity=str(new_user.id))
    
    return jsonify({
        'token': access_token,
        'user': new_user.to_dict(),
        'message': 'Registered as ' + user_type + ' employee based on your email'
    }), 201


@app.route('/api/auth/me', methods=['GET'])
@jwt_required()
def get_current_user():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify(user.to_dict())


@app.route('/api/auth/change-password', methods=['POST'])
@jwt_required()
def change_password():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    data = request.json
    
    if not verify_password(data.get('currentPassword', ''), user.password_hash):
        return jsonify({'error': 'Current password is incorrect'}), 400
    
    user.password_hash = hash_password(data['newPassword'])
    db.session.commit()
    
    return jsonify({'message': 'Password changed successfully'})


# ============ USER ROUTES ============

@app.route('/api/users', methods=['GET'])
@jwt_required()
def get_users():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if current_user.role not in ['admin', 'manager', 'hr']:
        return jsonify({'error': 'Unauthorized'}), 403
    
    query = User.query.filter_by(is_active=True)
    
    if request.args.get('departmentId'):
        query = query.filter_by(department_id=request.args.get('departmentId'))
    
    if request.args.get('userType'):
        query = query.filter_by(user_type=request.args.get('userType'))
    
    if request.args.get('role'):
        query = query.filter_by(role=request.args.get('role'))
    
    if current_user.role == 'manager':
        query = query.filter_by(manager_id=current_user.id)
    
    users = query.all()
    return jsonify([u.to_dict() for u in users])


@app.route('/api/users/managers', methods=['GET'])
def get_managers():
    """Get all users with manager role (public for registration)"""
    managers = User.query.filter_by(role='manager', is_active=True).all()
    return jsonify([{'id': m.id, 'name': m.first_name + ' ' + m.last_name, 'email': m.email} for m in managers])


@app.route('/api/users/hr', methods=['GET'])
def get_hr_users():
    """Get all users with HR role (public for registration)"""
    hr_users = User.query.filter_by(role='hr', is_active=True).all()
    return jsonify([{'id': h.id, 'name': h.first_name + ' ' + h.last_name, 'email': h.email} for h in hr_users])


@app.route('/api/users/<int:user_id>', methods=['GET'])
@jwt_required()
def get_user(user_id):
    user = User.query.get_or_404(user_id)
    return jsonify(user.to_dict())


@app.route('/api/users/<int:user_id>', methods=['PUT'])
@jwt_required()
def update_user(user_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    user = User.query.get_or_404(user_id)
    
    # Users can update themselves, admins can update anyone
    if current_user.role != 'admin' and str(current_user.id) != str(user_id):
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.json
    
    # Fields any user can update for themselves
    if 'firstName' in data:
        user.first_name = data['firstName']
    if 'lastName' in data:
        user.last_name = data['lastName']
    if 'jobTitle' in data:
        user.job_title = data['jobTitle']
    if 'phone' in data:
        user.phone = data['phone']
    if 'profilePicture' in data:
        user.profile_picture = data['profilePicture']
    
    # Employee can update their manager and HR
    if 'managerId' in data:
        manager_id = data['managerId']
        if manager_id and manager_id != '':
            user.manager_id = int(manager_id)
        else:
            user.manager_id = None
    
    if 'hrId' in data:
        hr_id = data['hrId']
        if hr_id and hr_id != '':
            user.hr_id = int(hr_id)
        else:
            user.hr_id = None
    
    if 'departmentId' in data:
        dept_id = data['departmentId']
        if dept_id and dept_id != '':
            user.department_id = int(dept_id)
        else:
            user.department_id = None
    
    # Admin-only fields
    if current_user.role == 'admin':
        if 'role' in data:
            user.role = data['role']
        if 'userType' in data:
            user.user_type = data['userType']
        if 'isActive' in data:
            user.is_active = data['isActive']
    
    db.session.commit()
    return jsonify(user.to_dict())


@app.route('/api/users', methods=['POST'])
@jwt_required()
def create_user():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.json
    email = data['email'].lower().strip()
    
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already exists'}), 400
    
    # Handle IDs
    dept_id = data.get('departmentId')
    if dept_id and dept_id != '':
        dept_id = int(dept_id)
    else:
        dept_id = None
    
    manager_id = data.get('managerId')
    if manager_id and manager_id != '':
        manager_id = int(manager_id)
    else:
        manager_id = None
    
    hr_id = data.get('hrId')
    if hr_id and hr_id != '':
        hr_id = int(hr_id)
    else:
        hr_id = None
    
    new_user = User(
        email=email,
        password_hash=hash_password(data.get('password', 'changeme123')),
        first_name=data['firstName'],
        last_name=data['lastName'],
        user_type=data.get('userType', 'office'),
        role=data.get('role', 'employee'),
        department_id=dept_id,
        manager_id=manager_id,
        hr_id=hr_id,
        job_title=data.get('jobTitle'),
        phone=data.get('phone')
    )
    
    db.session.add(new_user)
    db.session.commit()
    
    return jsonify(new_user.to_dict()), 201


@app.route('/api/users/team', methods=['GET'])
@jwt_required()
def get_team_members():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if current_user.role not in ['manager', 'admin', 'hr']:
        return jsonify({'error': 'Unauthorized'}), 403
    
    if current_user.role == 'admin':
        team = User.query.filter_by(is_active=True).all()
    elif current_user.role == 'hr':
        team = User.query.filter_by(hr_id=current_user.id, is_active=True).all()
    else:
        team = User.query.filter_by(manager_id=current_user.id, is_active=True).all()
    
    return jsonify([u.to_dict() for u in team])


@app.route('/api/users/my-employees', methods=['GET'])
@jwt_required()
def get_my_employees():
    """Get employees who selected current user as their manager"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if current_user.role not in ['manager', 'admin']:
        return jsonify({'error': 'Unauthorized'}), 403
    
    employees = User.query.filter_by(manager_id=current_user.id, is_active=True).all()
    return jsonify([u.to_dict() for u in employees])


@app.route('/api/users/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    """Update current user's profile including manager and HR"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    data = request.json
    
    if 'firstName' in data:
        user.first_name = data['firstName']
    if 'lastName' in data:
        user.last_name = data['lastName']
    if 'jobTitle' in data:
        user.job_title = data['jobTitle']
    if 'phone' in data:
        user.phone = data['phone']
    if 'departmentId' in data:
        dept_id = data['departmentId']
        user.department_id = int(dept_id) if dept_id and dept_id != '' else None
    if 'managerId' in data:
        manager_id = data['managerId']
        user.manager_id = int(manager_id) if manager_id and manager_id != '' else None
    if 'hrId' in data:
        hr_id = data['hrId']
        user.hr_id = int(hr_id) if hr_id and hr_id != '' else None
    
    db.session.commit()
    return jsonify(user.to_dict())


# ============ DEPARTMENT ROUTES ============

@app.route('/api/departments', methods=['GET'])
def get_departments():
    departments = Department.query.all()
    return jsonify([d.to_dict() for d in departments])


@app.route('/api/departments', methods=['POST'])
@jwt_required()
def create_department():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.json
    dept = Department(name=data['name'], description=data.get('description'))
    db.session.add(dept)
    db.session.commit()
    
    return jsonify(dept.to_dict()), 201


# ============ APPRAISAL PERIOD ROUTES ============

@app.route('/api/periods', methods=['GET'])
@jwt_required()
def get_periods():
    periods = AppraisalPeriod.query.order_by(AppraisalPeriod.start_date.desc()).all()
    return jsonify([p.to_dict() for p in periods])


@app.route('/api/periods/active', methods=['GET'])
@jwt_required()
def get_active_period():
    period = AppraisalPeriod.query.filter_by(is_active=True).first()
    if not period:
        return jsonify({'error': 'No active appraisal period'}), 404
    return jsonify(period.to_dict())


@app.route('/api/periods', methods=['POST'])
@jwt_required()
def create_period():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.json
    
    if data.get('isActive'):
        AppraisalPeriod.query.update({'is_active': False})
    
    period = AppraisalPeriod(
        name=data['name'],
        start_date=datetime.strptime(data['startDate'], '%Y-%m-%d').date(),
        end_date=datetime.strptime(data['endDate'], '%Y-%m-%d').date(),
        submission_deadline=datetime.strptime(data['submissionDeadline'], '%Y-%m-%d').date(),
        review_deadline=datetime.strptime(data['reviewDeadline'], '%Y-%m-%d').date(),
        is_active=data.get('isActive', False)
    )
    
    db.session.add(period)
    db.session.commit()
    
    return jsonify(period.to_dict()), 201


# ============ RATING CRITERIA ROUTES ============

@app.route('/api/criteria', methods=['GET'])
@jwt_required()
def get_criteria():
    user_type = request.args.get('userType')
    
    query = RatingCriteria.query.filter_by(is_active=True)
    
    if user_type:
        query = query.filter(
            (RatingCriteria.applies_to == None) | 
            (RatingCriteria.applies_to == user_type)
        )
    
    criteria = query.all()
    return jsonify([c.to_dict() for c in criteria])


# ============ GOAL ROUTES ============

@app.route('/api/goals', methods=['GET'])
@jwt_required()
def get_goals():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    query = Goal.query
    
    if current_user.role == 'employee':
        query = query.filter_by(employee_id=current_user.id)
    elif current_user.role == 'manager':
        query = query.filter_by(manager_id=current_user.id)
    elif current_user.role == 'hr':
        hr_employee_ids = [u.id for u in User.query.filter_by(hr_id=current_user.id).all()]
        query = query.filter(Goal.employee_id.in_(hr_employee_ids))
    
    if request.args.get('status'):
        query = query.filter_by(status=request.args.get('status'))
    if request.args.get('employeeId'):
        query = query.filter_by(employee_id=int(request.args.get('employeeId')))
    
    goals = query.order_by(Goal.created_at.desc()).all()
    return jsonify([g.to_dict() for g in goals])


@app.route('/api/goals/<int:goal_id>', methods=['GET'])
@jwt_required()
def get_goal(goal_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    goal = Goal.query.get_or_404(goal_id)
    
    if current_user.role == 'employee' and goal.employee_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    return jsonify(goal.to_dict(include_comments=True))


@app.route('/api/goals', methods=['POST'])
@jwt_required()
def create_goal():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if current_user.role not in ['manager', 'admin']:
        return jsonify({'error': 'Only managers can create goals'}), 403
    
    data = request.json
    
    employee_id = int(data['employeeId'])
    employee = User.query.get(employee_id)
    
    if not employee:
        return jsonify({'error': 'Employee not found'}), 404
    
    if current_user.role == 'manager' and employee.manager_id != current_user.id:
        return jsonify({'error': 'Employee is not in your team'}), 403
    
    target_date = None
    if data.get('targetDate'):
        target_date = datetime.strptime(data['targetDate'], '%Y-%m-%d').date()
    
    goal = Goal(
        employee_id=employee_id,
        manager_id=current_user.id,
        period_id=data.get('periodId'),
        title=data['title'],
        description=data.get('description'),
        target_date=target_date,
        manager_notes=data.get('managerNotes'),
        status='pending_acceptance'
    )
    
    db.session.add(goal)
    db.session.commit()
    
    return jsonify(goal.to_dict()), 201


@app.route('/api/goals/<int:goal_id>', methods=['PUT'])
@jwt_required()
def update_goal(goal_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    goal = Goal.query.get_or_404(goal_id)
    data = request.json
    
    is_employee = goal.employee_id == current_user.id
    is_manager = goal.manager_id == current_user.id or current_user.role == 'admin'
    
    if not is_employee and not is_manager:
        return jsonify({'error': 'Unauthorized'}), 403
    
    if is_manager:
        if 'title' in data:
            goal.title = data['title']
        if 'description' in data:
            goal.description = data['description']
        if 'targetDate' in data:
            goal.target_date = datetime.strptime(data['targetDate'], '%Y-%m-%d').date() if data['targetDate'] else None
        if 'managerNotes' in data:
            goal.manager_notes = data['managerNotes']
        if 'managerRating' in data:
            goal.manager_rating = data['managerRating']
    
    if is_employee:
        if 'employeeNotes' in data:
            goal.employee_notes = data['employeeNotes']
        if 'progress' in data:
            goal.progress = data['progress']
        if 'selfRating' in data:
            goal.self_rating = data['selfRating']
    
    if goal.self_rating and goal.manager_rating:
        goal.final_rating = round((goal.self_rating + goal.manager_rating) / 2, 2)
    
    goal.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify(goal.to_dict(include_comments=True))


@app.route('/api/goals/<int:goal_id>/accept', methods=['POST'])
@jwt_required()
def accept_goal(goal_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    goal = Goal.query.get_or_404(goal_id)
    
    if goal.employee_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    if goal.status != 'pending_acceptance':
        return jsonify({'error': 'Goal is not pending acceptance'}), 400
    
    goal.status = 'in_progress'
    goal.employee_accepted = True
    db.session.commit()
    
    return jsonify(goal.to_dict())


@app.route('/api/goals/<int:goal_id>/reject', methods=['POST'])
@jwt_required()
def reject_goal(goal_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    goal = Goal.query.get_or_404(goal_id)
    data = request.json
    
    if goal.employee_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    if goal.status != 'pending_acceptance':
        return jsonify({'error': 'Goal is not pending acceptance'}), 400
    
    goal.status = 'rejected'
    goal.rejection_reason = data.get('reason', '')
    goal.employee_notes = data.get('alternativeSuggestion', '')
    db.session.commit()
    
    return jsonify(goal.to_dict())


@app.route('/api/goals/<int:goal_id>/request-modification', methods=['POST'])
@jwt_required()
def request_goal_modification(goal_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    goal = Goal.query.get_or_404(goal_id)
    data = request.json
    
    if goal.employee_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    if goal.status != 'pending_acceptance':
        return jsonify({'error': 'Goal is not pending acceptance'}), 400
    
    goal.status = 'modification_requested'
    goal.modification_request = data.get('request', '')
    db.session.commit()
    
    return jsonify(goal.to_dict())


@app.route('/api/goals/<int:goal_id>/approve-modification', methods=['POST'])
@jwt_required()
def approve_goal_modification(goal_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    goal = Goal.query.get_or_404(goal_id)
    data = request.json
    
    if goal.manager_id != current_user.id and current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    if goal.status != 'modification_requested':
        return jsonify({'error': 'Goal does not have a pending modification request'}), 400
    
    if 'title' in data:
        goal.title = data['title']
    if 'description' in data:
        goal.description = data['description']
    if 'targetDate' in data:
        goal.target_date = datetime.strptime(data['targetDate'], '%Y-%m-%d').date() if data['targetDate'] else None
    
    goal.status = 'pending_acceptance'
    goal.modification_request = None
    db.session.commit()
    
    return jsonify(goal.to_dict())


@app.route('/api/goals/<int:goal_id>/complete', methods=['POST'])
@jwt_required()
def complete_goal(goal_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    goal = Goal.query.get_or_404(goal_id)
    
    is_manager = goal.manager_id == current_user.id or current_user.role == 'admin'
    
    if not is_manager:
        return jsonify({'error': 'Only manager can mark goal as completed'}), 403
    
    if goal.status != 'in_progress':
        return jsonify({'error': 'Goal is not in progress'}), 400
    
    goal.status = 'completed'
    goal.progress = 100
    db.session.commit()
    
    return jsonify(goal.to_dict())


@app.route('/api/goals/<int:goal_id>/comments', methods=['GET'])
@jwt_required()
def get_goal_comments(goal_id):
    Goal.query.get_or_404(goal_id)
    comments = GoalComment.query.filter_by(goal_id=goal_id).order_by(GoalComment.created_at.desc()).all()
    return jsonify([c.to_dict() for c in comments])


@app.route('/api/goals/<int:goal_id>/comments', methods=['POST'])
@jwt_required()
def add_goal_comment(goal_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    goal = Goal.query.get_or_404(goal_id)
    data = request.json
    
    is_employee = goal.employee_id == current_user.id
    is_manager = goal.manager_id == current_user.id or current_user.role == 'admin'
    
    if not is_employee and not is_manager:
        return jsonify({'error': 'Unauthorized'}), 403
    
    comment = GoalComment(
        goal_id=goal_id,
        user_id=current_user.id,
        comment=data['comment'],
        progress_update=data.get('progressUpdate')
    )
    
    if data.get('progressUpdate') is not None and is_employee:
        goal.progress = data['progressUpdate']
    
    db.session.add(comment)
    db.session.commit()
    
    return jsonify(comment.to_dict()), 201


@app.route('/api/goals/<int:goal_id>', methods=['DELETE'])
@jwt_required()
def delete_goal(goal_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    goal = Goal.query.get_or_404(goal_id)
    
    if goal.manager_id != current_user.id and current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    db.session.delete(goal)
    db.session.commit()
    
    return jsonify({'message': 'Goal deleted successfully'})


@app.route('/api/goals/team-summary', methods=['GET'])
@jwt_required()
def get_team_goals_summary():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if current_user.role not in ['manager', 'admin', 'hr']:
        return jsonify({'error': 'Unauthorized'}), 403
    
    if current_user.role == 'admin':
        team = User.query.filter_by(is_active=True, role='employee').all()
    elif current_user.role == 'hr':
        team = User.query.filter_by(hr_id=current_user.id, is_active=True).all()
    else:
        team = User.query.filter_by(manager_id=current_user.id, is_active=True).all()
    
    summary = []
    for member in team:
        goals = Goal.query.filter_by(employee_id=member.id).all()
        summary.append({
            'employeeId': member.id,
            'employeeName': member.first_name + ' ' + member.last_name,
            'totalGoals': len(goals),
            'pendingAcceptance': len([g for g in goals if g.status == 'pending_acceptance']),
            'inProgress': len([g for g in goals if g.status == 'in_progress']),
            'completed': len([g for g in goals if g.status == 'completed']),
            'rejected': len([g for g in goals if g.status == 'rejected']),
            'modificationRequested': len([g for g in goals if g.status == 'modification_requested']),
            'averageProgress': round(sum(g.progress for g in goals) / len(goals), 1) if goals else 0
        })
    
    return jsonify(summary)


# ============ APPRAISAL ROUTES ============

@app.route('/api/appraisals', methods=['GET'])
@jwt_required()
def get_appraisals():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    query = Appraisal.query
    
    if current_user.role == 'employee':
        query = query.filter_by(employee_id=current_user.id)
    elif current_user.role == 'manager':
        team_ids = [u.id for u in current_user.subordinates]
        query = query.filter(
            (Appraisal.employee_id.in_(team_ids)) | 
            (Appraisal.employee_id == current_user.id)
        )
    
    if request.args.get('status'):
        query = query.filter_by(status=request.args.get('status'))
    if request.args.get('periodId'):
        query = query.filter_by(period_id=request.args.get('periodId'))
    
    appraisals = query.order_by(Appraisal.created_at.desc()).all()
    return jsonify([a.to_dict() for a in appraisals])


@app.route('/api/appraisals/<int:appraisal_id>', methods=['GET'])
@jwt_required()
def get_appraisal(appraisal_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    appraisal = Appraisal.query.get_or_404(appraisal_id)
    
    if current_user.role == 'employee' and appraisal.employee_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    if current_user.role == 'manager':
        team_ids = [u.id for u in current_user.subordinates] + [current_user.id]
        if appraisal.employee_id not in team_ids:
            return jsonify({'error': 'Unauthorized'}), 403
    
    return jsonify(appraisal.to_dict(include_ratings=True))


@app.route('/api/appraisals', methods=['POST'])
@jwt_required()
def create_appraisal():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    period = AppraisalPeriod.query.filter_by(is_active=True).first()
    if not period:
        return jsonify({'error': 'No active appraisal period'}), 400
    
    existing = Appraisal.query.filter_by(
        employee_id=current_user.id,
        period_id=period.id
    ).first()
    
    if existing:
        return jsonify({'error': 'Appraisal already exists for this period', 'appraisalId': existing.id}), 400
    
    appraisal = Appraisal(
        employee_id=current_user.id,
        reviewer_id=current_user.manager_id,
        period_id=period.id,
        status='draft'
    )
    
    db.session.add(appraisal)
    db.session.commit()
    
    return jsonify(appraisal.to_dict()), 201


@app.route('/api/appraisals/<int:appraisal_id>', methods=['PUT'])
@jwt_required()
def update_appraisal(appraisal_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    appraisal = Appraisal.query.get_or_404(appraisal_id)
    data = request.json
    
    is_owner = appraisal.employee_id == current_user.id
    is_reviewer = appraisal.reviewer_id == current_user.id or current_user.role == 'admin'
    
    if not is_owner and not is_reviewer:
        return jsonify({'error': 'Unauthorized'}), 403
    
    if is_owner and not is_reviewer:
        if appraisal.status not in ['draft', 'revision_requested']:
            return jsonify({'error': 'Cannot edit submitted appraisal'}), 400
    
    if is_owner:
        if 'employeeComments' in data:
            appraisal.employee_comments = data['employeeComments']
        if 'goalsAchieved' in data:
            appraisal.goals_achieved = data['goalsAchieved']
        if 'areasOfImprovement' in data:
            appraisal.areas_of_improvement = data['areasOfImprovement']
        if 'trainingNeeds' in data:
            appraisal.training_needs = data['trainingNeeds']
    
    if is_reviewer:
        if 'managerComments' in data:
            appraisal.manager_comments = data['managerComments']
    
    db.session.commit()
    return jsonify(appraisal.to_dict(include_ratings=True))


@app.route('/api/appraisals/<int:appraisal_id>/ratings', methods=['POST'])
@jwt_required()
def save_ratings(appraisal_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    appraisal = Appraisal.query.get_or_404(appraisal_id)
    data = request.json
    
    is_owner = appraisal.employee_id == current_user.id
    is_reviewer = appraisal.reviewer_id == current_user.id or current_user.role == 'admin'
    
    if not is_owner and not is_reviewer:
        return jsonify({'error': 'Unauthorized'}), 403
    
    ratings_data = data.get('ratings', [])
    
    for rating_data in ratings_data:
        rating = AppraisalRating.query.filter_by(
            appraisal_id=appraisal_id,
            criteria_id=rating_data['criteriaId']
        ).first()
        
        if not rating:
            rating = AppraisalRating(
                appraisal_id=appraisal_id,
                criteria_id=rating_data['criteriaId']
            )
            db.session.add(rating)
        
        if is_owner:
            if 'selfScore' in rating_data:
                rating.self_score = rating_data['selfScore']
            if 'selfComment' in rating_data:
                rating.self_comment = rating_data['selfComment']
        
        if is_reviewer:
            if 'managerScore' in rating_data:
                rating.manager_score = rating_data['managerScore']
            if 'managerComment' in rating_data:
                rating.manager_comment = rating_data['managerComment']
    
    db.session.flush()
    all_ratings = AppraisalRating.query.filter_by(appraisal_id=appraisal_id).all()
    
    if is_owner:
        appraisal.self_rating = calculate_average_rating(all_ratings, 'self')
    if is_reviewer:
        appraisal.manager_rating = calculate_average_rating(all_ratings, 'manager')
        if appraisal.self_rating and appraisal.manager_rating:
            appraisal.final_rating = round((float(appraisal.self_rating) + float(appraisal.manager_rating)) / 2, 2)
    
    db.session.commit()
    return jsonify(appraisal.to_dict(include_ratings=True))


@app.route('/api/appraisals/<int:appraisal_id>/submit', methods=['POST'])
@jwt_required()
def submit_appraisal(appraisal_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    appraisal = Appraisal.query.get_or_404(appraisal_id)
    
    if appraisal.employee_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    if appraisal.status not in ['draft', 'revision_requested']:
        return jsonify({'error': 'Cannot submit appraisal in current status'}), 400
    
    ratings_count = AppraisalRating.query.filter(
        AppraisalRating.appraisal_id == appraisal_id,
        AppraisalRating.self_score != None
    ).count()
    
    if ratings_count == 0:
        return jsonify({'error': 'Please complete at least one self-rating before submitting'}), 400
    
    appraisal.status = 'submitted'
    appraisal.submitted_at = datetime.utcnow()
    
    db.session.commit()
    return jsonify(appraisal.to_dict())


@app.route('/api/appraisals/<int:appraisal_id>/review', methods=['POST'])
@jwt_required()
def review_appraisal(appraisal_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    appraisal = Appraisal.query.get_or_404(appraisal_id)
    data = request.json
    
    if appraisal.reviewer_id != current_user.id and current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    if appraisal.status not in ['submitted', 'under_review']:
        return jsonify({'error': 'Cannot review appraisal in current status'}), 400
    
    action = data.get('action')
    
    if action == 'approve':
        appraisal.status = 'approved'
        appraisal.reviewed_at = datetime.utcnow()
    elif action == 'reject':
        appraisal.status = 'rejected'
        appraisal.reviewed_at = datetime.utcnow()
    elif action == 'request_revision':
        appraisal.status = 'revision_requested'
    elif action == 'start_review':
        appraisal.status = 'under_review'
    else:
        return jsonify({'error': 'Invalid action'}), 400
    
    if data.get('comment'):
        comment = AppraisalComment(
            appraisal_id=appraisal_id,
            user_id=current_user.id,
            comment=data['comment']
        )
        db.session.add(comment)
    
    db.session.commit()
    return jsonify(appraisal.to_dict(include_ratings=True))


@app.route('/api/appraisals/<int:appraisal_id>/comments', methods=['POST'])
@jwt_required()
def add_comment(appraisal_id):
    current_user_id = get_jwt_identity()
    Appraisal.query.get_or_404(appraisal_id)
    data = request.json
    
    comment = AppraisalComment(
        appraisal_id=appraisal_id,
        user_id=current_user_id,
        comment=data['comment']
    )
    
    db.session.add(comment)
    db.session.commit()
    
    return jsonify(comment.to_dict()), 201


# ============ DASHBOARD / STATS ROUTES ============

@app.route('/api/dashboard/stats', methods=['GET'])
@jwt_required()
def get_dashboard_stats():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    stats = {}
    active_period = AppraisalPeriod.query.filter_by(is_active=True).first()
    
    if current_user.role == 'employee':
        my_appraisals = Appraisal.query.filter_by(employee_id=current_user.id).all()
        my_goals = Goal.query.filter_by(employee_id=current_user.id).all()
        
        stats = {
            'totalAppraisals': len(my_appraisals),
            'pendingAppraisals': len([a for a in my_appraisals if a.status in ['draft', 'revision_requested']]),
            'approvedAppraisals': len([a for a in my_appraisals if a.status == 'approved']),
            'totalGoals': len(my_goals),
            'pendingGoals': len([g for g in my_goals if g.status == 'pending_acceptance']),
            'inProgressGoals': len([g for g in my_goals if g.status == 'in_progress']),
            'completedGoals': len([g for g in my_goals if g.status == 'completed']),
            'averageRating': None,
            'currentPeriod': active_period.to_dict() if active_period else None,
            'hasManager': current_user.manager_id is not None,
            'hasHR': current_user.hr_id is not None
        }
        
        approved = [a for a in my_appraisals if a.final_rating]
        if approved:
            stats['averageRating'] = round(sum(float(a.final_rating) for a in approved) / len(approved), 2)
    
    elif current_user.role == 'manager':
        team = User.query.filter_by(manager_id=current_user.id, is_active=True).all()
        team_ids = [u.id for u in team]
        team_appraisals = Appraisal.query.filter(Appraisal.employee_id.in_(team_ids)).all() if team_ids else []
        team_goals = Goal.query.filter_by(manager_id=current_user.id).all()
        
        stats = {
            'teamSize': len(team),
            'pendingReviews': len([a for a in team_appraisals if a.status == 'submitted']),
            'completedReviews': len([a for a in team_appraisals if a.status == 'approved']),
            'totalGoals': len(team_goals),
            'pendingGoalAcceptance': len([g for g in team_goals if g.status == 'pending_acceptance']),
            'modificationRequested': len([g for g in team_goals if g.status == 'modification_requested']),
            'inProgressGoals': len([g for g in team_goals if g.status == 'in_progress']),
            'teamAverageRating': None,
            'currentPeriod': active_period.to_dict() if active_period else None
        }
        
        rated = [a for a in team_appraisals if a.final_rating]
        if rated:
            stats['teamAverageRating'] = round(sum(float(a.final_rating) for a in rated) / len(rated), 2)
    
    else:  # Admin or HR
        all_users = User.query.filter_by(is_active=True).count()
        all_appraisals = Appraisal.query.all()
        all_goals = Goal.query.all()
        
        stats = {
            'totalEmployees': all_users,
            'officeEmployees': User.query.filter_by(user_type='office', is_active=True).count(),
            'fieldEmployees': User.query.filter_by(user_type='field', is_active=True).count(),
            'totalAppraisals': len(all_appraisals),
            'pendingReviews': len([a for a in all_appraisals if a.status == 'submitted']),
            'completedAppraisals': len([a for a in all_appraisals if a.status == 'approved']),
            'totalGoals': len(all_goals),
            'pendingGoals': len([g for g in all_goals if g.status == 'pending_acceptance']),
            'inProgressGoals': len([g for g in all_goals if g.status == 'in_progress']),
            'currentPeriod': active_period.to_dict() if active_period else None
        }
    
    return jsonify(stats)
# ============ ADMIN DELETE ROUTES ============

@app.route('/api/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    """Delete a user (admin only)"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized - Admin only'}), 403
    
    user = User.query.get_or_404(user_id)
    
    # Prevent admin from deleting themselves
    if user.id == current_user.id:
        return jsonify({'error': 'Cannot delete your own account'}), 400
    
    # Delete related data first
    Goal.query.filter_by(employee_id=user_id).delete()
    Goal.query.filter_by(manager_id=user_id).delete()
    Appraisal.query.filter_by(employee_id=user_id).delete()
    Appraisal.query.filter_by(reviewer_id=user_id).delete()
    
    # Remove manager/hr references from other users
    User.query.filter_by(manager_id=user_id).update({'manager_id': None})
    User.query.filter_by(hr_id=user_id).update({'hr_id': None})
    
    db.session.delete(user)
    db.session.commit()
    
    return jsonify({'message': 'User deleted successfully'})


@app.route('/api/appraisals/<int:appraisal_id>', methods=['DELETE'])
@jwt_required()
def delete_appraisal(appraisal_id):
    """Delete an appraisal (admin only)"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized - Admin only'}), 403
    
    appraisal = Appraisal.query.get_or_404(appraisal_id)
    
    # Delete related ratings and comments (cascade should handle this, but being explicit)
    AppraisalRating.query.filter_by(appraisal_id=appraisal_id).delete()
    AppraisalComment.query.filter_by(appraisal_id=appraisal_id).delete()
    
    db.session.delete(appraisal)
    db.session.commit()
    
    return jsonify({'message': 'Appraisal deleted successfully'})


@app.route('/api/departments/<int:dept_id>', methods=['DELETE'])
@jwt_required()
def delete_department(dept_id):
    """Delete a department (admin only)"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized - Admin only'}), 403
    
    dept = Department.query.get_or_404(dept_id)
    
    # Remove department reference from users
    User.query.filter_by(department_id=dept_id).update({'department_id': None})
    
    db.session.delete(dept)
    db.session.commit()
    
    return jsonify({'message': 'Department deleted successfully'})


@app.route('/api/periods/<int:period_id>', methods=['DELETE'])
@jwt_required()
def delete_period(period_id):
    """Delete an appraisal period (admin only)"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized - Admin only'}), 403
    
    period = AppraisalPeriod.query.get_or_404(period_id)
    
    # Check if there are appraisals linked to this period
    appraisal_count = Appraisal.query.filter_by(period_id=period_id).count()
    if appraisal_count > 0:
        return jsonify({'error': 'Cannot delete period with existing appraisals. Delete appraisals first.'}), 400
    
    db.session.delete(period)
    db.session.commit()
    
    return jsonify({'message': 'Appraisal period deleted successfully'})

# ============ ERROR HANDLERS ============

@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Resource not found'}), 404


@app.errorhandler(500)
def server_error(e):
    return jsonify({'error': 'Internal server error'}), 500


# ============ MAIN ============

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5000)
