from flask import Blueprint, jsonify, request
from sqlalchemy import or_
from extensions import db
from models.user_profile import UserProfile
from models.department import Department

users_bp = Blueprint('users', __name__, url_prefix='/api/users')

@users_bp.route('', methods=['GET'])
def list_users():
    """List users with pagination, filtering, and search."""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search_query = request.args.get('search', '').strip()
    department_id = request.args.get('department_id')
    is_active_str = request.args.get('is_active')

    query = UserProfile.query

    if search_query:
        search_filter = or_(
            UserProfile.email.ilike(f'%{search_query}%'),
            UserProfile.first_name.ilike(f'%{search_query}%'),
            UserProfile.last_name.ilike(f'%{search_query}%')
        )
        query = query.filter(search_filter)

    if department_id:
        query = query.filter_by(department_id=department_id)

    if is_active_str is not None:
        is_active = is_active_str.lower() == 'true'
        query = query.filter_by(is_active=is_active)
        
    employment_type = request.args.get('employment_type')
    if employment_type:
        query = query.filter_by(employment_type=employment_type)

    query = query.order_by(UserProfile.last_name.asc(), UserProfile.first_name.asc())

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'users': [u.to_dict() for u in pagination.items],
        'meta': {
            'page': page,
            'per_page': per_page,
            'total': pagination.total,
            'pages': pagination.pages
        }
    })

@users_bp.route('/<string:user_id>', methods=['GET'])
def get_user(user_id):
    """Get a specific user profile."""
    if user_id == 'me':
        current_user_id = request.headers.get('X-User-Id')
        if not current_user_id:
            return jsonify({'error': 'Unauthorized'}), 401
        user_id = current_user_id

    user = UserProfile.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    return jsonify(user.to_dict())

@users_bp.route('', methods=['POST'])
def create_user():
    """Create a new user profile (HR Admin only)."""
    user_role = request.headers.get('X-User-Role', '')
    # TODO: Enforce RBAC

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No input data provided'}), 400

    required_fields = ['id', 'email', 'first_name', 'last_name']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400

    if UserProfile.query.get(data['id']):
        return jsonify({'error': 'User ID already exists'}), 409
    if UserProfile.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already exists'}), 409

    new_user = UserProfile(
        id=data['id'],
        email=data['email'],
        first_name=data['first_name'],
        last_name=data['last_name'],
        job_title=data.get('job_title'),
        department_id=data.get('department_id'),
        manager_id=data.get('manager_id'),
        employment_type=data.get('employment_type', 'full_time'),
        start_date=data.get('start_date'),
        avatar_url=data.get('avatar_url'),
        phone=data.get('phone'),
        is_active=data.get('is_active', True)
    )

    db.session.add(new_user)
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

    return jsonify(new_user.to_dict()), 201

@users_bp.route('/<string:user_id>/direct-reports', methods=['GET'])
def get_direct_reports(user_id):
    """Get direct reports for a user."""
    if user_id == 'me':
        user_id = request.headers.get('X-User-Id')

    user = UserProfile.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    reports = user.direct_reports
    return jsonify([u.to_dict() for u in reports])

@users_bp.route('/<string:user_id>/manager-chain', methods=['GET'])
def get_manager_chain(user_id):
    """Get the management chain up to the top."""
    if user_id == 'me':
        user_id = request.headers.get('X-User-Id')

    user = UserProfile.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    chain = []
    current = user.manager
    while current:
        chain.append(current.to_dict())
        current = current.manager
    
    return jsonify(chain)
