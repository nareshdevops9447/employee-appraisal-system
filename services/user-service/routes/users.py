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


@users_bp.route('/sync', methods=['POST'])
def sync_user():
    """Sync user from Auth Service (called on login)."""
    data = request.get_json() or {}
    auth_user_id = data.get('auth_user_id')
    email = data.get('email')
    azure_oid = data.get('azure_oid')
    manager_oid = data.get('manager_oid') # The OID of the manager from Azure AD
    
    if not auth_user_id or not email:
        return jsonify({'error': 'Missing required fields'}), 400

    # 1. Provide upsert logic for the user
    user = UserProfile.query.get(auth_user_id)
    if not user:
        # Check by email as fallback
        user = UserProfile.query.filter_by(email=email).first()
        
    if not user:
        # Create new skeleton user profile if not exists
        # Name might be in data 'display_name' or split
        display_name = data.get('display_name', '')
        parts = display_name.split(' ', 1)
        first_name = parts[0] if parts else 'Unknown'
        last_name = parts[1] if len(parts) > 1 else 'User'
        
        user = UserProfile(
            id=auth_user_id,
            email=email,
            first_name=first_name,
            last_name=last_name,
            azure_oid=azure_oid,
            is_active=True
        )
        db.session.add(user)
    else:
        # Update existing user
        if azure_oid:
            user.azure_oid = azure_oid
            
    # 2. Handle Manager Sync
    if manager_oid:
        # Find the manager by their Azure OID
        manager = UserProfile.query.filter_by(azure_oid=manager_oid).first()
        if manager:
            user.manager_id = manager.id
        else:
            # Manager not found yet, maybe they haven't logged in. 
            # We can't link them yet. But if we have manager_oid, 
            # we might want to store it temporarily if we had a field for it, 
            # but for now we just skip.
            pass

    try:
        db.session.commit()
        return jsonify(user.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
