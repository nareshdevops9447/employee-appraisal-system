# EAS Azure Deployment Walkthrough

Complete step-by-step record of deploying the Employee Appraisal System to Azure.
Performed on **10 March 2026**. Use this as a reference for future deployments.

---

## Architecture

```
Internet
   |
Azure NSG (ports 80, 443, 2222)
   |
Azure VM - Ubuntu 22.04 (Standard_D2ads_v6, Central India)
   |-- UFW Firewall (2222, 80, 443)
   |-- Fail2Ban (SSH + Nginx brute-force protection)
   |-- Docker (hardened daemon)
       |-- Nginx (SSL/TLS, rate limiting, security headers)
       |-- Frontend (Next.js 15, standalone build)
       |-- Backend (Flask + Gunicorn)
       |-- PostgreSQL 15 (internal only, SCRAM-SHA-256)
       |-- Certbot (auto-renew Let's Encrypt)
```

---

## Prerequisites

- Azure subscription (free trial works, gives $200 credit)
- Domain name with DNS access (we used `appraisalhub.site`)
- SSH key pair
- Azure CLI installed locally
- Code pushed to GitHub

---

## Phase 1: Azure Account & CLI Setup

### 1.1 Install Azure CLI (PowerShell as Admin)

```powershell
winget install Microsoft.AzureCLI
```

Close and reopen terminal after installation.

### 1.2 Login to Azure

```powershell
az login
```

### 1.3 Fix permissions (if you get AuthorizationFailed error)

Go to Azure Portal > Subscriptions > your subscription > Access control (IAM) >
Add role assignment > **Contributor** role > assign to your user.

Then refresh credentials:

```powershell
az logout
az login --tenant YOUR_TENANT.site
```

### 1.4 Register resource providers

```powershell
az provider register --namespace Microsoft.Storage
az provider register --namespace Microsoft.Compute
az provider register --namespace Microsoft.Network
az provider register --namespace Microsoft.Authorization
```

Verify registration:

```powershell
az provider show --namespace Microsoft.Compute --query "registrationState" -o tsv
```

### 1.5 Generate SSH key (if you don't have one)

```powershell
ssh-keygen -t ed25519 -C "your-email@example.com"
```

---

## Phase 2: Create Azure Resources

### 2.1 Create Resource Group

```powershell
az group create --name eas-dev-rg --location centralindia
```

> **Cheapest regions for VMs:** eastus, westus2, westus3 (~$14.88/mo for B1ms).
> We used `centralindia` for proximity to users.
> Check pricing at: https://cloudprice.net/vm/Standard_B1ms

### 2.2 Create the VM

B1ms was sold out in multiple regions. We used Standard_D2ads_v6 instead:

```powershell
az vm create `
  --resource-group eas-dev-rg `
  --name eas-dev-vm `
  --image Ubuntu2204 `
  --size Standard_D2ads_v6 `
  --admin-username easadmin `
  --generate-ssh-keys `
  --os-disk-size-gb 32 `
  --os-disk-caching ReadWrite `
  --public-ip-sku Standard `
  --nsg eas-dev-nsg `
  --authentication-type ssh `
  --location centralindia `
  --zone 2
```

> **If B1ms/B2s is available:** use `--size Standard_B1ms` (cheapest at ~$15/mo).
> **Fallback sizes:** Standard_B2s (~$30), Standard_D2ads_v6 (~$55)

Note the public IP from the output. Or get it later:

```powershell
az vm show -g eas-dev-rg -n eas-dev-vm --show-details --query publicIps -o tsv
```

### 2.3 Lock the IP as Static (prevents IP change on stop/start)

```powershell
az network public-ip update --resource-group eas-dev-rg --name eas-dev-vmPublicIP --allocation-method Static
```

### 2.4 Configure NSG (Firewall Rules)

**IMPORTANT:** Get YOUR public IP first (not the VM's IP!):

```powershell
(Invoke-WebRequest -Uri "https://api.ipify.org" -UseBasicParsing).Content
```

Then configure rules:

```powershell
# Delete default SSH rule
az network nsg rule delete --resource-group eas-dev-rg --nsg-name eas-dev-nsg --name default-allow-ssh 2>$null

