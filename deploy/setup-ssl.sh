#!/usr/bin/env bash
###############################################################################
# setup-ssl.sh — Obtain Let's Encrypt SSL certificate for the EAS domain
# Run as: sudo bash deploy/setup-ssl.sh
###############################################################################
set -euo pipefail

APP_DIR="/opt/eas"
source "$APP_DIR/.env"

if [ -z "${DOMAIN_NAME:-}" ]; then
  echo "ERROR: DOMAIN_NAME not set in .env"
  exit 1
fi

echo "============================================"
echo " SSL Certificate Setup for $DOMAIN_NAME"
echo "============================================"

SSL_DIR="$APP_DIR/deploy/nginx/ssl"
CERTBOT_DIR="$APP_DIR/deploy/nginx/certbot"

mkdir -p "$SSL_DIR" "$CERTBOT_DIR"

# ---------- Step 1: Create temporary self-signed cert ----------
echo "[1/3] Creating temporary self-signed certificate..."
openssl req -x509 -nodes -days 1 \
  -newkey rsa:2048 \
  -keyout "$SSL_DIR/privkey.pem" \
  -out "$SSL_DIR/fullchain.pem" \
  -subj "/CN=$DOMAIN_NAME" 2>/dev/null

# ---------- Step 2: Start Nginx with temp cert ----------
echo "[2/3] Starting Nginx with temporary certificate..."
cd "$APP_DIR"
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d nginx

# Wait for Nginx to be ready
sleep 5

# ---------- Step 3: Obtain real certificate ----------
echo "[3/3] Requesting Let's Encrypt certificate..."
docker run --rm \
  -v "$SSL_DIR:/etc/letsencrypt" \
  -v "$CERTBOT_DIR:/var/www/certbot" \
  certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "admin@$DOMAIN_NAME" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN_NAME"

# ---------- Symlink live cert to expected paths ----------
if [ -d "$SSL_DIR/live/$DOMAIN_NAME" ]; then
  ln -sf "$SSL_DIR/live/$DOMAIN_NAME/fullchain.pem" "$SSL_DIR/fullchain.pem"
  ln -sf "$SSL_DIR/live/$DOMAIN_NAME/privkey.pem"   "$SSL_DIR/privkey.pem"
fi

# ---------- Reload Nginx ----------
echo "Reloading Nginx with real certificate..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec nginx nginx -s reload

echo ""
echo "SSL setup complete for $DOMAIN_NAME"
echo "Certificate auto-renewal is handled by the certbot container."
echo ""
