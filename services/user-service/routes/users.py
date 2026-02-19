import logging
from datetime import date
from flask import Blueprint, jsonify, request
from sqlalchemy import or_
from extensions import db
from models.user_profile import UserProfile
from models.department import Department
from utils.rbac import require_auth, require_role

logger = logging.getLogger(__name__)

users_bp = Blueprint('users', __name__, url_prefix='/api/users')


# ═══════════════════════════════════════════════════════════════════
# POST /api/users/sync — Internal: Auth Service → User Service sync
# ═══════════════════════════════════════════════════════════════════

@users_bp.route('/sync', methods=['POST'])
def sync_user():
    """
    Upsert a user profile from auth-service SSO login.
    Called internally by auth-service after Azure AD callback.

    Expects JSON:
    {
        "auth_user_id": "uuid",
        "email": "user@org.com",
        "display_name": "First Last",
        "role": "employee",
        "azure_oid": "azure-oid",
        "department": "Finance",
        "manager_oid": "manager-azure-oid",
        "manager_email": "manager@org.com",
        "manager_name": "Manager Name",
        "direct_reports": [
            {"azure_oid": "...", "email": "...", "display_name": "...", "department": "...", "job_title": "..."}
        ]
    }
    """
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    auth_user_id = data.get('auth_user_id')
    email = (data.get('email') or '').lower().strip()

    if not auth_user_id or not email:
        return jsonify({'error': 'auth_user_id and email are required'}), 400

    try:
        # ── 1. Parse display name ──
        display_name = data.get('display_name', '')
        name_parts = display_name.strip().split(' ', 1) if display_name else ['', '']
        first_name = name_parts[0] or email.split('@')[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ''

        # ── 2. Resolve department ──
        department_id = None
        dept_name = data.get('department')
        if dept_name:
            dept = Department.query.filter(
                Department.name.ilike(dept_name)
            ).first()
            if dept:
                department_id = dept.id
            else:
                # Auto-create department
                dept = Department(name=dept_name)
                db.session.add(dept)
                db.session.flush()
                department_id = dept.id
                logger.info(f"Auto-created department: {dept_name}")

        # ── 3. Resolve manager ──
        manager_id = None
        manager_oid = data.get('manager_oid')
        manager_email = (data.get('manager_email') or '').lower().strip()

        if manager_oid or manager_email:
            # Look up manager by azure_oid first, then email
            # Note: UserProfile doesn't store azure_oid, so we look up by email
            # Auth service stores azure_oid; user-service uses auth_user_id as PK
            manager_profile = None
            if manager_email:
                manager_profile = UserProfile.query.filter_by(email=manager_email).first()

            if manager_profile:
                manager_id = manager_profile.id
            else:
                # Manager hasn't logged in yet — create a stub profile
                manager_name = data.get('manager_name', '')
                mgr_parts = manager_name.strip().split(' ', 1) if manager_name else ['', '']
                mgr_first = mgr_parts[0] or manager_email.split('@')[0] if manager_email else 'Unknown'
                mgr_last = mgr_parts[1] if len(mgr_parts) > 1 else ''

                if manager_email:
                    import uuid
                    manager_profile = UserProfile(
                        id=str(uuid.uuid4()),  # Temp ID; will be updated when manager logs in
                        email=manager_email,
                        first_name=mgr_first,
                        last_name=mgr_last,
                        is_active=True,
                        start_date=date.today(),
                    )
                    db.session.add(manager_profile)
                    db.session.flush()
                    manager_id = manager_profile.id
                    logger.info(f"Created stub manager profile for: {manager_email}")

        # ── 4. Upsert user profile ──
        user = UserProfile.query.get(auth_user_id)

        if not user:
            # Also check by email (user might exist with a temp ID from stub creation)
            user = UserProfile.query.filter_by(email=email).first()

        if user:
            # Update existing profile
            if user.id != auth_user_id:
                # User existed as a stub with temp ID — update the ID to match auth
                old_id = user.id
                # Update any references pointing to old ID
                UserProfile.query.filter_by(manager_id=old_id).update(
                    {'manager_id': auth_user_id}
                )
                # Delete old and recreate with correct ID
                db.session.delete(user)
                db.session.flush()
                user = UserProfile(
                    id=auth_user_id,
                    email=email,
                    first_name=first_name or user.first_name,
                    last_name=last_name or user.last_name,
                    job_title=user.job_title,
                    department_id=department_id or user.department_id,
                    manager_id=manager_id or user.manager_id,
                    employment_type=user.employment_type,
                    start_date=user.start_date or date.today(),
                    is_active=True,
                )
                db.session.add(user)
                logger.info(f"Replaced stub profile {old_id} with auth ID {auth_user_id}")
            else:
                # Normal update
                if first_name:
                    user.first_name = first_name
                if last_name:
                    user.last_name = last_name
                if department_id:
                    user.department_id = department_id
                if manager_id:
                    user.manager_id = manager_id
                user.is_active = True
        else:
            # Create new profile
            user = UserProfile(
                id=auth_user_id,
                email=email,
                first_name=first_name,
                last_name=last_name,
                department_id=department_id,
                manager_id=manager_id,
                employment_type='full_time',
                start_date=date.today(),
                is_active=True,
            )
            db.session.add(user)
            logger.info(f"Created new user profile: {email}")

        # ── 5. Process direct reports (create stubs if needed) ──
        direct_reports = data.get('direct_reports') or []
        for report in direct_reports:
            report_email = (report.get('email') or '').lower().strip()
            if not report_email:
                continue

            report_profile = UserProfile.query.filter_by(email=report_email).first()
            if report_profile:
                # Update manager_id to point to this user
                if report_profile.manager_id != auth_user_id:
                    report_profile.manager_id = auth_user_id
            else:
                # Create stub for the direct report
                import uuid
                rpt_name = report.get('display_name', '')
                rpt_parts = rpt_name.strip().split(' ', 1) if rpt_name else ['', '']
                rpt_first = rpt_parts[0] or report_email.split('@')[0]
                rpt_last = rpt_parts[1] if len(rpt_parts) > 1 else ''

                report_profile = UserProfile(
                    id=str(uuid.uuid4()),
                    email=report_email,
                    first_name=rpt_first,
                    last_name=rpt_last,
                    job_title=report.get('job_title'),
                    manager_id=auth_user_id,
                    is_active=True,
                    start_date=date.today(),
                )
                db.session.add(report_profile)
                logger.info(f"Created stub profile for direct report: {report_email}")

        db.session.commit()

        return jsonify({
            'message': 'User synced successfully',
            'user': user.to_dict(),
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error syncing user: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Sync failed: {str(e)}'}), 500


# ═══════════════════════════════════════════════════════════════════
# Standard CRUD Routes
# ═══════════════════════════════════════════════════════════════════

@users_bp.route('', methods=['GET'])
@require_auth
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
            UserProfile.last_name.ilike(f'%{search_query}%'),
        )
        query = query.filter(search_filter)

    if department_id:
        query = query.filter_by(department_id=department_id)

    if is_active_str is not None:
        is_active = is_active_str.lower() == 'true'
        query = query.filter_by(is_active=is_active)

    query = query.order_by(UserProfile.last_name.asc(), UserProfile.first_name.asc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'users': [u.to_dict() for u in pagination.items],
        'meta': {
            'page': page,
            'per_page': per_page,
            'total': pagination.total,
            'pages': pagination.pages,
        },
    })


@users_bp.route('/<string:user_id>', methods=['GET'])
@require_auth
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
@require_role('hr_admin', 'super_admin')
def create_user():
    """Create a new user profile. HR Admin only."""
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
        is_active=data.get('is_active', True),
    )

    db.session.add(new_user)
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

    return jsonify(new_user.to_dict()), 201


