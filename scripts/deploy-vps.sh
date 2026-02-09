#!/bin/bash

# VPS Deployment Script for Music Ytify
# usage: ./scripts/deploy-vps.sh

set -e

echo "🚀 Starting deployment to VPS..."

# Directories
PROD_DIR="/var/www/music-production"
DEV_DIR="/var/www/ytify-development"
BACKEND_DIR="/var/www/ytify-backend"

# Ensure directories exist
mkdir -p $PROD_DIR
mkdir -p $DEV_DIR
mkdir -p $BACKEND_DIR

# ------------------------------------------------------------------------------
# 1. Update Project
# ------------------------------------------------------------------------------
echo "📦 Updating project code..."
git pull origin master

# ------------------------------------------------------------------------------
# 2. Build Production (music.ml4-lab.com)
# ------------------------------------------------------------------------------
echo "🏗️ Building Production..."
npm ci
npm run build:prod
# Copy build to production directory
rsync -av --delete dist/ $PROD_DIR/current/

# ------------------------------------------------------------------------------
# 3. Build Development (ytify.ml4-lab.com)
# ------------------------------------------------------------------------------
echo "🏗️ Building Development..."
npm run build:dev
# Copy build to development directory
rsync -av --delete dist/ $DEV_DIR/current/

# ------------------------------------------------------------------------------
# 4. Configure Backend (Deno)
# ------------------------------------------------------------------------------
echo "⚙️ Configuring Backend..."
# Assuming backend runs as a service, we restart it
if systemctl is-active --quiet ytify-backend; then
    systemctl restart ytify-backend
    echo "✅ Backend restarted"
else
    echo "⚠️ Backend service 'ytify-backend' not found or not running."
    echo "   Please adhere to backend/README.md for setup."
fi

# ------------------------------------------------------------------------------
# 5. Connect Nginx
# ------------------------------------------------------------------------------
echo "network Configuring Nginx..."
cp infrastructure/nginx/music.ml4-lab.conf /etc/nginx/sites-available/
cp infrastructure/nginx/ytify.ml4-lab.conf /etc/nginx/sites-available/

ln -sf /etc/nginx/sites-available/music.ml4-lab.conf /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/ytify.ml4-lab.conf /etc/nginx/sites-enabled/

# Test and reload Nginx
nginx -t && systemctl reload nginx

echo "✅ Deployment Complete!"
echo "   Production: https://music.ml4-lab.com"
echo "   Development: https://ytify.ml4-lab.com"
