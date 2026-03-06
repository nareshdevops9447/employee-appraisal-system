"""
Authentication routes — login, logout, token refresh, Azure AD callback.
Migrated from auth-service/routes/auth.py.

Key change: Inter-service HTTP call to user-service for profile sync is now
a direct database operation via UserProfile model.
"""
import uuid
import hashlib
import logging
from datetime import datetime, timezone

import bcrypt
from flask import Blueprint, request, jsonify, current_app, g

from extensions import db, limiter
from models.user_auth import UserAuth
from models.user_profile import UserProfile
from models.department import Department
from models.team_transfer import TeamTransfer
from models.refresh_token import RefreshToken
from utils.jwt_utils import (
    create_access_token,
    create_refresh_token,
    decode_access_token,
    verify_refresh_token,
    validate_azure_token,
)
from utils.graph_client import GraphClient

logger = logging.getLogger(__name__)

auth_bp = Blueprint('auth', __name__)

# ── Role mapping ────────────────────────────────────────────────────

ROLE_MAPPING = {
    'Super_Admin': 'super_admin',
    'HR_Admin': 'hr_admin',
    'Manager': 'manager',
    'Employee': 'employee',
    # Also accept space-delimited variants
    'Super Admin': 'super_admin',
    'HR Admin': 'hr_admin',
}


def _map_azure_roles(azure_payload):
    """Map Azure AD groups / roles claims to application roles."""
    roles = azure_payload.get('roles', [])
    groups = azure_payload.get('groups', [])

    logger.info('Azure AD token roles claim: %s', roles)
    logger.info('Azure AD token groups claim: %s', groups)

    # Check app roles first (defined in Azure AD App Registration)
    for azure_role in roles:
        mapped = ROLE_MAPPING.get(azure_role)
        if mapped:
            logger.info('Mapped Azure role "%s" → "%s"', azure_role, mapped)
            return mapped

    # If wids (directory role template IDs) are present, check for global admin
    wids = azure_payload.get('wids', [])
    if '62e90394-69f5-4237-9190-012177145e10' in wids:
        logger.info('User has Global Admin directory role → super_admin')
        return 'super_admin'

    return 'employee'


def _is_admin_role(role_name):
    """Check if role is an admin role."""
    return role_name in ('super_admin', 'hr_admin')


def _sync_user_profile(user_auth, profile_data=None):
    """Sync user auth data to user_profiles table (direct DB call, no HTTP).

    This replaces the old HTTP POST to user-service /api/users/sync.
    """
    try:
        profile = UserProfile.query.filter_by(id=user_auth.id).first()

        if not profile:
            # Create new profile
            profile = UserProfile(
                id=user_auth.id,
                email=user_auth.email,
                first_name=profile_data.get('first_name', '') if profile_data else '',
                last_name=profile_data.get('last_name', '') if profile_data else '',
            )
            db.session.add(profile)
        else:
            # Update existing profile
            profile.email = user_auth.email

        # Update with profile data if provided
        if profile_data:
            if profile_data.get('first_name'):
                profile.first_name = profile_data['first_name']
            if profile_data.get('last_name'):
                profile.last_name = profile_data['last_name']
            if profile_data.get('job_title'):
                profile.job_title = profile_data['job_title']
            if profile_data.get('azure_oid'):
                profile.azure_oid = profile_data['azure_oid']
            if profile_data.get('avatar_url'):
                profile.avatar_url = profile_data['avatar_url']

            # Handle department sync (with team transfer tracking)
            if profile_data.get('department'):
                dept_name = profile_data['department']
                dept = Department.query.filter_by(name=dept_name).first()
                if not dept:
                    dept = Department(name=dept_name)
                    db.session.add(dept)
                    db.session.flush()

                # Track team transfer if department changed
                old_dept_id = profile.department_id
                if old_dept_id and old_dept_id != dept.id:
                    transfer = TeamTransfer(
                        user_id=profile.id,
                        from_department_id=old_dept_id,
                        to_department_id=dept.id,
                        from_manager_id=profile.manager_id,
                    )
                    db.session.add(transfer)
                    logger.info('Team transfer recorded for %s: dept %s → %s',
                                user_auth.email, old_dept_id, dept.id)

                profile.department_id = dept.id

            # Handle manager sync
            if profile_data.get('manager_azure_oid'):
                mgr = UserProfile.query.filter_by(
                    azure_oid=profile_data['manager_azure_oid']
                ).first()
                if mgr:
                    profile.manager_id = mgr.id

        db.session.commit()
        logger.info('User profile synced for %s', user_auth.email)
        return profile
    except Exception as e:
        db.session.rollback()
        logger.error('Profile sync failed for %s: %s', user_auth.email, e)
        return None


# ─── POST /api/auth/azure/callback ─────────────────────────────────