@users_bp.route('/<string:user_id>', methods=['PUT'])
@require_auth
def update_user(user_id):
    """Update a user profile. Self or HR Admin."""
    current_user_id = request.headers.get('X-User-Id')
    current_role = request.headers.get('X-User-Role', '')

    if user_id == 'me':
        user_id = current_user_id

    # Only self or HR can edit
    if user_id != current_user_id and current_role not in ('hr_admin', 'super_admin'):
        return jsonify({'error': 'Forbidden'}), 403

    user = UserProfile.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    # Fields self can edit
    if 'phone' in data:
        user.phone = data['phone']
    if 'avatar_url' in data:
        user.avatar_url = data['avatar_url']

    # Fields only HR can edit
    if current_role in ('hr_admin', 'super_admin'):
        if 'first_name' in data:
            user.first_name = data['first_name']
        if 'last_name' in data:
            user.last_name = data['last_name']
        if 'job_title' in data:
            user.job_title = data['job_title']
        if 'department_id' in data:
            user.department_id = data['department_id']
        if 'manager_id' in data:
            user.manager_id = data['manager_id']
        if 'is_active' in data:
            user.is_active = data['is_active']
        if 'employment_type' in data:
            user.employment_type = data['employment_type']

    db.session.commit()
    return jsonify(user.to_dict())