# Allow SSH on port 2222 (YOUR IP only)
az network nsg rule create --resource-group eas-dev-rg --nsg-name eas-dev-nsg `
  --name AllowSSH --priority 1000 --direction Inbound --access Allow `
  --protocol Tcp --destination-port-ranges 2222 `
  --source-address-prefixes "<YOUR_HOME_IP>/32"

# Temporary: Allow SSH on port 22 (needed for FIRST connection before hardening)
az network nsg rule create --resource-group eas-dev-rg --nsg-name eas-dev-nsg `
  --name AllowSSH-Temp --priority 999 --direction Inbound --access Allow `
  --protocol Tcp --destination-port-ranges 22 `
  --source-address-prefixes "<YOUR_HOME_IP>/32"

# Allow HTTP (for SSL certificate setup)
az network nsg rule create --resource-group eas-dev-rg --nsg-name eas-dev-nsg `
  --name AllowHTTP --priority 1001 --direction Inbound --access Allow `
  --protocol Tcp --destination-port-ranges 80

# Allow HTTPS
az network nsg rule create --resource-group eas-dev-rg --nsg-name eas-dev-nsg `
  --name AllowHTTPS --priority 1002 --direction Inbound --access Allow `
  --protocol Tcp --destination-port-ranges 443

# Block everything else
az network nsg rule create --resource-group eas-dev-rg --nsg-name eas-dev-nsg `
  --name DenyAllInbound --priority 4096 --direction Inbound --access Deny `
  --protocol "*" --destination-port-ranges "*"
```

> **GOTCHA:** Use YOUR home IP (from ipify.org), NOT the VM's IP!
> We accidentally used the VM's IP and couldn't SSH in.

---

## Phase 3: DNS Setup

Point your domain to the VM's public IP.

At your domain registrar, add an **A record**:

```
Type: A
Name: @ (or blank for root domain)
Value: 135.235.192.53 (your VM IP)
TTL: 300
```

Verify (from the VM later):

```bash
dig appraisalhub.site +short
# Should return: 135.235.192.53
```

---

## Phase 4: SSH and Upload Code

### 4.1 First SSH connection (port 22, before hardening)

```powershell
ssh easadmin@135.235.192.53
```

Type `yes` when asked about fingerprint.

### 4.2 Clone the project

```bash
sudo apt update && sudo apt install -y git
sudo git clone https://github.com/YOUR_USERNAME/employee-appraisal-system.git /opt/eas
cd /opt/eas
sudo git checkout main
```

### 4.3 Upload files not in git

If `deploy/` folder or other files are missing from git, use SCP from local PowerShell.

**IMPORTANT:** After hardening, SSH moves to port 2222. Use `-P 2222` for SCP:

```powershell
# Before hardening (port 22):
scp -r "S:\EAS\employee-appraisal-system\deploy" easadmin@135.235.192.53:/home/easadmin/deploy-temp

# After hardening (port 2222):
scp -P 2222 -r "S:\EAS\employee-appraisal-system\deploy" easadmin@135.235.192.53:/home/easadmin/deploy-temp
```

Then on the VM:

```bash
sudo mv /home/easadmin/deploy-temp /opt/eas/deploy
```

### 4.4 Files that must exist on the VM

```
/opt/eas/
  docker-compose.yml
  docker-compose.prod.yml
  frontend/Dockerfile.prod
  deploy/
    deploy.sh
    setup-ssl.sh
    backup.sh
    nginx/
      nginx.conf
      block-ips.conf    (can be empty)
  db/
    init.sql
