# EAS — Hardened Azure VM Deployment Guide (Dev Environment)

## Architecture Overview

```
     Internet
        │
   ┌────▼────┐
   │  Azure   │  NSG: only 80, 443, 2222
   │   NSG    │
   └────┬─────┘
        │
┌───────▼──────────────────────────────────────────────┐
│  Azure VM — Ubuntu 22.04 (Standard_B1ms — $15/mo)    │
│                                                      │
│  ┌────────┐  ┌──────────┐  ┌───────────┐            │
│  │  UFW   │─▶│ Fail2Ban │  │ Kernel    │            │
│  │ :2222  │  │ SSH+Nginx│  │ Hardening │            │
│  │ :80    │  └──────────┘  │ (sysctl)  │            │
│  │ :443   │                └───────────┘            │
│  └────┬───┘                                         │
│       │                                              │
│  ┌────▼──────────────────────────────────────────┐   │
│  │  Docker (daemon hardened, no-new-privileges)  │   │
│  │                                               │   │
│  │  ┌─────────┐   ┌───────────┐  ┌───────────┐  │   │
│  │  │  Nginx  │──▶│ Next.js   │  │ Flask API │  │   │
│  │  │ :80/443 │──▶│ (RO FS)   │  │ (RO FS)   │  │   │
│  │  │ WAF-lite│   │ :3000     │  │ :5000     │  │   │
│  │  │ CSP+HSTS│   └───────────┘  └─────┬─────┘  │   │
│  │  └─────────┘                        │        │   │
│  │  ┌──────────┐              ┌────────▼──────┐  │   │
│  │  │ Certbot  │              │  PostgreSQL   │  │   │
│  │  │ auto-SSL │              │  SCRAM-SHA256 │  │   │
│  │  └──────────┘              │  (no ext port)│  │   │
│  │                            └───────────────┘  │   │
│  └───────────────────────────────────────────────┘   │
│                                                      │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │ 2GB Swap   │  │ Log Rotation │  │ Auto-Backup │  │
│  │ (cost save)│  │ (logrotate)  │  │ (cron 2AM)  │  │
│  └────────────┘  └──────────────┘  └─────────────┘  │
└──────────────────────────────────────────────────────┘
```

---

## Cost Comparison

| Approach | VM | Monthly Cost | RAM | Notes |
|----------|-----|-------------|-----|-------|
| **Previous** | Standard_B2ms | ~$60/mo | 8 GB | Overkill for dev |
| **Optimized** | Standard_B1ms | ~$15/mo | 2 GB | + 2GB swap, tuned memory limits |
| **Alternative** | Standard_B2s | ~$30/mo | 4 GB | More headroom if needed |

> **Why B1ms works:** With 2GB swap, tuned container memory limits (~1.3GB total), and multi-stage Docker builds, the app runs comfortably. Burstable CPU handles intermittent load spikes.

---

## Prerequisites

