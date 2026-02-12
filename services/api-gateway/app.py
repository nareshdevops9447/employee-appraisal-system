"""
API Gateway — routes all client requests to the appropriate microservice.
Validates JWT on protected routes via the Auth Service.
"""
import os
import logging

from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import requests as http_requests

from config import config

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(name)s] %(levelname)s: %(message)s',
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------

def create_app(config_name=None):
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')

    app = Flask(__name__)
    app.config.from_object(config.get(config_name, config['default']))
    CORS(app)

    # ---- Service URLs ----
    SERVICE_MAP = {
        'auth':      app.config['AUTH_SERVICE_URL'],
        'users':     app.config['USER_SERVICE_URL'],
        'appraisals': app.config['APPRAISAL_SERVICE_URL'],
        'goals':     app.config['GOAL_SERVICE_URL'],
    }

    # Paths that do NOT require JWT validation
    PUBLIC_PREFIXES = (
        '/api/auth/',
        '/health',
    )

    # ------------------------------------------------------------------ #
    # Health endpoint
    # ------------------------------------------------------------------ #
    @app.route('/health')
    def health():
        return jsonify({'status': 'healthy', 'service': 'api-gateway'})

    # ------------------------------------------------------------------ #
    # JWT validation helper
    # ------------------------------------------------------------------ #
    def _is_public_route(path):
        """Check if the request path is public (no auth needed)."""
        for prefix in PUBLIC_PREFIXES:
            if path.startswith(prefix):
                return True
        return False

    def _validate_token():
        """Call the Auth Service to validate the JWT.

        Returns (user_context_dict, None) on success,
        or (None, error_response) on failure.
        """
        auth_header = request.headers.get('Authorization', '')
        if not auth_header:
            return None, (jsonify({
                'error': 'UNAUTHORIZED',
                'message': 'Authorization header is required',
            }), 401)

        try:
            resp = http_requests.get(
                f"{SERVICE_MAP['auth']}/auth/validate",
                headers={'Authorization': auth_header},
                timeout=5,
            )

            if resp.status_code == 200:
                data = resp.json()
                return data, None
            else:
                return None, (Response(
                    resp.content,
                    status=resp.status_code,
                    content_type='application/json',
                ))

        except http_requests.exceptions.ConnectionError:
            return None, (jsonify({
                'error': 'AUTH_SERVICE_UNAVAILABLE',
                'message': 'Authentication service is unavailable',
            }), 503)
        except http_requests.exceptions.Timeout:
            return None, (jsonify({
                'error': 'AUTH_SERVICE_TIMEOUT',
                'message': 'Authentication service timed out',
            }), 504)

    # ------------------------------------------------------------------ #
    # Proxy helpers
    # ------------------------------------------------------------------ #
    def _proxy(service_url, path, extra_headers=None):
        """Forward the current request to *service_url/path*."""
        url = f"{service_url}{path}"
        headers = {
            key: value for key, value in request.headers
            if key.lower() not in ('host', 'content-length')
        }

        # Inject extra headers (user context from JWT validation)
        if extra_headers:
            headers.update(extra_headers)

        try:
            resp = http_requests.request(
                method=request.method,
                url=url,
                headers=headers,
                json=request.get_json(silent=True, force=True),
                params=request.args,
                timeout=30,
            )

            excluded = {'content-encoding', 'content-length',
                        'transfer-encoding', 'connection'}
            resp_headers = {
                k: v for k, v in resp.headers.items()
                if k.lower() not in excluded
            }
            return Response(resp.content, status=resp.status_code,
                            headers=resp_headers)

        except http_requests.exceptions.ConnectionError:
            return jsonify({
                'error': 'SERVICE_UNAVAILABLE',
                'message': 'Downstream service is unavailable',
            }), 503
        except http_requests.exceptions.Timeout:
            return jsonify({
                'error': 'GATEWAY_TIMEOUT',
                'message': 'Downstream service timed out',
            }), 504

    def _proxy_protected(service_key, path):
        """Validate JWT then proxy to the downstream service with user context headers."""
        user_ctx, error_resp = _validate_token()
        if error_resp:
            return error_resp

        extra_headers = {
            'X-User-Id': user_ctx.get('user_id', ''),
            'X-User-Role': user_ctx.get('role', ''),
            'X-User-Email': user_ctx.get('email', ''),
        }
        return _proxy(SERVICE_MAP[service_key], path, extra_headers)

    # ------------------------------------------------------------------ #
    # Route definitions — forward to backend services
    # ------------------------------------------------------------------ #

    # Auth routes — pass through without JWT validation
    @app.route('/api/auth/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
    def auth_proxy(path):
        return _proxy(SERVICE_MAP['auth'], f'/auth/{path}')

    # Protected routes — validate JWT first, then proxy with user context
    @app.route('/api/users/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
    @app.route('/api/users', defaults={'path': ''}, methods=['GET', 'POST'])
    def users_proxy(path):
        return _proxy_protected('users', f'/api/users/{path}' if path else '/api/users')

    @app.route('/api/departments/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
    @app.route('/api/departments', defaults={'path': ''}, methods=['GET', 'POST'])
    def departments_proxy(path):
        return _proxy_protected('users', f'/api/departments/{path}' if path else '/api/departments')


    @app.route('/api/appraisals/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
    @app.route('/api/appraisals', defaults={'path': ''}, methods=['GET', 'POST'])
    def appraisals_proxy(path):
        return _proxy_protected('appraisals', f'/api/appraisals/{path}' if path else '/api/appraisals')

    @app.route('/api/cycles/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
    @app.route('/api/cycles', defaults={'path': ''}, methods=['GET', 'POST'])
    def cycles_proxy(path):
        return _proxy_protected('appraisals', f'/api/cycles/{path}' if path else '/api/cycles')

    @app.route('/api/reports/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
    @app.route('/api/reports', defaults={'path': ''}, methods=['GET', 'POST'])
    def reports_proxy(path):
        return _proxy_protected('appraisals', f'/api/reports/{path}' if path else '/api/reports')

    @app.route('/api/goals/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
    @app.route('/api/goals', defaults={'path': ''}, methods=['GET', 'POST'])
    def goals_proxy(path):
        return _proxy_protected('goals', f'/api/goals/{path}' if path else '/api/goals')

    return app


# ---------------------------------------------------------------------------
# Module-level app instance (used by gunicorn: ``app:app``)
# ---------------------------------------------------------------------------
app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
