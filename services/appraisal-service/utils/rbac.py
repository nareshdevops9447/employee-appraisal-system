"""
RBAC decorators for microservices behind the API Gateway.

The API Gateway validates the JWT and injects:
  - X-User-Id
  - X-User-Role
  - X-User-Email

These decorators read those headers to enforce access control.
"""
from functools import wraps
from flask import request, jsonify


def require_auth(f):
    """Ensure the request has a valid X-User-Id header (set by API Gateway)."""
    @wraps(f)
    def decorated(*args, **kwargs):
        user_id = request.headers.get('X-User-Id')
        if not user_id:
            return jsonify({
                'error': 'UNAUTHORIZED',
                'message': 'Authentication required',
            }), 401
        return f(*args, **kwargs)
    return decorated


def require_role(*allowed_roles):
    """Check that X-User-Role is one of the allowed roles.

    Usage:
        @app.route('/admin/cycles', methods=['POST'])
        @require_role('hr_admin', 'super_admin')
        def create_cycle():
            ...
    """
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            user_id = request.headers.get('X-User-Id')
            if not user_id:
                return jsonify({
                    'error': 'UNAUTHORIZED',
                    'message': 'Authentication required',
                }), 401

            role = request.headers.get('X-User-Role', '')
            if role not in allowed_roles:
                return jsonify({
                    'error': 'FORBIDDEN',
                    'message': f'Access denied. Requires one of: {", ".join(allowed_roles)}',
                }), 403

            return f(*args, **kwargs)
        return decorated
    return decorator


def require_self_or_role(user_id_param='user_id', *allowed_roles):
    """Allow access if the user is accessing their own resource OR has an allowed role.

    Usage:
        @require_self_or_role('user_id', 'hr_admin', 'super_admin')
        def get_user(user_id):
            ...
    """
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            current_user_id = request.headers.get('X-User-Id')
            if not current_user_id:
                return jsonify({
                    'error': 'UNAUTHORIZED',
                    'message': 'Authentication required',
                }), 401

            # Check if accessing own resource
            target_id = kwargs.get(user_id_param) or request.args.get(user_id_param)
            if target_id and (target_id == current_user_id or target_id == 'me'):
                return f(*args, **kwargs)

            # Check role
            role = request.headers.get('X-User-Role', '')
            if allowed_roles and role in allowed_roles:
                return f(*args, **kwargs)

            return jsonify({
                'error': 'FORBIDDEN',
                'message': 'You can only access your own resources',
            }), 403

        return decorated
    return decorator