"""
Auth routes blueprint — SSO callback, local login, token refresh, logout,
current user, and token validation.
"""
import logging
from datetime import datetime, timezone

import bcrypt
import jwt as pyjwt
from flask import Blueprint, request, jsonify, g, current_app
import requests as http_requests

from app import db
from app import db
from models.user import UserAuth
from models.refresh_token import RefreshToken
from utils.jwt_utils import (
    create_access_token,
    create_refresh_token,
    decode_access_token,
    verify_refresh_token,
    validate_azure_token,
)
from utils.decorators import require_auth
from utils.graph_client import GraphClient

logger = logging.getLogger(__name__)

auth_bp = Blueprint('auth', __name__, url_prefix='/auth')


# ═══════════════════════════════════════════════════════════════════════
# POST /auth/azure/callback — Azure AD SSO callback
# ═══════════════════════════════════════════════════════════════════════
@auth_bp.route('/azure/callback', methods=['POST'])
def azure_callback():
    """Handle Azure AD SSO callback.

    Expects JSON body with either:
      - { "id_token": "<azure-id-token>" }
      - { "access_token": "<azure-access-token>" }
    """
    data = request.get_json(silent=True) or {}
    id_token = data.get('id_token') or data.get('access_token')

    if not id_token:
        return jsonify({
            'error': 'MISSING_TOKEN',
            'message': 'id_token or access_token is required'
        }), 400

    # --- Validate the Azure AD token ---
    try:
        azure_payload = validate_azure_token(id_token)
    except pyjwt.ExpiredSignatureError:
        return jsonify({'error': 'TOKEN_EXPIRED', 'message': 'Azure AD token has expired'}), 401
    except pyjwt.InvalidTokenError as e:
        return jsonify({'error': 'INVALID_TOKEN', 'message': str(e)}), 401

    # --- Extract claims ---
    azure_oid = azure_payload.get('oid') or azure_payload.get('sub')
    email = (
        azure_payload.get('preferred_username')
        or azure_payload.get('email')
        or azure_payload.get('upn', '')
    ).lower()
    name = azure_payload.get('name', '')

    if not email:
        return jsonify({'error': 'MISSING_EMAIL', 'message': 'No email claim in Azure token'}), 400

    # --- Map Azure AD roles to app roles ---
    role = _map_azure_roles(azure_payload)

    # --- Upsert user ---
    user = UserAuth.query.filter(
        (UserAuth.azure_oid == azure_oid) | (UserAuth.email == email)
    ).first()

    if user is None:
        # Auto-provision new user from Azure AD
        user = UserAuth(
            email=email,
            azure_oid=azure_oid,
            role=role,
            is_active=True,
        )
        db.session.add(user)
        logger.info('Auto-provisioned new user from Azure AD: %s', email)
    else:
        # Update existing user with Azure info
        if not user.azure_oid:
            user.azure_oid = azure_oid
        if role != 'employee':  # Only upgrade roles, don't downgrade
            user.role = role

    user.last_login = datetime.now(timezone.utc)
    db.session.commit()

    if not user.is_active:
        return jsonify({'error': 'ACCOUNT_DISABLED', 'message': 'Account is disabled'}), 403

    # --- Issue application tokens ---
    access_token = create_access_token(user)
    refresh_token_raw, refresh_token_id = create_refresh_token(user, db.session)

    # --- Fetch Manager from Graph API ---
    # We use the incoming id_token/access_token. 
    # NOTE: The id_token might not work for Graph API calls if it's just an ID token.
    # Usually we need an access token for Graph.
    # The frontend should pass the Access Token intended for Graph API, or we rely on OBO.
    # If the frontend passes 'access_token' in `data`, use that. If `id_token`, we might fail.
    # We'll try using the token we received.
    incoming_token = data.get('access_token') or id_token
    manager_info = GraphClient.get_user_manager(incoming_token)
    manager_oid = manager_info.get('azure_oid') if manager_info else None

    # --- Optionally sync user to User Service ---
    _sync_user_to_user_service(user, name, manager_oid)

    return jsonify({
        'access_token': access_token,
        'refresh_token': refresh_token_raw,
        'token_type': 'Bearer',
        'user': user.to_dict(),
    }), 200


def _map_azure_roles(azure_payload):
    """Map Azure AD groups / roles claims to application roles."""
    roles = azure_payload.get('roles', [])
    groups = azure_payload.get('groups', [])

    # Check app roles first (defined in Azure AD App Registration)
    role_mapping = {
        'Super_Admin': 'super_admin',
        'HR_Admin': 'hr_admin',
        'Manager': 'manager',
        'Employee': 'employee',
    }

    for azure_role in roles:
        mapped = role_mapping.get(azure_role)
        if mapped:
            return mapped

    # If wids (directory role template IDs) are present, check for admin
    wids = azure_payload.get('wids', [])
    # Global admin template ID
    if '62e90394-69f5-4237-9190-012177145e10' in wids:
        return 'super_admin'

    return 'employee'