@auth_bp.route('/azure/callback', methods=['POST'])
@limiter.limit("10 per minute")
def azure_callback():
    """Handle Azure AD authentication callback.

    Flow:
    1. Validate Azure AD id_token
    2. Map Azure AD roles to internal roles
    3. Fetch Graph API data (profile, manager, direct reports)
    4. Auto-promote employee→manager if they have direct reports
    5. Upsert user in DB with role protection
    6. Sync user profile
    7. Issue application JWT tokens
    """
    data = request.get_json(silent=True) or {}
    id_token = data.get('id_token')
    access_token = data.get('access_token')

    if not id_token:
        return jsonify({'error': 'MISSING_TOKEN', 'message': 'id_token is required'}), 400

    if not access_token:
        logger.warning('No access_token provided — Graph API sync will be skipped.')

    # --- Validate the Azure AD token ---
    try:
        azure_payload = validate_azure_token(id_token)
    except Exception as e:
        logger.warning('Azure token validation failed: %s', e)
        return jsonify({'error': 'Invalid Azure AD token', 'details': str(e)}), 401

    azure_oid = azure_payload.get('oid') or azure_payload.get('sub')
    email = (
        azure_payload.get('preferred_username')
        or azure_payload.get('email')
        or azure_payload.get('upn', '')
    ).lower()
    display_name = azure_payload.get('name', '')

    if not email:
        return jsonify({'error': 'MISSING_EMAIL', 'message': 'No email claim in Azure token'}), 400

    # --- Map Azure AD roles to app roles ---
    role = _map_azure_roles(azure_payload)
    logger.info('Initial role mapping for %s: %s', email, role)

    # --- Fetch Graph API data (manager, direct reports, profile) ---
    user_graph_info = None
    department = None
    display_from_graph = display_name
    manager_info = None
    direct_reports = []
    report_count = 0

    if access_token:
        user_graph_info = GraphClient.get_me(access_token)
        if user_graph_info:
            logger.info('Graph profile: %s, Dept: %s',
                        user_graph_info.get('email'), user_graph_info.get('department'))
            department = user_graph_info.get('department')
            display_from_graph = user_graph_info.get('display_name') or display_name
        else:
            logger.warning('Failed to fetch user profile from Graph API')

        manager_info = GraphClient.get_user_manager(access_token)
        if manager_info:
            logger.info('Manager found: %s', manager_info.get('email'))

        direct_reports = GraphClient.get_direct_reports(access_token)
        report_count = len(direct_reports) if direct_reports else 0
        logger.info('Direct reports found: %d', report_count)
    else:
        logger.warning('Skipping Graph API calls due to missing access_token')

    # --- Role logic: direct reports = manager ---
    # Only upgrade to 'manager' if currently 'employee' but has reports.
    # Do NOT downgrade admins.
    if role == 'employee' and report_count > 0:
        role = 'manager'
        logger.info('User %s has %d direct reports → upgrading role to manager', email, report_count)

    # --- Upsert user ---
    user = UserAuth.query.filter(
        (UserAuth.azure_oid == azure_oid) | (UserAuth.email == email)
    ).first()

    if user is None:
        user = UserAuth(
            email=email,
            azure_oid=azure_oid,
            role=role,
            is_active=True,
        )
        db.session.add(user)
        logger.info('Auto-provisioned new user from Azure AD: %s (role=%s)', email, role)
    else:
        # Update Azure OID if missing
        if not user.azure_oid:
            user.azure_oid = azure_oid

        # --- Role upgrade/downgrade protection ---
        if user.role != role:
            # 1. Upgrade Employee → Manager (has direct reports)
            if user.role == 'employee' and role == 'manager':
                user.role = 'manager'
                logger.info('Upgraded role for %s to manager', email)

            # 2. Downgrade Manager → Employee (lost reports)
            #    Only if we are SURE via Graph API (access_token present)
            elif user.role == 'manager' and role == 'employee' and access_token:
                user.role = 'employee'
                logger.info('Downgraded role for %s from manager to employee', email)

            # 3. If token says admin, upgrade regardless
            if _is_admin_role(role) and not _is_admin_role(user.role):
                user.role = role
                logger.info('Upgraded role for %s to %s', email, role)

    user.last_login = datetime.now(timezone.utc)
    db.session.commit()
    logger.info('Final stored role for %s: %s', email, user.role)

    if not user.is_active:
        return jsonify({'error': 'ACCOUNT_DISABLED', 'message': 'Account is disabled'}), 403

    # --- Issue application tokens ---
    app_access_token = create_access_token(user)
    raw_refresh, refresh_id = create_refresh_token(user, db.session)

    # --- Sync user profile (direct DB, no HTTP) ---
    parts = display_from_graph.split(' ', 1)
    profile_data = {
        'first_name': parts[0] if parts else '',
        'last_name': parts[1] if len(parts) > 1 else '',
        'azure_oid': azure_oid,
    }

    if user_graph_info:
        profile_data['job_title'] = user_graph_info.get('job_title')
        profile_data['department'] = department

    if access_token:
        photo_url = GraphClient.get_user_photo(access_token)
        if photo_url:
            profile_data['avatar_url'] = photo_url

    if manager_info:
        profile_data['manager_azure_oid'] = manager_info.get('azure_oid')

    _sync_user_profile(user, profile_data)

    return jsonify({
        'access_token': app_access_token,
        'refresh_token': raw_refresh,
        'token_type': 'Bearer',
        'user': user.to_dict(),
    })