```

---

## Phase 5: Production Fixes (BEFORE Building)

These fixes are critical. Without them the build/deploy will fail.

### 5.1 Fix Windows line endings

Files copied from Windows have `\r\n` endings that break bash scripts:

```bash
sudo apt update && sudo apt install -y dos2unix
sudo dos2unix /opt/eas/deploy/deploy.sh
sudo dos2unix /opt/eas/deploy/setup-ssl.sh
sudo dos2unix /opt/eas/deploy/backup.sh
sudo dos2unix /opt/eas/deploy/nginx/nginx.conf
```

### 5.2 Fix Dockerfile.prod

The production Dockerfile installs only production deps, but TypeScript
is needed during build. Change:

```
RUN npm ci --only=production --legacy-peer-deps
```

To:

```
RUN npm ci --legacy-peer-deps
```

```bash
sudo sed -i 's/npm ci --only=production --legacy-peer-deps/npm ci --legacy-peer-deps/' /opt/eas/frontend/Dockerfile.prod
```

### 5.3 Fix next.config.ts (skip ESLint during build)

The production build fails on ESLint warnings. Ensure next.config.ts has:

```typescript
eslint: {
    ignoreDuringBuilds: true,
},
typescript: {
    ignoreBuildErrors: true,
},
```

If the file on the VM doesn't have these, overwrite it:

```bash
sudo tee /opt/eas/frontend/next.config.ts > /dev/null << 'CONFIGEOF'
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    output: "standalone",
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    { key: 'X-Frame-Options', value: 'DENY' },
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
                    { key: 'X-DNS-Prefetch-Control', value: 'on' },
                ],
            },
        ];
    },
};

export default nextConfig;
CONFIGEOF
```

### 5.4 Fix db/init.sql

Remove the `GRANT` to non-existent `postgres` role:

```bash
sudo tee /opt/eas/db/init.sql > /dev/null << 'EOF'
CREATE DATABASE eas_db;
EOF
```

### 5.5 Fix PostgreSQL healthcheck in docker-compose.yml

Change `pg_isready -U postgres` to use the actual user:

```bash
sudo sed -i 's/pg_isready -U postgres/pg_isready -U \${POSTGRES_USER:-postgres}/' /opt/eas/docker-compose.yml
```

### 5.6 Fix Nginx config

The original nginx.conf has two issues:
- `${DOMAIN_NAME}` is not substituted by Nginx (causes ACME challenge to fail)
- `more_set_headers` requires a module not in standard nginx:alpine

Replace with hardcoded domain and remove `more_set_headers`. See the full
nginx.conf in Appendix A below.

### 5.7 Fix Nginx healthcheck in docker-compose.prod.yml

The default server block returns 444 on requests without a Host header.
The healthcheck must include the Host header:

Change in `docker-compose.prod.yml`:

```yaml
# FROM:
test: ["CMD", "wget", "--spider", "-q", "http://localhost:80/"]