@users_bp.route('/<string:user_id>/direct-reports', methods=['GET'])
@require_auth
def get_direct_reports(user_id):
    """Get direct reports for a user."""
    if user_id == 'me':
        user_id = request.headers.get('X-User-Id')

    user = UserProfile.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    reports = user.direct_reports
    return jsonify([u.to_dict() for u in reports])


@users_bp.route('/team', methods=['GET'])
@require_auth
def get_team():
    """
    Convenience endpoint for the Team page.
    Returns active direct reports of the current user with optional
    search and department filtering.

    Query params:
        search        — filter by name or email (ilike)
        department_id — filter by department UUID
    """
    user_id = request.headers.get('X-User-Id')
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401

    query = UserProfile.query.filter_by(manager_id=user_id, is_active=True)

    search_query = request.args.get('search', '').strip()
    if search_query:
        search_filter = or_(
            UserProfile.email.ilike(f'%{search_query}%'),
            UserProfile.first_name.ilike(f'%{search_query}%'),
            UserProfile.last_name.ilike(f'%{search_query}%'),
        )
        query = query.filter(search_filter)

    department_id = request.args.get('department_id')
    if department_id:
        query = query.filter_by(department_id=department_id)

    query = query.order_by(
        UserProfile.last_name.asc(),
        UserProfile.first_name.asc(),
    )

    members = query.all()
    return jsonify([u.to_dict() for u in members])


@users_bp.route('/<string:user_id>/manager-chain', methods=['GET'])
@require_auth
def get_manager_chain(user_id):
    """Get the management chain up to the top (max 10 levels).
    Uses a recursive CTE to fetch the entire chain in a single query.
    """
    if user_id == 'me':
        user_id = request.headers.get('X-User-Id')

    user = UserProfile.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    if not user.manager_id:
        return jsonify([])

    # Recursive CTE: start from the user's direct manager, walk up
    cte = (
        db.session.query(
            UserProfile.id,
            UserProfile.manager_id,
            db.literal(1).label('depth'),
        )
        .filter(UserProfile.id == user.manager_id)
        .cte(name='chain', recursive=True)
    )

    cte_alias = cte.alias('c')
    up_alias = UserProfile.__table__.alias('up')

    cte = cte.union_all(
        db.session.query(
            up_alias.c.id,
            up_alias.c.manager_id,
            (cte_alias.c.depth + 1).label('depth'),
        )
        .filter(up_alias.c.id == cte_alias.c.manager_id)
        .filter(cte_alias.c.depth < 10)
    )

    chain_ids = (
        db.session.query(cte.c.id, cte.c.depth)
        .order_by(cte.c.depth.asc())
        .all()
    )

    if not chain_ids:
        return jsonify([])

    # Bulk-load profiles in display order
    id_order = {row.id: row.depth for row in chain_ids}
    profiles = UserProfile.query.filter(
        UserProfile.id.in_(list(id_order.keys()))
    ).all()
    profiles.sort(key=lambda p: id_order[p.id])

    return jsonify([p.to_dict() for p in profiles])