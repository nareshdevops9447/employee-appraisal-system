"""
User profile routes — CRUD for user profiles and user sync.
Migrated from user-service/routes/users.py.

Key change: Uses unified @require_auth decorator (JWT-based) instead of
X-User-Id/X-User-Role headers from the gateway.
"""
from flask import Blueprint, request, jsonify, g

from sqlalchemy.orm.attributes import flag_modified

from extensions import db
from models.user_profile import UserProfile, DEFAULT_PREFERENCES
from models.department import Department
from utils.decorators import require_auth, require_role

users_bp = Blueprint('users', __name__)


# ─── GET /api/users ─────────────────────────────────────────────────

@users_bp.route('/', methods=['GET'])
@require_auth
def list_users():
    """List users with filtering, pagination, and search."""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search = request.args.get('search', '').strip()
    department_id = request.args.get('department_id')
    employment_type = request.args.get('employment_type')
    is_active_param = request.args.get('is_active')

    query = UserProfile.query

    # Filters
    if is_active_param is not None:
        is_active = is_active_param.lower() in ('true', '1', 'yes')
        query = query.filter(UserProfile.is_active == is_active)

    if department_id:
        query = query.filter(UserProfile.department_id == department_id)

    if employment_type:
        query = query.filter(UserProfile.employment_type == employment_type)

    if search:
        search_term = f'%{search}%'
        query = query.filter(
            db.or_(
                UserProfile.first_name.ilike(search_term),
                UserProfile.last_name.ilike(search_term),
                UserProfile.email.ilike(search_term),
            )
        )

    query = query.order_by(UserProfile.first_name)
    paginated = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'users': [u.to_dict() for u in paginated.items],
        'total': paginated.total,
        'page': paginated.page,
        'per_page': paginated.per_page,
        'pages': paginated.pages,
    })


# ─── GET /api/users/team ────────────────────────────────────────────
# All static/literal routes (/team, /sync, /me, /me/*) MUST be registered
# BEFORE /<id> so Flask doesn't capture them as an id parameter.

@users_bp.route('/team', methods=['GET'])
@require_auth
def get_my_team():
    """Get direct reports for the current authenticated user."""
    ctx = g.current_user
    search = request.args.get('search', '').strip()
    department_id = request.args.get('department_id')
    scope = request.args.get('scope', 'mine')

    if scope == 'all':
        query = UserProfile.query.filter_by(is_active=True)
    else:
        query = UserProfile.query.filter_by(manager_id=ctx['user_id'], is_active=True)

    if search:
        search_term = f'%{search}%'
        query = query.filter(
            db.or_(
                UserProfile.first_name.ilike(search_term),
                UserProfile.last_name.ilike(search_term),
                UserProfile.email.ilike(search_term),
            )
        )

    if department_id:
        query = query.filter(UserProfile.department_id == department_id)

    query = query.order_by(UserProfile.first_name)
    reports = query.all()
    return jsonify([r.to_dict() for r in reports])


# ─── POST /api/users/sync ──────────────────────────────────────────

@users_bp.route('/sync', methods=['POST'])
def sync_user():
    """Sync user profile from auth data. Internal endpoint.

    This is called from the auth flow to create/update user profiles.
    Kept for backward compatibility with the frontend.
    """
    data = request.get_json()
    if not data or not data.get('id'):
        return jsonify({'error': 'id is required'}), 400

    user_id = data['id']
    profile = UserProfile.query.filter_by(id=user_id).first()

    if not profile:
        profile = UserProfile(
            id=user_id,
            email=data.get('email', ''),
            first_name=data.get('first_name', ''),
            last_name=data.get('last_name', ''),
        )
        db.session.add(profile)

    # Update profile fields
    for field in ('email', 'first_name', 'last_name', 'job_title', 'azure_oid', 'avatar_url'):
        if field in data and data[field]:
            setattr(profile, field, data[field])

    if data.get('department'):
        dept_name = data['department']
        dept = Department.query.filter_by(name=dept_name).first()
        if not dept:
            dept = Department(name=dept_name)
            db.session.add(dept)
            db.session.flush()
        profile.department_id = dept.id

    if data.get('role') == 'hr_admin':
        profile.employment_type = 'full_time'

    if data.get('manager_azure_oid'):
        mgr = UserProfile.query.filter_by(azure_oid=data['manager_azure_oid']).first()
        if mgr:
            profile.manager_id = mgr.id

    db.session.commit()
    return jsonify(profile.to_dict())


