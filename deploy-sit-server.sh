#!/bin/bash
# ============================================================================
# SIT Server Deployment Script
# ============================================================================
# Consolidated deployment script for SIT environment
# Combines: deploy-on-server.sh + migration + fixes + verification
# Usage: bash deploy-sit-server.sh
# ============================================================================

set -e

cd ~/bakong-notification-services

ENVIRONMENT="sit"
COMPOSE_FILE="docker-compose.sit.yml"
DB_CONTAINER="bakong-notification-services-db-sit"
DB_USER="bkns_sit"
DB_NAME="bakong_notification_services_sit"
BACKEND_PORT="4002"
FRONTEND_PORT="8090"
SERVER_IP="10.20.6.57"

echo "🚀 SIT Server Deployment"
echo "======================="
echo ""

# ============================================================================
# Step 1: Pre-deployment Backup
# ============================================================================
echo "💾 Step 1: Creating backup before deployment..."
if [ -f "utils-server.sh" ]; then
    bash utils-server.sh db-backup || echo "⚠️  Backup warning (continuing anyway...)"
else
    echo "⚠️  utils-server.sh not found, skipping backup..."
fi

echo ""

# ============================================================================
# Step 2: Pull Latest Code
# ============================================================================
echo "📥 Step 2: Pulling latest code..."
git fetch origin
if git show-ref --verify --quiet refs/remotes/origin/develop; then
    git reset --hard origin/develop
    echo "✅ Pulled from develop branch"
else
    echo "⚠️  develop branch not found, using current code"
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
    sleep 10
    DB_RUNNING=true
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
echo "🚀 Step 7: Starting services..."
docker compose -f "$COMPOSE_FILE" up -d

echo ""

# ============================================================================
# Step 7: Wait and Verify
# ============================================================================
echo "⏳ Step 8: Waiting for services to initialize (15 seconds)..."
sleep 15

echo ""
echo "📊 Step 9: Container Status:"
docker compose -f "$COMPOSE_FILE" ps

echo ""
echo "📋 Step 10: Backend Logs (last 30 lines):"
docker compose -f "$COMPOSE_FILE" logs --tail=30 backend

echo ""

# ============================================================================
# Step 8: Health Checks
# ============================================================================
echo "🧪 Step 11: Health Checks..."

# Check backend
if curl -s --connect-timeout 5 "http://${SERVER_IP}:${BACKEND_PORT}/api/v1/health" > /dev/null 2>&1; then
    echo "   ✅ Backend is responding"
    curl -s "http://${SERVER_IP}:${BACKEND_PORT}/api/v1/health" | head -3
else
    echo "   ⚠️  Backend not responding yet (may need more time)"
fi

# Check frontend
if curl -s --connect-timeout 5 "http://${SERVER_IP}:${FRONTEND_PORT}" > /dev/null 2>&1; then
    echo "   ✅ Frontend is responding"
else
    echo "   ⚠️  Frontend not responding yet (may need more time)"
fi

echo ""
echo "✅ SIT deployment complete!"
echo ""
echo "🌐 Access your services:"
echo "   Frontend: http://${SERVER_IP}:${FRONTEND_PORT}"
echo "   Backend:  http://${SERVER_IP}:${BACKEND_PORT}"
echo "   Health:   http://${SERVER_IP}:${BACKEND_PORT}/api/v1/health"
echo ""
echo "💡 Useful commands:"
echo "   • Follow logs: docker compose -f $COMPOSE_FILE logs -f"
echo "   • Restart: docker compose -f $COMPOSE_FILE restart"
echo "   • Stop: docker compose -f $COMPOSE_FILE down"
echo ""

