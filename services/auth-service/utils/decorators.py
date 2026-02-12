"""
Auth decorators — @require_auth and @require_role for protecting endpoints.
"""
import logging
from functools import wraps

from flask import request, jsonify, g

from utils.jwt_utils import decode_access_token

logger = logging.getLogger(__name__)


def require_auth(f):
    """Validate JWT from Authorization header and inject current_user into g."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')

        if not auth_header.startswith('Bearer '):
            return jsonify({'error': 'MISSING_TOKEN', 'message': 'Authorization header required'}), 401

        token = auth_header.split(' ', 1)[1]

        try:
            import jwt as pyjwt
            payload = decode_access_token(token)
            g.current_user = {
                'user_id': payload['sub'],
                'email': payload['email'],
                'role': payload['role'],
            }
        except pyjwt.ExpiredSignatureError:
            return jsonify({'error': 'TOKEN_EXPIRED', 'message': 'Access token has expired'}), 401
        except pyjwt.InvalidTokenError as e:
            logger.warning('Invalid token: %s', e)
            return jsonify({'error': 'INVALID_TOKEN', 'message': 'Invalid access token'}), 401

        return f(*args, **kwargs)
    return decorated


def require_role(allowed_roles):
    """Check that the current user has one of the specified roles.

    Must be used *after* @require_auth so that g.current_user is available.

    Usage:
        @app.route('/admin')
        @require_auth
        @require_role(['hr_admin', 'super_admin'])
        def admin_dashboard():
            ...
    """
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            user = getattr(g, 'current_user', None)
            if user is None:
                return jsonify({'error': 'UNAUTHORIZED', 'message': 'Authentication required'}), 401

            if user['role'] not in allowed_roles:
                return jsonify({
                    'error': 'FORBIDDEN',
                    'message': f'Requires one of: {", ".join(allowed_roles)}'
                }), 403

            return f(*args, **kwargs)
        return decorated
    return decorator