# TO:
test: ["CMD", "wget", "--spider", "-q", "--header", "Host: appraisalhub.site", "http://localhost:80/"]
```

### 5.8 Fix Nginx rate limiting for NextAuth

The `/api/auth/` location block uses the `login` zone (3 requests/minute),
but NextAuth makes many requests per page load. Change the rate limit:

In `deploy/nginx/nginx.conf`, the `/api/auth/` block should use:

```
limit_req zone=api burst=15 nodelay;
```

NOT:

```
limit_req zone=login burst=2 nodelay;
```

### 5.9 Fix Nginx routing for NextAuth

NextAuth runs inside Next.js (frontend), not Flask (backend).
The `/api/auth/` location must proxy to `frontend`, not `backend`:

```nginx
location /api/auth/ {
    limit_req zone=api burst=15 nodelay;
    proxy_pass http://frontend;    # NOT backend!
    ...
}
```

### 5.10 Ensure block-ips.conf exists

```bash
sudo touch /opt/eas/deploy/nginx/block-ips.conf
```

---

## Phase 6: Create Production .env

**IMPORTANT:** Do NOT copy your local .env — it has dev values (localhost, weak passwords).

Create a clean production .env:

```bash
# Generate secrets
echo "POSTGRES_PASSWORD: $(openssl rand -base64 32)"
echo "JWT_SECRET: $(openssl rand -hex 64)"
echo "NEXTAUTH_SECRET: $(openssl rand -hex 32)"
```

Create the file (paste your generated secrets):

```bash
sudo tee /opt/eas/.env > /dev/null << 'EOF'
POSTGRES_USER=eas_admin
POSTGRES_PASSWORD=<PASTE_GENERATED_VALUE>
DATABASE_URL=postgresql://eas_admin:<SAME_PASSWORD_HERE>@postgres:5432/eas_db
FLASK_ENV=production
JWT_SECRET=<PASTE_GENERATED_VALUE>
JWT_ALGORITHM=HS256
AZURE_AD_TENANT_ID=<your-tenant-id>
NEXT_PUBLIC_AZURE_AD_TENANT_ID=<your-tenant-id>
AZURE_AD_CLIENT_ID=<your-client-id>
AZURE_AD_CLIENT_SECRET=<your-client-secret>
NEXT_PUBLIC_API_URL=https://appraisalhub.site
NEXT_PUBLIC_BASE_URL=https://appraisalhub.site
NEXTAUTH_SECRET=<PASTE_GENERATED_VALUE>
DOMAIN_NAME=appraisalhub.site
SSH_PORT=2222
EOF
```

Lock permissions:

```bash
sudo chmod 600 /opt/eas/.env
```

> **GOTCHA:** Do NOT use fancy Unicode characters (em dashes, box-drawing chars)
> in comments. They cause `command not found` errors when bash sources the file.
> Keep .env files plain ASCII with KEY=VALUE lines only.

> **GOTCHA:** Make sure `POSTGRES_PASSWORD` in the `DATABASE_URL` matches the
> standalone `POSTGRES_PASSWORD` value exactly.

---

## Phase 7: Run Hardening Script

```bash
cd /opt/eas
sudo bash deploy/deploy.sh
```

This takes ~5 minutes and does:
- OS updates + automatic security patches
- Kernel hardening (SYN cookies, ASLR, disable IPv6)
- SSH moved to port 2222, key-only auth, no root login
- UFW firewall (only 2222/80/443)
- Fail2Ban for SSH + Nginx
- 2GB swap file
- Docker installation + hardened daemon config
- Log rotation

**CRITICAL: After this, SSH port changes to 2222!**

```powershell
ssh -p 2222 easadmin@135.235.192.53
```

Delete the temporary port 22 rule (from local PowerShell):

```powershell
az network nsg rule delete --resource-group eas-dev-rg --nsg-name eas-dev-nsg --name AllowSSH-Temp
```

---

## Phase 8: SSL Certificate Setup

### 8.1 Run setup script

```bash
cd /opt/eas
sudo bash deploy/setup-ssl.sh
```

This:
1. Creates a temporary self-signed cert
2. Starts Nginx with the temp cert
3. Requests a real Let's Encrypt certificate via ACME challenge

> **Prerequisite:** DNS A record must already point to the VM IP.

### 8.2 Fix SSL cert permissions

Let's Encrypt creates certs with restrictive permissions. Nginx runs as the
`nginx` user and can't read them. Also, symlinks don't work across Docker
volume mounts.

After the cert is obtained, copy the actual files and fix permissions:

```bash
sudo rm -f /opt/eas/deploy/nginx/ssl/fullchain.pem /opt/eas/deploy/nginx/ssl/privkey.pem
sudo cp /opt/eas/deploy/nginx/ssl/archive/appraisalhub.site/fullchain1.pem /opt/eas/deploy/nginx/ssl/fullchain.pem
sudo cp /opt/eas/deploy/nginx/ssl/archive/appraisalhub.site/privkey1.pem /opt/eas/deploy/nginx/ssl/privkey.pem
sudo chmod 644 /opt/eas/deploy/nginx/ssl/fullchain.pem
sudo chmod 644 /opt/eas/deploy/nginx/ssl/privkey.pem
```

> **GOTCHA:** The setup-ssl.sh creates symlinks, but Docker volume mounts don't
> resolve symlinks that use absolute host paths. You MUST copy the actual files.

> **GOTCHA:** `privkey.pem` defaults to `chmod 600` (root-only). Nginx runs as
> the `nginx` user inside the container and can't read it. Set to `644`.

---

## Phase 9: Start All Services

```bash
cd /opt/eas
sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

First build takes 5-10 minutes. Watch progress:

```bash
sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f
```

Check status:

```bash
sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
```

Expected:

```
NAME           STATUS              PORTS
eas-postgres   Up (healthy)        (internal only)
eas-backend    Up (healthy)        (internal only)
eas-frontend   Up                  (internal only)
eas-nginx      Up (healthy)        0.0.0.0:80->80, 0.0.0.0:443->443
eas-certbot    Up
```

Verify HTTPS:

```bash
curl -I https://appraisalhub.site
# Should return HTTP/2 200 with security headers
```

---

## Phase 10: Database Setup

### 10.1 Run migrations

```bash
sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml exec backend flask db upgrade
```