# ─── GET /api/users/me ────────────────────────────────────────────

@users_bp.route('/me', methods=['GET'])
@require_auth
def get_my_profile():
    """Get the current user's own profile."""
    ctx = g.current_user
    profile = UserProfile.query.get(ctx['user_id'])
    if not profile:
        return jsonify({'error': 'Profile not found'}), 404
    return jsonify(profile.to_dict())


# ─── POST /api/users/me/tour ────────────────────────────────────────

@users_bp.route('/me/tour', methods=['POST'])
@require_auth
def mark_tour_complete():
    """Mark the product tour as completed for the current user."""
    ctx = g.current_user
    profile = UserProfile.query.get(ctx['user_id'])
    if not profile:
        return jsonify({'error': 'Profile not found'}), 404

    profile.has_completed_tour = True
    db.session.commit()

    return jsonify({'message': 'Tour marked as complete', 'has_completed_tour': True})


# ─── GET /api/users/me/preferences ────────────────────────────────

@users_bp.route('/me/preferences', methods=['GET'])
@require_auth
def get_my_preferences():
    """Return the current user's preferences (merged with defaults)."""
    ctx = g.current_user
    profile = UserProfile.query.get(ctx['user_id'])
    if not profile:
        return jsonify({'error': 'Profile not found'}), 404

    return jsonify(profile.get_preferences())


# ─── PUT /api/users/me/preferences ────────────────────────────────

ALLOWED_PREF_KEYS = set(DEFAULT_PREFERENCES.keys())


@users_bp.route('/me/preferences', methods=['PUT'])
@require_auth
def update_my_preferences():
    """Update the current user's preferences.

    Accepts a JSON object with one or more preference keys.
    Only known boolean keys are accepted; unknown keys are ignored.
    """
    ctx = g.current_user
    profile = UserProfile.query.get(ctx['user_id'])
    if not profile:
        return jsonify({'error': 'Profile not found'}), 404

    data = request.get_json()
    if not data or not isinstance(data, dict):
        return jsonify({'error': 'JSON object required'}), 400

    # Merge: start from current stored prefs, overlay valid incoming keys
    current = profile.preferences or {}
    for key, value in data.items():
        if key in ALLOWED_PREF_KEYS and isinstance(value, bool):
            current[key] = value

    profile.preferences = current
    # IMPORTANT: flag_modified so SQLAlchemy detects in-place JSON mutation
    flag_modified(profile, 'preferences')
    db.session.commit()

    return jsonify(profile.get_preferences())


# ─── GET /api/users/<id> ────────────────────────────────────────────
# Dynamic routes MUST come after all static routes above.

@users_bp.route('/<id>', methods=['GET'])
@require_auth
def get_user(id):
    """Get a single user profile."""
    user = UserProfile.query.get_or_404(id)
    return jsonify(user.to_dict())


# ─── PUT /api/users/<id> ────────────────────────────────────────────

@users_bp.route('/<id>', methods=['PUT'])
@require_auth
def update_user(id):
    """Update a user profile. User can update self; HR can update anyone."""
    user = UserProfile.query.get_or_404(id)
    ctx = g.current_user

    # Only self or HR can update
    if ctx['user_id'] != id and ctx['role'] not in ('hr_admin', 'super_admin'):
        return jsonify({'error': 'Forbidden'}), 403

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    # Update allowed fields
    for field in ('first_name', 'last_name', 'job_title', 'phone', 'employment_type', 'avatar_url'):
        if field in data:
            setattr(user, field, data[field])

    if 'department_id' in data:
        user.department_id = data['department_id']

    if 'manager_id' in data:
        user.manager_id = data['manager_id']

    if 'start_date' in data and data['start_date']:
        from datetime import date, datetime
        val = data['start_date']
        if 'T' in val:
            user.start_date = datetime.fromisoformat(val.replace('Z', '+00:00')).date()
        else:
            user.start_date = date.fromisoformat(val)

    # HR-only fields
    if ctx['role'] in ('hr_admin', 'super_admin'):
        if 'is_active' in data:
            user.is_active = data['is_active']

    db.session.commit()
    return jsonify(user.to_dict())


# ─── GET /api/users/<id>/team ────────────────────────────────────────

@users_bp.route('/<id>/team', methods=['GET'])
@require_auth
def get_team(id):
    """Get all direct reports for a manager."""
    reports = UserProfile.query.filter_by(manager_id=id, is_active=True).all()
    return jsonify([r.to_dict() for r in reports])
