"""
JWT utility functions — token creation, decoding, and Azure AD validation.
"""
import os
import uuid
import hashlib
import logging
from datetime import datetime, timedelta, timezone

import jwt
import bcrypt
import requests

logger = logging.getLogger(__name__)

# ── Config pulled from env / Flask app config ──────────────────────────
JWT_SECRET = os.getenv('JWT_SECRET', 'dev-secret')
JWT_ALGORITHM = os.getenv('JWT_ALGORITHM', 'HS256')
ACCESS_TOKEN_EXPIRY_MINUTES = 15
REFRESH_TOKEN_EXPIRY_DAYS = 7

# Azure AD
AZURE_AD_TENANT_ID = os.getenv('AZURE_AD_TENANT_ID', '')
AZURE_AD_CLIENT_ID = os.getenv('AZURE_AD_CLIENT_ID', '')

# Microsoft's OIDC config / JWKS endpoints
AZURE_OIDC_CONFIG_URL = (
    f'https://login.microsoftonline.com/{AZURE_AD_TENANT_ID}/v2.0/.well-known/openid-configuration'
)

# Cache for Azure JWKS keys
_jwks_cache: dict = {'keys': None, 'fetched_at': None}
JWKS_CACHE_TTL = timedelta(hours=12)


# ═══════════════════════════════════════════════════════════════════════
# Application JWT (HS256)
# ═══════════════════════════════════════════════════════════════════════

def create_access_token(user):
    """Create a short-lived access token for the given user."""
    now = datetime.now(timezone.utc)
    payload = {
        'sub': user.id,
        'email': user.email,
        'role': user.role,
        'iat': now,
        'exp': now + timedelta(minutes=ACCESS_TOKEN_EXPIRY_MINUTES),
        'type': 'access',
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(user, db_session):
    """Create a long-lived refresh token; store its hash in the DB."""
    from models.refresh_token import RefreshToken

    raw_token = uuid.uuid4().hex + uuid.uuid4().hex  # 64-char hex string
    token_hash = bcrypt.hashpw(raw_token.encode(), bcrypt.gensalt()).decode()

    expires_at = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRY_DAYS)

    refresh = RefreshToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=expires_at,
    )
    db_session.add(refresh)
    db_session.commit()

    return raw_token, refresh.id


def decode_access_token(token):
    """Decode and verify an application access token. Returns the payload dict."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get('type') != 'access':
            raise jwt.InvalidTokenError('Not an access token')
        return payload
    except jwt.ExpiredSignatureError:
        raise
    except jwt.InvalidTokenError:
        raise


def verify_refresh_token(raw_token, db_session):
    """Look up and verify a raw refresh token against stored hashes.

    Returns the RefreshToken record if valid, or None.
    """
    from models.refresh_token import RefreshToken

    # Get all non-revoked, non-expired tokens
    active_tokens = RefreshToken.query.filter_by(is_revoked=False).all()

    for rt in active_tokens:
        if rt.is_expired():
            # print(f"Token {rt.id} expired at {rt.expires_at}")
            continue
        if bcrypt.checkpw(raw_token.encode(), rt.token_hash.encode()):
            return rt
            
    # Check if it was a revoked token (with Grace Period)
    revoked = RefreshToken.query.filter_by(is_revoked=True).all()
    now = datetime.now(timezone.utc)
    GRACE_PERIOD_SECONDS = 30
    
    for rt in revoked:
        if bcrypt.checkpw(raw_token.encode(), rt.token_hash.encode()):
            # Check grace period
            if rt.revoked_at:
                elapsed = (now - rt.revoked_at).total_seconds()
                if elapsed < GRACE_PERIOD_SECONDS:
                    # Allow this token! It's likely a race condition.
                    # Return it so the caller can issue a new one (rotation continues)
                    return rt
                else:
                    print(f"DEBUG: Token {rt.id} revoked {elapsed}s ago (Details: {rt.revoked_at})")
            else:
                print(f"DEBUG: Token {rt.id} revoked (No timestamp)")
            
            return None # Revoked and outside grace period

    print("DEBUG: Refresh token not found or hash mismatch")
    return None


# ═══════════════════════════════════════════════════════════════════════
# Azure AD Token Validation
# ═══════════════════════════════════════════════════════════════════════

def _get_azure_jwks():
    """Fetch (and cache) the Microsoft JWKS signing keys."""
    now = datetime.now(timezone.utc)

    cached_keys = _jwks_cache.get('keys')
    cached_at = _jwks_cache.get('fetched_at')

    if (
        cached_keys is not None
        and cached_at is not None
        and now - cached_at < JWKS_CACHE_TTL
    ):
        return cached_keys

    try:
        # First get the OIDC config to find the jwks_uri
        oidc_resp = requests.get(AZURE_OIDC_CONFIG_URL, timeout=10)
        oidc_resp.raise_for_status()
        jwks_uri = oidc_resp.json()['jwks_uri']

        # Now fetch the actual JWKS
        jwks_resp = requests.get(jwks_uri, timeout=10)
        jwks_resp.raise_for_status()
        keys = jwks_resp.json()['keys']

        _jwks_cache['keys'] = keys
        _jwks_cache['fetched_at'] = now
        logger.info('Fetched %d Azure AD JWKS signing keys', len(keys))
        return keys
    except Exception as e:
        logger.error('Failed to fetch Azure AD JWKS: %s', e)
        cached_keys = _jwks_cache.get('keys')
        if cached_keys is not None:
            return cached_keys  # Use stale cache
        raise


def validate_azure_token(id_token):
    """Validate an Azure AD ID token.

    Returns the decoded token payload if valid.
    Raises jwt.InvalidTokenError on failure.
    """
    try:
        # Decode header to get the key ID (kid)
        unverified_header = jwt.get_unverified_header(id_token)
        kid = unverified_header.get('kid')

        if not kid:
            raise jwt.InvalidTokenError('Token header missing kid')

        # Find the matching key
        keys = _get_azure_jwks()
        matching_key = None
        for key in keys:
            if key.get('kid') == kid:
                matching_key = key
                break

        if matching_key is None:
            # Possible key rotation — bust cache and retry once
            _jwks_cache['keys'] = None
            keys = _get_azure_jwks()
            for key in keys:
                if key.get('kid') == kid:
                    matching_key = key
                    break

        if matching_key is None:
            raise jwt.InvalidTokenError(f'No matching key found for kid={kid}')

        # Build the public key from JWK
        public_key = jwt.algorithms.RSAAlgorithm.from_jwk(matching_key)

        # Validate the token
        payload = jwt.decode(
            id_token,
            public_key,
            algorithms=['RS256'],
            audience=AZURE_AD_CLIENT_ID,
            issuer=f'https://login.microsoftonline.com/{AZURE_AD_TENANT_ID}/v2.0',
            options={
                'verify_exp': True,
                'verify_iat': True,
                'verify_aud': True,
                'verify_iss': True,
            },
        )

        logger.info('Azure AD token validated for %s', payload.get('preferred_username', 'unknown'))
        return payload

    except jwt.ExpiredSignatureError:
        logger.warning('Azure AD token has expired')
        raise
    except jwt.InvalidTokenError as e:
        logger.warning('Azure AD token validation failed: %s', e)
        raise
    except Exception as e:
        logger.error('Unexpected error validating Azure AD token: %s', e)
        raise jwt.InvalidTokenError(f'Token validation error: {e}')
