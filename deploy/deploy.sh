#!/usr/bin/env bash
###############################################################################
# deploy.sh — Hardened one-shot deployment for EAS on Azure VM (Ubuntu 22.04+)
# Run as: sudo bash deploy.sh
###############################################################################
set -euo pipefail

APP_DIR="/opt/eas"
REPO_URL=""   # <-- Set your git repo URL here (HTTPS or SSH)
SSH_PORT="${SSH_PORT:-2222}"  # Non-standard SSH port (set in .env or override)

echo "============================================"
echo " EAS Hardened Deployment Script"
echo "============================================"

###########################################################################
# 1. SYSTEM UPDATES & BASE PACKAGES
###########################################################################
echo "[1/12] Updating system packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y && apt-get upgrade -y
apt-get install -y \
  apt-transport-https ca-certificates curl gnupg lsb-release \
  ufw fail2ban unattended-upgrades logrotate git \
  auditd apparmor apparmor-utils jq

# Enable automatic security updates
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'AUTOUP'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
AUTOUP
systemctl enable unattended-upgrades
systemctl start unattended-upgrades

###########################################################################
# 2. KERNEL HARDENING (sysctl)
###########################################################################
echo "[2/12] Applying kernel hardening..."
cat > /etc/sysctl.d/99-eas-hardening.conf <<'SYSCTL'
# ---- Network hardening ----
net.ipv4.ip_forward = 1                   # Required for Docker
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0
net.ipv4.conf.all.log_martians = 1
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.icmp_ignore_bogus_error_responses = 1
net.ipv4.tcp_syncookies = 1               # SYN flood protection
net.ipv4.tcp_max_syn_backlog = 2048
net.ipv4.tcp_synack_retries = 2
net.ipv4.tcp_syn_retries = 5

# ---- IPv6 disable (reduce attack surface if not needed) ----
net.ipv6.conf.all.disable_ipv6 = 1
net.ipv6.conf.default.disable_ipv6 = 1

# ---- Filesystem hardening ----
fs.suid_dumpable = 0
kernel.randomize_va_space = 2              # Full ASLR
SYSCTL
sysctl --system

###########################################################################
# 3. SSH HARDENING
###########################################################################
echo "[3/12] Hardening SSH (port $SSH_PORT, key-only)..."
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak

cat > /etc/ssh/sshd_config.d/99-eas-hardening.conf <<SSHEOF
# ---- Connection ----
Port $SSH_PORT
AddressFamily inet
LoginGraceTime 30
MaxAuthTries 3
MaxSessions 3

# ---- Authentication (key-only, no root) ----
PermitRootLogin no
PasswordAuthentication no
PermitEmptyPasswords no
PubkeyAuthentication yes
AuthenticationMethods publickey
KbdInteractiveAuthentication no
ChallengeResponseAuthentication no
UsePAM yes

# ---- Forwarding & Tunnels ----
AllowTcpForwarding no
X11Forwarding no
AllowAgentForwarding no
PermitTunnel no

# ---- Timeouts ----
ClientAliveInterval 300
ClientAliveCountMax 2

# ---- Logging ----
LogLevel VERBOSE

# ---- Banners ----
Banner /etc/ssh/banner
SSHEOF

# Create SSH warning banner
cat > /etc/ssh/banner <<'BANNER'
*******************************************************************
*  AUTHORIZED ACCESS ONLY — All activity is monitored and logged  *
*******************************************************************
BANNER

# Restart SSH (will apply new port)
systemctl restart sshd

###########################################################################
# 4. FIREWALL (UFW) — adjusted for non-standard SSH port
###########################################################################
echo "[4/12] Configuring firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow "$SSH_PORT/tcp"  comment 'SSH (non-standard)'
ufw allow 80/tcp           comment 'HTTP (redirect to HTTPS)'
ufw allow 443/tcp          comment 'HTTPS'
# Block standard SSH port if we moved it
if [ "$SSH_PORT" != "22" ]; then
  ufw deny 22/tcp comment 'Block default SSH port'
fi
ufw --force enable
ufw status verbose

###########################################################################
# 5. FAIL2BAN — protect SSH + Nginx
###########################################################################
echo "[5/12] Configuring fail2ban..."
cat > /etc/fail2ban/jail.local <<F2B
[DEFAULT]
bantime  = 3600
findtime = 600
maxretry = 3
banaction = ufw

[sshd]
enabled  = true
port     = $SSH_PORT
filter   = sshd
logpath  = /var/log/auth.log
maxretry = 3
bantime  = 7200

[sshd-ddos]
enabled  = true
port     = $SSH_PORT
filter   = sshd-ddos
logpath  = /var/log/auth.log
maxretry = 5
bantime  = 3600

