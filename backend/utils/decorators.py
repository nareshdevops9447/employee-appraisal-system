"""
Auth decorators — unified @require_auth and @require_role for the monolith.

In the monolith, ALL routes go through JWT validation directly (no API gateway).
The @require_auth decorator decodes the JWT, verifies the user in DB, and sets g.current_user.
The @require_role decorator checks g.current_user.role.

For backward compatibility, routes that previously read X-User-Id / X-User-Role
headers can now read from g.current_user instead.
"""
import logging
from functools import wraps

from flask import request, jsonify, g

from utils.jwt_utils import decode_access_token

logger = logging.getLogger(__name__)


def _verify_user_in_db(payload):
    """Verify that the user from the JWT still exists and is active in the DB.

    Returns the current user dict with DB-verified role, or None if invalid.
    This provides defense-in-depth: even if a JWT is valid, the user must
    still be active and their role is read from the DB (not the JWT).
    """
    from models.user_auth import UserAuth

    user_id = payload['sub']
    user = UserAuth.query.get(user_id)

    if not user:
        logger.warning('JWT references non-existent user: %s', user_id)
        return None

    if not user.is_active:
        logger.warning('JWT used by deactivated user: %s', user_id)
        return None

    # SECURITY: Use the role from the database, not the JWT.
    # This ensures role changes and deactivations take effect immediately,
    # rather than waiting for the JWT to expire (up to 15 min).
    return {
        'user_id': user.id,
        'email': user.email,
        'role': user.role,  # From DB, not JWT — defense-in-depth
    }


def require_auth(f):
    """Validate JWT from Authorization header and inject current_user into g.

    SECURITY: After decoding the JWT, verifies the user still exists and is
    active in the database. Uses the DB role (not JWT role) for authorization.

    Sets:
        g.current_user = {
            'user_id': str,
            'email': str,
            'role': str,  # From DB, verified
        }
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')

        if not auth_header.startswith('Bearer '):
            return jsonify({
                'error': 'MISSING_TOKEN',
                'message': 'Authorization header required',
            }), 401

        token = auth_header.split(' ', 1)[1]

        try:
            import jwt as pyjwt
            payload = decode_access_token(token)

            # SECURITY: Verify user exists and is active in DB
            current_user = _verify_user_in_db(payload)
            if current_user is None:
                return jsonify({
                    'error': 'UNAUTHORIZED',
                    'message': 'User account not found or deactivated',
                }), 401

            g.current_user = current_user
        except Exception as e:
            import jwt as pyjwt
            if isinstance(e, pyjwt.ExpiredSignatureError):
                return jsonify({
                    'error': 'TOKEN_EXPIRED',
                    'message': 'Access token has expired',
                }), 401
            logger.warning('Invalid token: %s', e)
            return jsonify({
                'error': 'INVALID_TOKEN',
                'message': 'Invalid access token',
            }), 401

        return f(*args, **kwargs)
    return decorated


def require_role(*allowed_roles):
    """Check that the current user has one of the specified roles.

    Must be used *after* @require_auth so that g.current_user is available.

    Usage:
        @app.route('/admin')
        @require_auth
        @require_role('hr_admin', 'super_admin')
        def admin_dashboard():
            ...

    Can also be used stand-alone (it includes auth check):
        @require_role('hr_admin', 'super_admin')
        def admin_dashboard():
            ...
    """
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            # If require_auth wasn't applied yet, do auth check here
            user = getattr(g, 'current_user', None)
            if user is None:
                # Try to authenticate
                auth_header = request.headers.get('Authorization', '')
                if not auth_header.startswith('Bearer '):
                    return jsonify({
                        'error': 'UNAUTHORIZED',
                        'message': 'Authentication required',
                    }), 401

                token = auth_header.split(' ', 1)[1]
                try:
                    import jwt as pyjwt
                    payload = decode_access_token(token)

                    # SECURITY: Verify user exists and is active in DB
                    current_user = _verify_user_in_db(payload)
                    if current_user is None:
                        return jsonify({
                            'error': 'UNAUTHORIZED',
                            'message': 'User account not found or deactivated',
                        }), 401

                    g.current_user = current_user
                    user = g.current_user
                except Exception:
                    return jsonify({
                        'error': 'UNAUTHORIZED',
                        'message': 'Authentication required',
                    }), 401

            if user['role'] not in allowed_roles:
                return jsonify({
                    'error': 'FORBIDDEN',
                    'message': f'Requires one of: {", ".join(allowed_roles)}',
                }), 403

            return f(*args, **kwargs)
        return decorated
    return decorator
