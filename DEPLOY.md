# Deployment Guide - music.ml4-lab.com

> **Complete deployment guide for ML4-Lab ytify fork on Netcup VPS.**

---

## Table of Contents

- [Quick Commands](#quick-commands)
- [Prerequisites](#prerequisites)
- [VPS Deployment to Netcup](#vps-deployment-to-netcup)
  - [Quick Deploy (One-Liner)](#quick-deploy-one-liner)
  - [Initial Server Setup](#initial-server-setup)
  - [Step-by-Step Deployment](#step-by-step-deployment)
  - [Rollback Instructions](#rollback-instructions)
- [Nginx Configuration](#nginx-configuration)
- [Docker Deployment (Alternative)](#docker-deployment-alternative)
- [Environment Variables](#environment-variables)
- [Post-Deployment Verification](#post-deployment-verification)
- [Monitoring](#monitoring)
- [Versioning Strategy](#versioning-strategy)
- [Shipping (Development Workflow)](#shipping-development-workflow)
- [Syncing with Upstream](#syncing-with-upstream)
- [CI/CD Pipeline](#cicd-pipeline)
- [Troubleshooting](#troubleshooting)

---

## Quick Commands

| Command             | Description                                       |
| ------------------- | ------------------------------------------------- |
| `npm run ship`      | Deploy new version (build + version + tag + push) |
| `npm run sync`      | Sync with upstream (n-ce/ytify)                   |
| `npm run dev`       | Start development server                          |
| `npm run build`     | Build production                                  |
| `npm run typecheck` | Run TypeScript type check                         |

---

## Prerequisites

Before deploying to the Netcup VPS, ensure the following are installed:

| Requirement   | Version | Purpose                        |
| ------------- | ------- | ------------------------------ |
| Node.js       | 18+     | Build toolchain                |
| npm           | 9+      | Package management             |
| Git           | 2.30+   | Version control                |
| Nginx         | 1.24+   | Reverse proxy & static serving |
| Let's Encrypt | Latest  | SSL certificates via certbot   |
| Redis         | 7+      | Optional - caching layer       |

### Server Specifications (Netcup VPS)

- **IP Address:** `100.92.200.92`
- **Domain:** `music.ml4-lab.com`
- **Document Root:** `/var/www/ytify`
- **User:** `root` (or configured deploy user)

---

## VPS Deployment to Netcup

### Quick Deploy (One-Liner)

For routine deployments when the server is already configured:

```bash
ssh root@100.92.200.92 "cd /var/www/ytify && git pull && npm ci && npm run build && systemctl reload nginx"
```

This command:

1. Connects to the Netcup VPS
2. Pulls latest changes from the repository
3. Installs dependencies (clean install)
4. Builds the production bundle
5. Reloads Nginx to clear any cached responses

### Initial Server Setup

For new installations or server migrations:

#### 1. Install System Dependencies

```bash
# Connect to server
ssh root@100.92.200.92

# Update system packages
apt update && apt upgrade -y

# Install Node.js 18+ (using NodeSource)
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Verify Node.js installation
node --version  # Should be v18.x or higher
npm --version

# Install Nginx
apt install -y nginx

# Install Git
apt install -y git

# Install certbot for SSL
apt install -y certbot python3-certbot-nginx

# Install Redis (optional - for caching)
apt install -y redis-server
systemctl enable redis-server
systemctl start redis-server
```

#### 2. Clone Repository

```bash
# Create web directory
mkdir -p /var/www

# Clone the repository
cd /var/www
git clone https://github.com/Anarqis/ytify.git
cd ytify

# Install dependencies
npm ci

# Build for production
npm run build
```

#### 3. Configure Nginx

```bash
# Copy the infrastructure nginx config as a base
cp /var/www/ytify/infrastructure/nginx/nginx.conf /etc/nginx/nginx.conf

# Or create a site-specific config
cp /var/www/ytify/ytify.nginx.conf /etc/nginx/sites-available/ytify

# Enable the site
ln -sf /etc/nginx/sites-available/ytify /etc/nginx/sites-enabled/

# Remove default site
rm -f /etc/nginx/sites-enabled/default

# Test configuration
nginx -t

# Reload Nginx
systemctl reload nginx
```

#### 4. Setup SSL with Let's Encrypt

```bash
# Obtain SSL certificate
certbot --nginx -d music.ml4-lab.com

# Verify auto-renewal is configured
certbot renew --dry-run

# Certificate renewal is automatic via systemd timer
systemctl status certbot.timer
```

#### 5. Configure Systemd Service (Optional)

For backend service management, create a systemd unit:

```bash
# Create service file
cat > /etc/systemd/system/ytify-backend.service << 'EOF'
[Unit]
Description=YTIFY Backend Service
After=network.target redis.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/ytify/backend
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/deno run --allow-net --allow-env --allow-read --allow-write src/main.ts
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start the service
systemctl daemon-reload
systemctl enable ytify-backend
systemctl start ytify-backend

# Check status
systemctl status ytify-backend
```

### Step-by-Step Deployment

For manual deployment with more control:

```bash
# 1. Connect to server
ssh root@100.92.200.92

# 2. Navigate to application directory
cd /var/www/ytify

# 3. Stash any local changes (if any)
git stash

# 4. Pull latest changes
git pull origin master

# 5. Install/update dependencies
npm ci

# 6. Run type check (optional but recommended)
npm run typecheck

# 7. Build production bundle
npm run build

# 8. Restart backend service (if running)
systemctl restart ytify-backend  # Optional

# 9. Reload Nginx
systemctl reload nginx

# 10. Verify deployment
curl -I https://music.ml4-lab.com
```

### Rollback Instructions

If a deployment causes issues:

#### Quick Rollback to Previous Commit

```bash
ssh root@100.92.200.92 "cd /var/www/ytify && git reset --hard HEAD~1 && npm ci && npm run build && systemctl reload nginx"
```

#### Rollback to Specific Version

```bash
# List recent tags
git tag --sort=-version:refname | head -10

# Rollback to specific version
ssh root@100.92.200.92 "cd /var/www/ytify && git checkout v8.2.1-ml4.0 && npm ci && npm run build && systemctl reload nginx"
```

#### Emergency Rollback Script

```bash
#!/bin/bash
# Save as: /var/www/ytify/scripts/rollback.sh

VERSION=${1:-HEAD~1}
cd /var/www/ytify

echo "Rolling back to $VERSION..."
git fetch --all --tags
git checkout $VERSION
npm ci
npm run build
systemctl reload nginx

echo "Rollback complete. Current version:"
git describe --tags --always
```

---

## Nginx Configuration

### Main Configuration

The primary Nginx configuration is located at [`infrastructure/nginx/nginx.conf`](infrastructure/nginx/nginx.conf).

Key features:

- **HTTP/3 (QUIC)** support for modern browsers
- **Brotli compression** for text assets
- **Proxy caching** with multiple cache zones
- **Rate limiting** for API protection
- **Security headers** (HSTS, CSP, X-Frame-Options)

### Configuration Files

| File                                                                                           | Purpose                  |
| ---------------------------------------------------------------------------------------------- | ------------------------ |
| [`infrastructure/nginx/nginx.conf`](infrastructure/nginx/nginx.conf)                           | Main configuration       |
| [`infrastructure/nginx/conf.d/cache.conf`](infrastructure/nginx/conf.d/cache.conf)             | Cache settings           |
| [`infrastructure/nginx/conf.d/compression.conf`](infrastructure/nginx/conf.d/compression.conf) | Gzip/Brotli settings     |
| [`infrastructure/nginx/conf.d/media.conf`](infrastructure/nginx/conf.d/media.conf)             | Media streaming settings |
| [`infrastructure/nginx/conf.d/security.conf`](infrastructure/nginx/conf.d/security.conf)       | Security headers         |

### SSL/TLS Configuration

SSL certificates are managed by Let's Encrypt:

```nginx
# Certificate paths (from nginx.conf)
ssl_certificate /etc/letsencrypt/live/music.ml4-lab.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/music.ml4-lab.com/privkey.pem;
ssl_trusted_certificate /etc/letsencrypt/live/music.ml4-lab.com/chain.pem;

# Modern TLS configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_session_cache shared:SSL:50m;
ssl_session_timeout 1d;
```

### Cache Zones

The Nginx configuration defines multiple cache zones:

| Zone           | Purpose         | Max Size | Inactive |
| -------------- | --------------- | -------- | -------- |
| `static_cache` | JS, CSS, images | 10GB     | 7 days   |
| `api_cache`    | API responses   | 1GB      | 1 hour   |
| `media_cache`  | Media streaming | 20GB     | 24 hours |
| `micro_cache`  | Dynamic content | 100MB    | 1 minute |

Create cache directories:

```bash
mkdir -p /var/cache/nginx/{static,api,media,micro}
chown -R www-data:www-data /var/cache/nginx
```

---

## Docker Deployment (Alternative)

For containerized deployment using Docker Compose:

### Quick Start

```bash
# Navigate to infrastructure directory
cd /var/www/ytify/infrastructure/docker

# Copy environment template
cp .env.production.example .env.production

# Edit with your values
nano .env.production

# Start all services
docker-compose -f docker-compose.production.yml up -d
```

### Docker Compose Services

The [`docker-compose.production.yml`](infrastructure/docker/docker-compose.production.yml) includes:

| Service    | Port            | Purpose             |
| ---------- | --------------- | ------------------- |
| nginx      | 80, 443         | Reverse proxy       |
| backend    | 3000 (internal) | Application backend |
| redis      | 6379 (internal) | Caching             |
| prometheus | 9090 (internal) | Metrics collection  |
| grafana    | 3001            | Metrics dashboard   |

### SSL Certificates with Docker

```bash
# Initial certificate generation
docker-compose -f docker-compose.production.yml run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d music.ml4-lab.com \
  --email admin@ml4-lab.com \
  --agree-tos

# Restart nginx to load certificates
docker-compose -f docker-compose.production.yml restart nginx
```

### Scaling the Backend

```bash
# Scale to 3 backend instances
docker-compose -f docker-compose.production.yml up -d --scale backend=3
```

---

## Environment Variables

### Required Variables

Copy the example file and configure:

```bash
cp infrastructure/docker/.env.production.example infrastructure/docker/.env.production
```

Reference: [`infrastructure/docker/.env.production.example`](infrastructure/docker/.env.production.example)

### Key Variables

| Variable           | Description            | Example                              |
| ------------------ | ---------------------- | ------------------------------------ |
| `NODE_ENV`         | Environment            | `production`                         |
| `PORT`             | Application port       | `3000`                               |
| `SERVER_NAME`      | Domain name            | `music.ml4-lab.com`                  |
| `REDIS_URL`        | Redis connection       | `redis://localhost:6379`             |
| `GRAFANA_PASSWORD` | Grafana admin password | `secure-password`                    |
| `SECRET_KEY`       | Signing key            | Generate with `openssl rand -hex 32` |
| `CORS_ORIGINS`     | Allowed CORS origins   | `https://music.ml4-lab.com`          |

### Generate Secrets

```bash
# Generate secret key
openssl rand -hex 32

# Generate Redis password (if needed)
openssl rand -base64 32
```

---

## Post-Deployment Verification

### Health Check Commands

```bash
# Check HTTP response
curl -I https://music.ml4-lab.com

# Check health endpoint
curl https://music.ml4-lab.com/health

# Check SSL certificate
curl -vI https://music.ml4-lab.com 2>&1 | grep -A 6 "Server certificate"

# Check Nginx status
systemctl status nginx

# Check backend logs
journalctl -u ytify-backend -f

# Test cache headers
curl -I https://music.ml4-lab.com/assets/index.js
```

### Verification Checklist

- [ ] Site loads at `https://music.ml4-lab.com`
- [ ] SSL certificate is valid (lock icon in browser)
- [ ] No console errors in browser DevTools
- [ ] Service worker registers correctly
- [ ] Audio playback works
- [ ] API endpoints respond (`/health`, `/api/v1/videos/*`)

### Common Issues and Solutions

| Issue                   | Solution                                                      |
| ----------------------- | ------------------------------------------------------------- |
| 502 Bad Gateway         | Check if backend is running: `systemctl status ytify-backend` |
| SSL errors              | Renew certificate: `certbot renew`                            |
| Build fails             | Check Node version: `node --version` (needs 18+)              |
| Permission denied       | Fix ownership: `chown -R www-data:www-data /var/www/ytify`    |
| Port already in use     | Find process: `lsof -i :3000` and kill it                     |
| Redis connection failed | Check Redis: `redis-cli ping`                                 |

### Log Locations

| Log          | Location                          |
| ------------ | --------------------------------- |
| Nginx access | `/var/log/nginx/access.log`       |
| Nginx error  | `/var/log/nginx/error.log`        |
| Backend      | `journalctl -u ytify-backend`     |
| Redis        | `/var/log/redis/redis-server.log` |
| System       | `/var/log/syslog`                 |

---

## Monitoring

### Prometheus Configuration

Reference: [`infrastructure/monitoring/prometheus.yml`](infrastructure/monitoring/prometheus.yml)

Prometheus collects metrics from:

- Nginx (via nginx-prometheus-exporter)
- Backend application
- Redis (via redis-exporter)
- Node system metrics
- Container metrics (cAdvisor)

### Grafana Dashboards

Access Grafana at `http://100.92.200.92:3001` (or configured port).

Default credentials:

- Username: `admin`
- Password: Set via `GRAFANA_PASSWORD` environment variable

### Key Metrics to Monitor

| Metric              | Query                                               | Target |
| ------------------- | --------------------------------------------------- | ------ |
| Request rate        | `sum(rate(http_requests_total[5m]))`                | -      |
| Error rate          | `sum(rate(http_requests_total{status=~"5.."}[5m]))` | < 1%   |
| Response time (P99) | `histogram_quantile(0.99, ...)`                     | < 2s   |
| Cache hit ratio     | `redis_keyspace_hits / (hits + misses)`             | > 80%  |
| Memory usage        | `container_memory_usage_bytes`                      | < 80%  |

### Manual Prometheus Setup (Non-Docker)

```bash
# Install Prometheus
apt install -y prometheus

# Copy configuration
cp /var/www/ytify/infrastructure/monitoring/prometheus.yml /etc/prometheus/prometheus.yml

# Restart Prometheus
systemctl restart prometheus
```

---

## Versioning Strategy

**Format:** `UPSTREAM_VERSION-ml4.PATCH`

| Version       | Meaning                         |
| ------------- | ------------------------------- |
| `8.2.1-ml4.0` | First sync with upstream v8.2.1 |
| `8.2.1-ml4.1` | ML4-Lab bug fix                 |
| `8.2.1-ml4.2` | ML4-Lab feature                 |
| `8.2.2-ml4.0` | Synced with upstream v8.2.2     |

This format clearly distinguishes ML4-Lab releases from upstream versions.

---

## Shipping (Development Workflow)

```bash
npm run ship
```

The script handles everything:

1. **Verifies** - Checks for uncommitted changes
2. **Builds** - Runs `npm run build` to ensure compilation
3. **Versions** - Offers bump options:
   - ML4 Patch (8.2.1-ml4.0 -> 8.2.1-ml4.1)
   - Sync with upstream (if newer version available)
   - Patch/Minor/Major bumps
4. **Tags** - Creates git commit and tag
5. **Pushes** - Sends to GitHub

**Your changes go live automatically** when pushed.

---

## Syncing with Upstream

### Automatic (GitHub Actions)

A workflow runs daily at 03:00 UTC to check for upstream changes:

- If changes found with no conflicts: Creates auto-mergeable PR
- If conflicts detected: Creates PR with conflict markers for manual review

### Manual (Local)

```bash
npm run sync
```

The sync script:

1. Stashes your uncommitted changes
2. Fetches upstream (origin/main)
3. Checks for conflicts
4. Merges if you confirm
5. Verifies build passes
6. Restores your stashed changes

**Protected ML4-Lab files** (keep our version on conflict):

- `src/styles/tokens.css`
- `src/components/NavBar.*`
- `src/components/StreamItem.*`
- `src/features/Player/*`
- `scripts/ship.js`, `scripts/sync.js`

---

## CI/CD Pipeline

### Workflows

| Workflow            | Trigger            | Purpose                            |
| ------------------- | ------------------ | ---------------------------------- |
| `ci.yml`            | Push/PR to master  | Build validation, TypeScript check |
| `upstream-sync.yml` | Daily 03:00 UTC    | Auto-sync with upstream            |
| `release.yml`       | Version tags (v\*) | Create GitHub releases             |

### Branch Strategy

```
origin (n-ce/ytify)
  main (upstream production)

fork (Anarqis/ytify)
  master (ML4-Lab production) <- auto-deploys to Netlify
  sync/* (temporary sync branches)
```

---

## Troubleshooting

### "Build failed"

```bash
npm run typecheck   # Check for TypeScript errors
npm run dev         # Test locally
```

### "Merge conflicts"

1. Open conflicting files
2. Look for `<<<<<<<` markers
3. For ML4-Lab protected files, keep our version
4. `git add <files>` then `git commit`

### "Push rejected"

```bash
git pull            # Get latest changes
npm run ship        # Try again
```

### "Sync failed"

```bash
git merge --abort   # Cancel merge
git stash pop       # Restore your changes
```

### "Connection refused on deploy"

```bash
# Check SSH connectivity
ssh -v root@100.92.200.92

# Check firewall
ufw status

# Allow SSH if needed
ufw allow 22
```

### "Nginx fails to start"

```bash
# Test configuration
nginx -t

# Check for syntax errors in logs
journalctl -u nginx --since "5 minutes ago"

# Common fix: missing modules
apt install nginx-extras libnginx-mod-http-brotli-filter
```

---

## Manual Deployment

If you prefer doing it manually:

```bash
# 1. Build
npm run build

# 2. Update version in package.json
# e.g., "version": "8.2.1-ml4.1"

# 3. Commit and tag
git add .
git commit -m "chore: release v8.2.1-ml4.1"
git tag -a v8.2.1-ml4.1 -m "Release v8.2.1-ml4.1"

# 4. Push
git push
git push --tags
```

---

## Links

- **Production:** https://music.ml4-lab.com/
- **VPS IP:** `100.92.200.92`
- **GitHub Fork:** https://github.com/Anarqis/ytify
- **Upstream:** https://github.com/n-ce/ytify
- **Grafana (if Docker):** http://100.92.200.92:3001

---

## Infrastructure Files Reference

| File                                                                                                         | Description                    |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------ |
| [`infrastructure/nginx/nginx.conf`](infrastructure/nginx/nginx.conf)                                         | Main Nginx configuration       |
| [`infrastructure/nginx/conf.d/`](infrastructure/nginx/conf.d/)                                               | Additional Nginx configs       |
| [`infrastructure/docker/docker-compose.production.yml`](infrastructure/docker/docker-compose.production.yml) | Docker Compose setup           |
| [`infrastructure/docker/.env.production.example`](infrastructure/docker/.env.production.example)             | Environment variables template |
| [`infrastructure/redis/redis.conf`](infrastructure/redis/redis.conf)                                         | Redis configuration            |
| [`infrastructure/monitoring/prometheus.yml`](infrastructure/monitoring/prometheus.yml)                       | Prometheus metrics config      |
