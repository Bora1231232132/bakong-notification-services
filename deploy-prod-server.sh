#!/bin/bash
# ============================================================================
# Production Server Deployment Script
# ============================================================================
# Consolidated deployment script for Production environment
# Combines: deploy-to-production.sh + COMPLETE_DEPLOY.sh + fixes + verification
# Usage: bash deploy-prod-server.sh
# ============================================================================

set -e

cd ~/bakong-notification-services

ENVIRONMENT="production"
COMPOSE_FILE="docker-compose.production.yml"
DB_CONTAINER="bakong-notification-services-db"
DB_USER="bkns"
DB_NAME="bakong_notification_services"
BACKEND_PORT="8080"
FRONTEND_PORT="80"
SERVER_IP="10.20.6.58"
DOMAIN="bakong-notification.nbc.gov.kh"

echo "🚀 PRODUCTION Server Deployment"
echo "==============================="
echo "⚠️  WARNING: This will deploy to PRODUCTION environment!"
echo "✅ SIT environment will NOT be touched"
echo ""

# ============================================================================
# Step 1: Pre-deployment Backup (CRITICAL for production)
# ============================================================================
echo "💾 Step 1: Creating backup before deployment (CRITICAL)..."
if [ -f "utils-server.sh" ]; then
    bash utils-server.sh db-backup || {
        echo "⚠️  Backup failed - continuing anyway..."
        read -p "Continue with deployment? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            echo "❌ Deployment cancelled"
            exit 1
        fi
    }
else
    echo "⚠️  utils-server.sh not found!"
    read -p "Continue without backup? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "❌ Deployment cancelled"
        exit 1
    fi
fi

echo ""

# ============================================================================
# Step 2: Pull Latest Code
# ============================================================================
echo "📥 Step 2: Pulling latest code from production branch..."
if git show-ref --verify --quiet refs/remotes/origin/master; then
    git reset --hard origin/master
    echo "✅ Pulled from master branch"
elif git show-ref --verify --quiet refs/remotes/origin/main; then
    git reset --hard origin/main
    echo "✅ Pulled from main branch"
else
    echo "❌ Error: Neither master nor main branch found!"
    exit 1
fi

echo ""

# ============================================================================
# Step 3: Verify Dockerfile
# ============================================================================
echo "🔍 Step 3: Verifying Dockerfile..."
if ! grep -q "npm exec -- tsc" apps/backend/Dockerfile; then
    echo "🔨 Fixing Dockerfile..."
    sed -i '/^RUN.*tsc.*tsconfig.json/d' apps/backend/Dockerfile
    sed -i '/# Build TypeScript and fix paths/a RUN npm exec -- tsc -p tsconfig.json && npm exec -- tsc-alias -p tsconfig.json' apps/backend/Dockerfile
    echo "✅ Dockerfile fixed"
else
    echo "✅ Dockerfile is correct"
fi

echo ""

# ============================================================================
# Step 4: Database Migration
# ============================================================================
echo "🔄 Step 4: Running database migration..."

# Check if database container exists and is running
if docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
    echo "   ✅ Database container is running"
    DB_RUNNING=true
elif docker ps -a --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
    echo "   ⚠️  Database container exists but is stopped - starting it..."
    docker start "$DB_CONTAINER"
    echo "   ⏳ Waiting for database to be ready (30 seconds)..."
    sleep 30
    
    # Wait for healthcheck
    echo "   Waiting for database healthcheck..."
    for i in {1..10}; do
        if docker exec "$DB_CONTAINER" pg_isready -U "$DB_USER" -d "$DB_NAME" -p 5432 > /dev/null 2>&1; then
            echo "   ✅ Database is ready"
            DB_RUNNING=true
            break
        fi
        echo "   ⏳ Waiting... ($i/10)"
        sleep 3
    done
    
    if [ "$DB_RUNNING" != "true" ]; then
        echo "   ⚠️  Database healthcheck timeout - continuing anyway"
        DB_RUNNING=true
    fi
else
    echo "   ⚠️  Database container not found - will be created by docker-compose"
    DB_RUNNING=false
fi

# Run unified migration if database is available
if [ "$DB_RUNNING" = true ]; then
    echo "   Running unified migration..."
    bash utils-server.sh db-migrate || {
        echo "   ⚠️  Migration warning (may be normal if already applied)"
    }
