#!/bin/bash
# Production Deployment Script
# Run this on the production server: bash deploy-to-production.sh
# ⚠️ IMPORTANT: This script ONLY touches PRODUCTION, NOT SIT

set -e

echo "🚀 Starting PRODUCTION deployment..."
echo "⚠️  WARNING: This will deploy to PRODUCTION environment!"
echo "✅ SIT environment will NOT be touched"
echo ""

cd ~/bakong-notification-services

# Create backup before deployment (CRITICAL for production)
echo "💾 Creating backup before deployment..."
if [ -f "apps/backend/scripts/backup-database.sh" ]; then
    bash apps/backend/scripts/backup-database.sh production || echo "⚠️  Backup warning (continuing anyway...)"
else
    echo "⚠️  Backup script not found, skipping backup..."
fi

# Pull latest code from master/main branch
echo "📥 Pulling latest code from production branch..."
# Try master first, fallback to main
if git show-ref --verify --quiet refs/remotes/origin/master; then
    git reset --hard origin/master
elif git show-ref --verify --quiet refs/remotes/origin/main; then
    git reset --hard origin/main
else
    echo "❌ Error: Neither master nor main branch found!"
    exit 1
fi

# Run database migrations
echo "🔄 Running database migrations..."

# Migration 1: Update usernames to lowercase and remove spaces
if [ -f "apps/backend/scripts/update-usernames-to-lowercase.sql" ]; then
    echo "  📝 Running username update migration..."
    docker exec -i bakong-notification-services-db psql -U bkns -d bakong_notification_services < apps/backend/scripts/update-usernames-to-lowercase.sql || echo "⚠️  Username migration warning (may be normal if already applied)"
else
    echo "⚠️  Username migration script not found, skipping..."
fi

# Migration 2: Add bakongPlatform support
if [ -f "apps/backend/scripts/add-bakong-platform-migration.sql" ]; then
    echo "  📝 Running bakongPlatform migration..."
    docker exec -i bakong-notification-services-db psql -U bkns -d bakong_notification_services < apps/backend/scripts/add-bakong-platform-migration.sql || echo "⚠️  bakongPlatform migration warning (may be normal if already applied)"
else
    echo "⚠️  bakongPlatform migration script not found, skipping..."
fi

# Verify Dockerfile is correct (fix if corrupted)
echo "🔍 Verifying Dockerfile..."
if ! grep -q "npm exec -- tsc" apps/backend/Dockerfile; then
    echo "🔨 Fixing Dockerfile..."
    sed -i '/^RUN.*tsc.*tsconfig.json/d' apps/backend/Dockerfile
    sed -i '/# Build TypeScript and fix paths/a RUN npm exec -- tsc -p tsconfig.json && npm exec -- tsc-alias -p tsconfig.json' apps/backend/Dockerfile
fi

# Stop containers
echo "🛑 Stopping containers..."
docker compose -f docker-compose.production.yml down || true

# Clean up old images
echo "🧹 Cleaning up..."
docker rmi bakong-notification-services-backend 2>/dev/null || true

# Build backend
echo "🏗️  Building backend (this will take a few minutes)..."
docker compose -f docker-compose.production.yml build --no-cache backend

# Start services
echo "🚀 Starting services..."
docker compose -f docker-compose.production.yml up -d

# Wait for startup
echo "⏳ Waiting for services to initialize..."
sleep 15

# Show status
echo ""
echo "📊 Container Status:"
docker compose -f docker-compose.production.yml ps

echo ""
echo "📋 Backend Logs (last 30 lines):"
docker compose -f docker-compose.production.yml logs --tail=30 backend

echo ""
echo "✅ Production deployment complete!"
echo ""
echo "💡 To follow logs: docker compose -f docker-compose.production.yml logs -f"
echo ""