- Azure subscription (free trial works)
- A domain name (e.g., `eas.yourdomain.com`) with DNS access
- SSH key pair (`ssh-keygen -t ed25519` if you don't have one)

---

## Step 1 — Provision the Azure VM

### Via Azure CLI:

```bash
# Create resource group
az group create --name eas-dev-rg --location eastus

# Create VM — cost-optimized B1ms with SSH key auth only
az vm create \
  --resource-group eas-dev-rg \
  --name eas-dev-vm \
  --image Ubuntu2204 \
  --size Standard_B1ms \
  --admin-username easadmin \
  --generate-ssh-keys \
  --os-disk-size-gb 32 \
  --os-disk-caching ReadWrite \
  --public-ip-sku Standard \
  --nsg eas-dev-nsg \
  --authentication-type ssh
```

### Configure NSG (Network Security Group) — defense in depth:

```bash
# Remove the default SSH rule on port 22
az network nsg rule delete \
  --resource-group eas-dev-rg \
  --nsg-name eas-dev-nsg \
  --name default-allow-ssh 2>/dev/null || true

# Allow SSH on non-standard port (2222) — restrict to YOUR IP
az network nsg rule create \
  --resource-group eas-dev-rg \
  --nsg-name eas-dev-nsg \
  --name AllowSSH \
  --priority 1000 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --destination-port-ranges 2222 \
  --source-address-prefixes "<YOUR_PUBLIC_IP>/32"

# Allow HTTP (for ACME/redirect)
az network nsg rule create \
  --resource-group eas-dev-rg \
  --nsg-name eas-dev-nsg \
  --name AllowHTTP \
  --priority 1001 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --destination-port-ranges 80

# Allow HTTPS
az network nsg rule create \
  --resource-group eas-dev-rg \
  --nsg-name eas-dev-nsg \
  --name AllowHTTPS \
  --priority 1002 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --destination-port-ranges 443

# Explicitly deny everything else inbound
az network nsg rule create \
  --resource-group eas-dev-rg \
  --nsg-name eas-dev-nsg \
  --name DenyAllInbound \
  --priority 4096 \
  --direction Inbound \
  --access Deny \
  --protocol '*' \
  --destination-port-ranges '*'
```

### After creation:
1. Note the public IP: `az vm show -g eas-dev-rg -n eas-dev-vm --show-details --query publicIps -o tsv`
2. Point your domain A record: `eas.yourdomain.com → <VM_PUBLIC_IP>`

---

## Step 2 — SSH into the VM

```bash
# First connection is on port 22 (before hardening script changes it)
ssh easadmin@<VM_PUBLIC_IP>
```

---

## Step 3 — Upload Project & Run Setup

```bash
# Option A: Clone from Git
sudo git clone <YOUR_REPO_URL> /opt/eas

# Option B: SCP from local machine
# scp -r ./employee-appraisal-system easadmin@<VM_IP>:/opt/eas

# Copy and configure environment
sudo cp /opt/eas/deploy/.env.production.template /opt/eas/.env
sudo nano /opt/eas/.env
```

Generate and fill in secrets:
```bash
# Run these locally or on the VM to generate secure values:
echo "POSTGRES_PASSWORD=$(openssl rand -base64 32)"
echo "JWT_SECRET=$(openssl rand -hex 64)"
echo "NEXTAUTH_SECRET=$(openssl rand -hex 32)"
```

Fill in the .env file:
```
DOMAIN_NAME=eas.yourdomain.com
SSH_PORT=2222
POSTGRES_USER=eas_admin
POSTGRES_PASSWORD=<paste generated value>
JWT_SECRET=<paste generated value>
NEXTAUTH_SECRET=<paste generated value>
AZURE_AD_TENANT_ID=<from Azure Portal>
AZURE_AD_CLIENT_ID=<from Azure Portal>
AZURE_AD_CLIENT_SECRET=<from Azure Portal>
FLASK_ENV=production
```

**Important:** Update Azure AD App Registration redirect URI:
```
https://eas.yourdomain.com/api/auth/callback/azure-ad
```

---

## Step 4 — Run the Hardening Script

```bash
cd /opt/eas
sudo bash deploy/deploy.sh
```

This script:
- Updates OS + enables auto security patches
- Applies kernel hardening (sysctl: SYN flood protection, ASLR, disable IPv6)
- Moves SSH to port 2222, disables password auth, key-only, no root login
- Configures UFW firewall (only 2222/80/443)
- Sets up Fail2Ban for SSH + Nginx (brute-force, scanner, rate-limit bans)
- Creates 2GB swap file (so the smaller VM won't OOM)
- Installs Docker with hardened daemon config (no-new-privileges, log limits)
- Locks down .env file permissions (600, root-only)
- Configures log rotation for all services

> **CRITICAL:** After this script, SSH moves to port 2222!
> Reconnect with: `ssh -p 2222 easadmin@<VM_IP>`

---

## Step 5 — Set Up SSL Certificate

```bash
ssh -p 2222 easadmin@<VM_IP>
sudo bash /opt/eas/deploy/setup-ssl.sh
```

> DNS A record must be pointing to the VM IP before this step.

---

## Step 6 — Build and Start All Services

```bash
cd /opt/eas
sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Watch startup:
```bash
sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f
```

Verify:
```bash
sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
```

Expected:
```
NAME            STATUS              PORTS
eas-postgres    Up (healthy)        (internal only)
eas-backend     Up (healthy)        (internal only)
eas-frontend    Up                  (internal only)
eas-nginx       Up (healthy)        0.0.0.0:80->80, 0.0.0.0:443->443
eas-certbot     Up
```

---

## Step 7 — Verify Security

```bash
# Test HTTPS
curl -I https://eas.yourdomain.com

# Verify security headers
curl -sI https://eas.yourdomain.com | grep -iE "x-frame|x-content|strict-transport|content-security|cross-origin|permissions-policy"

# Verify HTTP redirects to HTTPS
curl -I http://eas.yourdomain.com

# Verify direct IP access is blocked
curl -I https://<VM_IP>       # Should get connection reset (444)

# Verify vulnerability scanner paths are blocked
curl -sI https://eas.yourdomain.com/wp-admin       # 444
curl -sI https://eas.yourdomain.com/.env            # 404
curl -sI https://eas.yourdomain.com/phpmyadmin      # 444

# Check resource usage (should be well within B1ms limits)
sudo docker stats --no-stream
```

Default login: `admin@company.com / admin123` — **change immediately**.

---

## Step 8 — Set Up Automated Backups

```bash
# Test manually
sudo bash /opt/eas/deploy/backup.sh

# Schedule daily at 2 AM
sudo crontab -e
```

Add:
```cron
0 2 * * * /opt/eas/deploy/backup.sh >> /var/log/eas-backup.log 2>&1
```

Restore:
```bash
docker exec -i eas-postgres pg_restore \
  -U eas_admin -d eas_db --clean --if-exists \
  < /opt/eas/backups/eas_db_YYYYMMDD_HHMMSS.dump
```

---

## Security Summary

### Layer 1: Azure Network (NSG)
| Rule | Port | Source | Action |
|------|------|--------|--------|
| SSH | 2222 | Your IP only | Allow |
| HTTP | 80 | Any | Allow (→ 301 HTTPS) |
| HTTPS | 443 | Any | Allow |
| Everything else | * | * | **Deny** |

### Layer 2: OS Hardening
- [x] SSH on non-standard port 2222
- [x] SSH key-only auth (password disabled)
- [x] Root login disabled
- [x] Fail2Ban — bans after 3 failed SSH attempts (2h)
- [x] Fail2Ban — bans Nginx brute-force and scanners
- [x] Kernel hardening (SYN cookies, ASLR, disable redirects/source routes)
- [x] IPv6 disabled (reduce attack surface)
- [x] Automatic security updates (unattended-upgrades)
- [x] Audit daemon (auditd) enabled
- [x] AppArmor enabled
- [x] SSH warning banner

### Layer 3: Docker Hardening
- [x] Daemon: `no-new-privileges` default, log size limits, live restore
- [x] All containers: `no-new-privileges`, memory limits
- [x] Backend + Frontend: `read_only` filesystem (tmpfs for /tmp)
- [x] PostgreSQL: not exposed to host, SCRAM-SHA-256 auth
- [x] `.env` file: `chmod 600`, root-only

### Layer 4: Nginx (Application Gateway)
- [x] TLS 1.2+ only (Mozilla Intermediate profile)
- [x] HSTS with preload (2-year max-age)
- [x] Content-Security-Policy (whitelists Azure AD for SSO)
- [x] Cross-Origin headers (COEP, COOP, CORP)
- [x] Permissions-Policy (no camera/mic/geo/payment/usb)
- [x] Rate limiting: 20r/s API, 3r/min auth, 10r/s general
- [x] Connection limits (20 per IP)
- [x] Bad bot blocking (sqlmap, nikto, nmap, etc.)
- [x] Vulnerability scanner path blocking (wp-admin, .env, phpmyadmin, etc.)
- [x] Direct IP access returns 444 (connection close)
- [x] Empty User-Agent blocked
- [x] Tighter buffer limits (prevent large-header attacks)
- [x] Auto-renewing SSL via Certbot

### Layer 5: Operational
- [x] Log rotation (14 days, compressed)
- [x] Daily automated DB backups (30-day retention)
- [x] Health check monitoring
- [x] 2GB swap (prevents OOM on small VM)

---

## Common Operations

### View logs
```bash
cd /opt/eas
COMPOSE="sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml"

$COMPOSE logs -f                  # All services
$COMPOSE logs -f backend          # Backend only
$COMPOSE logs -f nginx            # Nginx only
```

### Deploy an update
```bash
cd /opt/eas && git pull
sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

### Run database migrations
```bash
sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml exec backend flask db upgrade
```

### Block an IP manually
```bash
echo "deny 1.2.3.4;" >> /opt/eas/deploy/nginx/block-ips.conf
sudo docker exec eas-nginx nginx -s reload
```

### Check Fail2Ban status
```bash
sudo fail2ban-client status
sudo fail2ban-client status sshd
sudo fail2ban-client status nginx-limit-req
```

### Unban an IP
```bash
sudo fail2ban-client set sshd unbanip 1.2.3.4
```

### Check SSL expiry
```bash
echo | openssl s_client -connect eas.yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates
```

### Check resource usage
```bash
sudo docker stats --no-stream
free -h         # RAM + swap
df -h           # Disk
```

### Emergency: restart everything
```bash
cd /opt/eas
sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml down
sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## Monitoring (Recommended — Free Options)

### Azure Monitor alerts (included free with VM):
```bash
# High CPU alert
az monitor metrics alert create \
  --resource-group eas-dev-rg \
  --name "eas-high-cpu" \
  --scopes "/subscriptions/<SUB_ID>/resourceGroups/eas-dev-rg/providers/Microsoft.Compute/virtualMachines/eas-dev-vm" \
  --condition "avg Percentage CPU > 85" \
  --window-size 5m \
  --evaluation-frequency 1m

# Enable boot diagnostics (free)
az vm boot-diagnostics enable --resource-group eas-dev-rg --name eas-dev-vm
```

### Simple health-check cron:
```bash
# Add to crontab
*/5 * * * * curl -sf https://eas.yourdomain.com/health || echo "EAS DOWN at $(date)" >> /var/log/eas-health.log
```

---

## Cost Breakdown (Monthly Estimate)

| Resource | SKU | Cost |
|----------|-----|------|
| VM | Standard_B1ms (1 vCPU, 2GB) | ~$15 |
| OS Disk | 32GB Standard SSD | ~$2.50 |
| Public IP | Standard | ~$3.50 |
| Bandwidth | ~50GB egress | ~$4 |
| SSL cert | Let's Encrypt | Free |
| DNS | Azure DNS zone | ~$0.50 |
| **Total** | | **~$25/mo** |

> Savings vs B2ms setup: **~$40/mo (60% less)**

---

## Troubleshooting

| Symptom | Check |
|---------|-------|
| Can't SSH | `ssh -p 2222` (port changed!). Check NSG allows your IP. |
| 502 Bad Gateway | `docker compose logs backend` — healthy? OOM? |
| 444 on access | Using domain not IP? Check `server_name` matches. |
| SSL fails | DNS A record correct? `dig eas.yourdomain.com` |
| Can't connect | `sudo ufw status` + check Azure NSG rules |
| OOM killer | `dmesg | grep -i oom` — increase swap or upgrade VM |
| Slow response | `docker stats` — check memory/CPU pressure |
| Certbot fails | Domain must resolve to VM IP first |
| Fail2Ban blocked me | `sudo fail2ban-client set sshd unbanip <YOUR_IP>` |