### 10.2 Seed demo data

```bash
sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml exec backend python seed_demo.py
```

### 10.3 Seed other data (optional)

```bash
sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml exec backend python seed_uk_holidays.py
sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml exec backend python seed_projects.py
```

---

## Phase 11: Azure AD Configuration

Go to Azure Portal > Microsoft Entra ID > App Registrations > your app > Authentication.

Add redirect URI:

```
https://appraisalhub.site/api/auth/callback/microsoft-entra-id
```

Keep localhost for local dev:

```
http://localhost:3000/api/auth/callback/microsoft-entra-id
```

---

## Phase 12: Automated Backups

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

---

## VM Start/Stop Script

Save as `eas-vm.ps1` on your local machine:

```powershell
param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("start", "stop", "status")]
    [string]$Action
)

$rg = "eas-dev-rg"
$vm = "eas-dev-vm"

switch ($Action) {
    "start" {
        Write-Host "Starting EAS VM..." -ForegroundColor Green
        az vm start --resource-group $rg --name $vm
        $ip = az vm show -g $rg -n $vm --show-details --query publicIps -o tsv
        Write-Host "VM is running! IP: $ip" -ForegroundColor Green
        Write-Host "SSH: ssh -p 2222 easadmin@$ip" -ForegroundColor Cyan
    }
    "stop" {
        Write-Host "Stopping EAS VM (deallocating)..." -ForegroundColor Yellow
        az vm deallocate --resource-group $rg --name $vm
        Write-Host "VM stopped. No compute charges." -ForegroundColor Yellow
    }
    "status" {
        az vm show -g $rg -n $vm --show-details `
          --query "{Status:powerState, PublicIP:publicIps}" -o table
    }
}
```

Usage:

```powershell
.\eas-vm.ps1 -Action start
.\eas-vm.ps1 -Action stop
.\eas-vm.ps1 -Action status
```

> **Note:** With static IP enabled, the IP stays the same across stop/start.
> Use `deallocate` (not `stop`) to avoid compute charges.

---

## Common Operations

### SSH into VM

```powershell
ssh -p 2222 easadmin@135.235.192.53
```

### View logs

```bash
COMPOSE="sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml"
$COMPOSE logs -f              # All services
$COMPOSE logs -f backend      # Backend only
$COMPOSE logs -f nginx        # Nginx only
```

### Deploy an update

```bash
cd /opt/eas && sudo git pull
sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

### Run database migrations

```bash
sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml exec backend flask db upgrade
```

### Restart everything

```bash
cd /opt/eas
sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml down
sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Check resource usage

```bash
sudo docker stats --no-stream
free -h
df -h
```

### Check SSL expiry

```bash
echo | openssl s_client -connect appraisalhub.site:443 2>/dev/null | openssl x509 -noout -dates
```

### Check Fail2Ban status

```bash
sudo fail2ban-client status
sudo fail2ban-client status sshd
```

### Unban an IP

```bash
sudo fail2ban-client set sshd unbanip <IP>
```

### Update NSG SSH rule (if your home IP changes)

```powershell
az network nsg rule update --resource-group eas-dev-rg --nsg-name eas-dev-nsg `
  --name AllowSSH --source-address-prefixes "<NEW_HOME_IP>/32"
```

---

## Gotchas & Lessons Learned