# ─── POST /api/auth/login ──────────────────────────────────────────

@auth_bp.route('/login', methods=['POST'])
@limiter.limit("10 per minute")
def login():
    """Local login with email and password."""
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password are required'}), 400

    user = UserAuth.query.filter_by(email=data['email']).first()
    if not user or not user.password_hash:
        return jsonify({'error': 'Invalid credentials'}), 401

    # Account lockout check
    if user.is_locked():
        return jsonify({'error': 'Account temporarily locked due to too many failed attempts. Try again later.'}), 429

    if not bcrypt.checkpw(data['password'].encode(), user.password_hash.encode()):
        user.record_failed_login(db.session)
        return jsonify({'error': 'Invalid credentials'}), 401

    if not user.is_active:
        return jsonify({'error': 'Account is deactivated'}), 403

    # Successful login — reset lockout state
    user.reset_failed_logins(db.session)
    user.last_login = datetime.now(timezone.utc)
    db.session.commit()

    access_token = create_access_token(user)
    raw_refresh, refresh_id = create_refresh_token(user, db.session)

    # Sync profile
    _sync_user_profile(user)

    return jsonify({
        'access_token': access_token,
        'refresh_token': raw_refresh,
        'user': user.to_dict(),
    })


# ─── POST /api/auth/register ───────────────────────────────────────

@auth_bp.route('/register', methods=['POST'])
@limiter.limit("5 per minute")
def register():
    """Register a new local user."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    if UserAuth.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 409

    password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    user = UserAuth(
        email=email,
        password_hash=password_hash,
        role=data.get('role', 'employee'),
    )
    db.session.add(user)
    db.session.commit()

    # Create user profile
    _sync_user_profile(user, {
        'first_name': data.get('first_name', ''),
        'last_name': data.get('last_name', ''),
    })

    access_token = create_access_token(user)
    raw_refresh, refresh_id = create_refresh_token(user, db.session)

    return jsonify({
        'access_token': access_token,
        'refresh_token': raw_refresh,
        'user': user.to_dict(),
    }), 201


# ─── POST /api/auth/refresh ────────────────────────────────────────

@auth_bp.route('/refresh', methods=['POST'])
@limiter.limit("20 per minute")
def refresh():
    """Refresh access token using a refresh token."""
    data = request.get_json()
    raw_token = data.get('refresh_token') if data else None

    if not raw_token:
        return jsonify({'error': 'refresh_token is required'}), 400

    rt = verify_refresh_token(raw_token, db.session)
    if not rt:
        return jsonify({'error': 'Invalid or expired refresh token'}), 401

    user = UserAuth.query.get(rt.user_id)
    if not user or not user.is_active:
        return jsonify({'error': 'User not found or deactivated'}), 401

    # Revoke old refresh token
    rt.is_revoked = True
    rt.revoked_at = datetime.now(timezone.utc)

    # Issue new tokens
    new_access = create_access_token(user)
    new_raw_refresh, _ = create_refresh_token(user, db.session)

    return jsonify({
        'access_token': new_access,
        'refresh_token': new_raw_refresh,
        'user': user.to_dict(),
    })


# ─── POST /api/auth/logout ─────────────────────────────────────────

@auth_bp.route('/logout', methods=['POST'])
@limiter.limit("10 per minute")
def logout():
    """Revoke refresh tokens."""
    data = request.get_json()

    # Try to revoke specific token
    raw_token = data.get('refresh_token') if data else None
    if raw_token:
        rt = verify_refresh_token(raw_token, db.session)
        if rt:
            rt.is_revoked = True
            rt.revoked_at = datetime.now(timezone.utc)
            db.session.commit()

    return jsonify({'message': 'Logged out successfully'})


# ─── GET /api/auth/validate ────────────────────────────────────────


@auth_bp.route('/validate', methods=['GET'])
@limiter.limit("30 per minute")
def validate_token():
    """Validate an access token and return user info."""
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return jsonify({'valid': False, 'error': 'Missing token'}), 401

    token = auth_header.split(' ', 1)[1]
    try:
        payload = decode_access_token(token)
        return jsonify({
            'valid': True,
            'user': {
                'id': payload['sub'],
                'email': payload['email'],
                'role': payload['role'],
            },
        })
    except Exception as e:
        return jsonify({'valid': False, 'error': str(e)}), 401


# ─── GET /api/auth/me ──────────────────────────────────────────────

@auth_bp.route('/me', methods=['GET'])
@limiter.limit("30 per minute")
def get_me():
    """Get current user info from token."""
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Missing token'}), 401

    token = auth_header.split(' ', 1)[1]
    try:
        payload = decode_access_token(token)
        user = UserAuth.query.get(payload['sub'])
        if not user:
            return jsonify({'error': 'User not found'}), 404

        result = user.to_dict()

        # Also include profile data
        profile = UserProfile.query.get(user.id)
        if profile:
            result['profile'] = profile.to_dict()

        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 401