def _sync_user_to_user_service(user, display_name='', manager_oid=None):
    """Best-effort sync of user profile to the User Service."""
    user_service_url = current_app.config.get('USER_SERVICE_URL', '')
    if not user_service_url:
        return

    try:
        http_requests.post(
            f'{user_service_url}/api/users/sync',
            json={
                'auth_user_id': user.id,
                'email': user.email,
                'display_name': display_name,
                'role': user.role,
                'azure_oid': user.azure_oid,
                'manager_oid': manager_oid
            },
            timeout=5,
        )
    except Exception as e:
        logger.warning('Failed to sync user to User Service: %s', e)


# ═══════════════════════════════════════════════════════════════════════
# POST /auth/login — Local email/password login (fallback)
# ═══════════════════════════════════════════════════════════════════════
@auth_bp.route('/login', methods=['POST'])
def login():
    """Authenticate with email and password."""
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({
            'error': 'MISSING_FIELDS',
            'message': 'Email and password are required'
        }), 400

    user = UserAuth.query.filter_by(email=email).first()

    if user is None:
        return jsonify({'error': 'INVALID_CREDENTIALS', 'message': 'Invalid email or password'}), 401

    if not user.password_hash:
        return jsonify({
            'error': 'SSO_ONLY',
            'message': 'This account uses SSO. Please sign in with Microsoft.'
        }), 400

    if not bcrypt.checkpw(password.encode(), user.password_hash.encode()):
        return jsonify({'error': 'INVALID_CREDENTIALS', 'message': 'Invalid email or password'}), 401

    if not user.is_active:
        return jsonify({'error': 'ACCOUNT_DISABLED', 'message': 'Account is disabled'}), 403

    user.last_login = datetime.now(timezone.utc)
    db.session.commit()

    access_token = create_access_token(user)
    refresh_token_raw, _ = create_refresh_token(user, db.session)

    return jsonify({
        'access_token': access_token,
        'refresh_token': refresh_token_raw,
        'token_type': 'Bearer',
        'user': user.to_dict(),
    }), 200


# ═══════════════════════════════════════════════════════════════════════
# POST /auth/refresh — Refresh access token
# ═══════════════════════════════════════════════════════════════════════
@auth_bp.route('/refresh', methods=['POST'])
def refresh():
    """Issue a new access token using a valid refresh token."""
    data = request.get_json(silent=True) or {}
    raw_token = str(data.get('refresh_token', ''))

    if not raw_token:
        return jsonify({'error': 'MISSING_TOKEN', 'message': 'refresh_token is required'}), 400

    rt = verify_refresh_token(raw_token, db.session)
    if rt is None:
        print(f"Refresh failed for token: {raw_token[:10]}... check reasons below")
        return jsonify({'error': 'INVALID_TOKEN', 'message': 'Invalid or expired refresh token'}), 401

    user = UserAuth.query.get(rt.user_id)
    if user is None or not user.is_active:
        return jsonify({'error': 'INVALID_USER', 'message': 'User not found or disabled'}), 401

    # Revoke old refresh token and issue new pair (token rotation)
    rt.is_revoked = True
    rt.revoked_at = datetime.now(timezone.utc)
    db.session.commit()

    access_token = create_access_token(user)
    new_refresh_raw, _ = create_refresh_token(user, db.session)

    return jsonify({
        'access_token': access_token,
        'refresh_token': new_refresh_raw,
        'token_type': 'Bearer',
    }), 200


# ═══════════════════════════════════════════════════════════════════════
# POST /auth/logout — Revoke refresh token
# ═══════════════════════════════════════════════════════════════════════
@auth_bp.route('/logout', methods=['POST'])
def logout():
    """Revoke the given refresh token."""
    data = request.get_json(silent=True) or {}
    raw_token = data.get('refresh_token', '')

    if raw_token:
        rt = verify_refresh_token(raw_token, db.session)
        if rt:
            rt.is_revoked = True
            db.session.commit()

    return jsonify({'message': 'Logged out successfully'}), 200


# ═══════════════════════════════════════════════════════════════════════
# GET /auth/me — Current user from JWT
# ═══════════════════════════════════════════════════════════════════════
@auth_bp.route('/me', methods=['GET'])
@require_auth
def me():
    """Return the current user's profile from the JWT."""
    user = UserAuth.query.get(g.current_user['user_id'])
    if user is None:
        return jsonify({'error': 'USER_NOT_FOUND', 'message': 'User not found'}), 404

    return jsonify({'user': user.to_dict()}), 200


# ═══════════════════════════════════════════════════════════════════════
# GET /auth/validate — Validate JWT (used by API Gateway)
# ═══════════════════════════════════════════════════════════════════════
@auth_bp.route('/validate', methods=['GET'])
def validate():
    """Validate a JWT token. Returns user context if valid.

    Used by the API Gateway to authenticate requests before proxying.
    """
    auth_header = request.headers.get('Authorization', '')

    if not auth_header.startswith('Bearer '):
        return jsonify({'valid': False, 'error': 'MISSING_TOKEN'}), 401

    token = auth_header.split(' ', 1)[1]

    try:
        payload = decode_access_token(token)
        return jsonify({
            'valid': True,
            'user_id': payload['sub'],
            'email': payload['email'],
            'role': payload['role'],
        }), 200
    except pyjwt.ExpiredSignatureError:
        return jsonify({'valid': False, 'error': 'TOKEN_EXPIRED'}), 401
    except pyjwt.InvalidTokenError:
        return jsonify({'valid': False, 'error': 'INVALID_TOKEN'}), 401