[nginx-http-auth]
enabled  = true
port     = http,https
filter   = nginx-http-auth
logpath  = /opt/eas/logs/nginx/error.log
maxretry = 3

[nginx-botsearch]
enabled  = true
port     = http,https
filter   = nginx-botsearch
logpath  = /opt/eas/logs/nginx/access.log
maxretry = 5

[nginx-limit-req]
enabled  = true
port     = http,https
filter   = nginx-limit-req
logpath  = /opt/eas/logs/nginx/error.log
maxretry = 10
bantime  = 600
F2B

systemctl enable fail2ban
systemctl restart fail2ban

###########################################################################
# 6. SWAP FILE (allows smaller/cheaper VM)
###########################################################################
echo "[6/12] Configuring 2GB swap file..."
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  # Tune swappiness for server workload
  echo 'vm.swappiness=10' >> /etc/sysctl.d/99-eas-hardening.conf
  echo 'vm.vfs_cache_pressure=50' >> /etc/sysctl.d/99-eas-hardening.conf
  sysctl --system
fi
echo "  Swap: $(swapon --show | tail -1)"

###########################################################################
# 7. INSTALL DOCKER
###########################################################################
echo "[7/12] Installing Docker..."
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
fi
docker --version

# Docker daemon hardening
mkdir -p /etc/docker
cat > /etc/docker/daemon.json <<'DOCKERJSON'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "no-new-privileges": true,
  "live-restore": true,
  "userland-proxy": false,
  "default-ulimits": {
    "nofile": { "Name": "nofile", "Hard": 65536, "Soft": 32768 }
  }
}
DOCKERJSON
systemctl restart docker

###########################################################################
# 8. DOCKER COMPOSE
###########################################################################
echo "[8/12] Verifying Docker Compose..."
if ! docker compose version &>/dev/null; then
  apt-get install -y docker-compose-plugin
fi
docker compose version

###########################################################################
# 9. CLONE / PULL REPOSITORY
###########################################################################
echo "[9/12] Setting up application..."
if [ -z "$REPO_URL" ]; then
  echo "  REPO_URL not set — skipping git clone."
  echo "  Copy your project to $APP_DIR manually."
  mkdir -p "$APP_DIR"
else
  if [ -d "$APP_DIR/.git" ]; then
    echo "  Pulling latest changes..."
    cd "$APP_DIR" && git pull
  else
    echo "  Cloning repository..."
    git clone "$REPO_URL" "$APP_DIR"
  fi
fi

###########################################################################
# 10. ENVIRONMENT FILE CHECK
###########################################################################
echo "[10/12] Checking environment file..."
if [ ! -f "$APP_DIR/.env" ]; then
  echo ""
  echo "  WARNING: No .env file found at $APP_DIR/.env"
  echo "  Copy the template and fill in real values:"
  echo "    cp $APP_DIR/deploy/.env.production.template $APP_DIR/.env"
  echo "    nano $APP_DIR/.env"
  echo ""
  exit 1
fi

# Lock down .env file permissions
chmod 600 "$APP_DIR/.env"
chown root:root "$APP_DIR/.env"

###########################################################################
# 11. CREATE DIRECTORIES + PERMISSIONS
###########################################################################
echo "[11/12] Creating directories..."
mkdir -p "$APP_DIR/deploy/nginx/ssl"
mkdir -p "$APP_DIR/deploy/nginx/certbot"
mkdir -p "$APP_DIR/backups"
mkdir -p "$APP_DIR/logs/nginx"
mkdir -p "$APP_DIR/logs/backend"
mkdir -p "$APP_DIR/logs/postgres"

# Secure directory permissions
chmod 700 "$APP_DIR/deploy/nginx/ssl"
chmod 700 "$APP_DIR/backups"

###########################################################################
# 12. LOG ROTATION
###########################################################################
echo "[12/12] Configuring log rotation..."
cat > /etc/logrotate.d/eas <<'LOGROTATE'
/opt/eas/logs/nginx/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    sharedscripts
    postrotate
        docker exec eas-nginx nginx -s reopen 2>/dev/null || true
    endscript
}

/opt/eas/logs/backend/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
}
LOGROTATE

echo ""
echo "============================================"
echo " Hardened system setup complete!"
echo "============================================"
echo ""
echo "IMPORTANT — SSH is now on port $SSH_PORT"
echo "  Reconnect with: ssh -p $SSH_PORT easadmin@<VM_IP>"
echo ""
echo "Next steps:"
echo "  1. Edit $APP_DIR/.env with production values"
echo "  2. Run SSL setup:   sudo bash $APP_DIR/deploy/setup-ssl.sh"
echo "  3. Start services:  cd $APP_DIR && sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build"
echo "  4. Check status:    sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml ps"
echo ""