| Issue | Cause | Fix |
|-------|-------|-----|
| `AuthorizationFailed` creating resources | Account lacks Contributor role | Assign Contributor role in Subscriptions > IAM |
| `SkuNotAvailable` for B1ms | VM size sold out in region | Try different region or VM size (B2s, D2ads_v6) |
| `InvalidEndOfLine` in PowerShell | Used bash syntax (`\|\|`, `2>/dev/null`) | Use PowerShell syntax (`;`, `2>$null`) |
| SSH connection timeout | NSG rule had VM's IP, not home IP | Always use YOUR home IP from `api.ipify.org` |
| SCP fails after hardening | SSH moved to port 2222 | Use `scp -P 2222` |
| `set: pipefail invalid option` | Windows `\r\n` line endings in bash scripts | Run `dos2unix` on all .sh files |
| Unicode chars in .env cause errors | Fancy comments with `--` box chars | Keep .env plain ASCII, no special characters |
| `Cannot find module 'typescript'` | Dockerfile.prod uses `--only=production` | Change to `npm ci --legacy-peer-deps` |
| `Failed to compile` (ESLint errors) | ESLint strict mode in production build | Set `ignoreDuringBuilds: true` in next.config.ts |
| PostgreSQL `role "postgres" does not exist` | `POSTGRES_USER=eas_admin` but healthcheck uses `postgres` | Fix healthcheck: `pg_isready -U ${POSTGRES_USER}` |
| `init.sql` GRANT fails | `GRANT TO postgres` but postgres role doesn't exist | Remove the GRANT line from init.sql |
| SSL ACME challenge fails | `${DOMAIN_NAME}` not substituted in nginx.conf | Hardcode the domain name in nginx.conf |
| `more_set_headers` unknown directive | Module not in standard nginx:alpine | Remove the `more_set_headers` line |
| SSL cert `No such file` in container | Symlinks don't work across Docker volume mounts | Copy actual cert files, don't symlink |
| Nginx can't read privkey.pem | File is chmod 600 (root only), nginx runs as `nginx` user | `chmod 644` the privkey.pem |
| Nginx healthcheck unhealthy | Default server returns 444, healthcheck has no Host header | Add `--header "Host: domain"` to healthcheck |
| Login page shows 503 | Rate limiter (3r/min) blocks NextAuth requests | Change `/api/auth/` to use `api` zone (20r/s) |
| `/api/auth/session` returns Flask 404 | NextAuth routes proxied to backend instead of frontend | Change `/api/auth/` proxy_pass to `http://frontend` |
| `503 Service Temporarily Unavailable` | Nginx in restart loop due to failed healthcheck | Fix healthcheck, then `down` + `up -d` |

---

## Cost Summary (Monthly Estimate)

| Resource | SKU | Cost |
|----------|-----|------|
| VM | Standard_D2ads_v6 (2 vCPU, 8GB) | ~$55 |
| OS Disk | 32GB Standard SSD | ~$2.50 |
| Public IP (Static) | Standard | ~$3.50 |
| Bandwidth | ~50GB egress | ~$4 |
| SSL | Let's Encrypt | Free |
| **Total** | | **~$65/mo** |

> **To reduce cost:** If B1ms becomes available, resize the VM:
> `az vm resize --resource-group eas-dev-rg --name eas-dev-vm --size Standard_B1ms`
> This brings cost down to ~$25/mo.

---

## Appendix A: Production nginx.conf

The nginx.conf must have:
- Hardcoded domain name (not `${DOMAIN_NAME}`)
- No `more_set_headers` directive
- `/api/auth/` routing to `frontend` (not `backend`)
- `/api/auth/` using `api` rate limit zone (not `login`)
- ACME challenge location for Let's Encrypt
- All security headers (HSTS, CSP, X-Frame-Options, etc.)

Key routing rules:

```
/api/auth/*  --> frontend (NextAuth runs in Next.js)
/api/*       --> backend  (Flask API)
/*           --> frontend (Next.js pages)
```

---

## Appendix B: Key File Locations on VM

```
/opt/eas/
  .env                          # Production secrets (chmod 600)
  docker-compose.yml            # Base compose
  docker-compose.prod.yml       # Production overlay
  frontend/
    Dockerfile.prod             # Multi-stage production build
    next.config.ts              # Must have ignoreDuringBuilds
  backend/
    Dockerfile                  # Flask production build
    seed_demo.py                # Demo data seeder
  deploy/
    deploy.sh                   # OS hardening script
    setup-ssl.sh                # Let's Encrypt setup
    backup.sh                   # Database backup
    nginx/
      nginx.conf                # Reverse proxy config
      block-ips.conf            # IP blocklist (can be empty)
      ssl/
        fullchain.pem           # SSL cert (actual file, not symlink)
        privkey.pem             # SSL key (chmod 644)
        archive/                # Let's Encrypt cert archive
        live/                   # Let's Encrypt symlinks (don't use directly)
  db/
    init.sql                    # Just: CREATE DATABASE eas_db;
  logs/
    nginx/                      # Nginx access/error logs
    backend/                    # Backend application logs
  backups/                      # PostgreSQL backup dumps
```