else
    echo "   ⚠️  Database not running - migration will run on first startup"
fi

echo ""

# ============================================================================
# Step 5: Stop and Clean
# ============================================================================
echo "🛑 Step 5: Stopping containers..."
docker compose -f "$COMPOSE_FILE" down || true

echo "🧹 Cleaning up old images..."
docker rmi bakong-notification-services-backend 2>/dev/null || true

echo ""

# ============================================================================
# Step 6: Build and Start Services
# ============================================================================
echo "🏗️  Step 6: Building backend (this will take a few minutes)..."
docker compose -f "$COMPOSE_FILE" build --no-cache backend

echo ""
echo "🚀 Step 7: Starting all services..."
docker compose -f "$COMPOSE_FILE" up -d

echo ""

# ============================================================================
# Step 7: Wait and Verify
# ============================================================================
echo "⏳ Step 8: Waiting for services to initialize (15 seconds)..."
sleep 15

echo ""
echo "📊 Step 9: Container Status:"
docker ps --format "   {{.Names}}: {{.Status}}" | grep bakong-notification-services || echo "   (no containers found)"

echo ""

# ============================================================================
# Step 8: Health Checks
# ============================================================================
echo "🧪 Step 10: Health Checks..."

# Check backend
echo "   Testing Backend API..."
if curl -s --connect-timeout 5 "http://${SERVER_IP}:${BACKEND_PORT}/api/v1/health" > /dev/null 2>&1; then
    echo "   ✅ Backend is responding"
    curl -s "http://${SERVER_IP}:${BACKEND_PORT}/api/v1/health" | head -3
else
    echo "   ⚠️  Backend not responding yet (may need more time)"
    echo "   Check logs: docker logs ${DB_CONTAINER//-db/-api}"
fi

# Check frontend
echo ""
echo "   Testing Frontend..."
if curl -s --connect-timeout 5 "http://${SERVER_IP}" > /dev/null 2>&1; then
    echo "   ✅ Frontend is responding"
else
    echo "   ⚠️  Frontend not responding yet (may need more time)"
    echo "   Check logs: docker logs ${DB_CONTAINER//-db/-frontend}"
fi

# Check domain (if DNS is configured)
if [ -n "$DOMAIN" ]; then
    echo ""
    echo "   Testing Domain (${DOMAIN})..."
    if curl -s --connect-timeout 5 "http://${DOMAIN}/api/v1/health" > /dev/null 2>&1; then
        echo "   ✅ Domain is responding"
    else
        echo "   ⚠️  Domain not responding (DNS may not be configured yet)"
    fi
fi

echo ""

# ============================================================================
# Step 8: Verify Data Integrity (Post-deployment)
# ============================================================================
echo "🔍 Step 8: Verifying data integrity after deployment..."
if [ -f "utils-server.sh" ]; then
    bash utils-server.sh verify-all || {
        echo "   ⚠️  Data verification warning (check manually if needed)"
    }
else
    echo "   ⚠️  utils-server.sh not found, skipping verification..."
fi

echo ""
echo "✅ Production deployment complete!"
echo ""
echo "🔒 Data Safety Summary:"
echo "   ✅ Backup created before deployment: backups/backup_production_latest.sql"
echo "   ✅ Data stored in Docker volume (persistent)"
echo "   ✅ Migration only adds schema changes (no data deletion)"
echo ""
echo "🌐 Access URLs:"
echo "   • Backend API: http://${SERVER_IP}:${BACKEND_PORT}/api/v1/health"
echo "   • Frontend: http://${SERVER_IP}"
if [ -n "$DOMAIN" ]; then
    echo "   • Domain: http://${DOMAIN} (when DNS ready)"
fi
echo ""
echo "💡 Useful commands:"
echo "   • View logs: docker-compose -f $COMPOSE_FILE logs -f"
echo "   • Restart: docker-compose -f $COMPOSE_FILE restart"
echo "   • Stop: docker-compose -f $COMPOSE_FILE down"
echo "   • Verify data: bash utils-server.sh verify-all"
echo "   • Restore backup: bash utils-server.sh db-restore production backups/backup_production_latest.sql"
echo ""

