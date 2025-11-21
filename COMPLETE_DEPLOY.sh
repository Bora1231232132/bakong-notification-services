#!/bin/bash
# Complete Deployment Script
# This script handles the full deployment flow in the correct order
# Usage: bash COMPLETE_DEPLOY.sh

set -e

cd ~/bakong-notification-services

echo "🚀 Complete Deployment Process"
echo "=============================="
echo ""

# Step 1: Pull latest code
echo "📥 Step 1: Pulling latest code..."
git pull origin master || {
    echo "⚠️  Git pull failed - continuing with existing code"
}

echo ""

# Step 2: Check if database is running
echo "🔍 Step 2: Checking database status..."
DB_CONTAINER="bakong-notification-services-db"

if docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
    echo "   ✅ Database container is running"
    DB_RUNNING=true
else
    echo "   ⚠️  Database container is not running"
    echo "   💡 Will start it in Step 4"
    DB_RUNNING=false
fi

echo ""

# Step 3: Run migration (if database is running, or start it first)
echo "🔄 Step 3: Running database migration..."

if [ "$DB_RUNNING" = false ]; then
    echo "   Starting database first..."
    docker-compose -f docker-compose.production.yml up -d db
    
    echo "   ⏳ Waiting for database to be ready (30 seconds)..."
    sleep 30
    
    # Wait for healthcheck
    echo "   Waiting for database healthcheck..."
    for i in {1..10}; do
        if docker exec "$DB_CONTAINER" pg_isready -U bkns -d bakong_notification_services -p 5432 > /dev/null 2>&1; then
            echo "   ✅ Database is ready"
            break
        fi
        echo "   ⏳ Waiting... ($i/10)"
        sleep 3
    done
fi

# Run migration
echo "   Running unified migration..."
bash apps/backend/scripts/run-migration.sh production || {
    echo "   ⚠️  Migration failed - check logs above"
    echo "   Continuing anyway..."
}

echo ""

# Step 4: Start/restart all services
echo "🚀 Step 4: Starting all services..."
docker-compose -f docker-compose.production.yml up -d --build

echo ""

# Step 5: Wait for services to be ready
echo "⏳ Step 5: Waiting for services to be ready (15 seconds)..."
sleep 15

echo ""

# Step 6: Verify services
echo "✅ Step 6: Verifying services..."
echo ""

echo "📋 Container Status:"
docker ps --format "   {{.Names}}: {{.Status}}" | grep bakong-notification-services || echo "   (no containers found)"

echo ""

echo "🧪 Testing Backend API:"
if curl -s --connect-timeout 5 http://10.20.6.58/api/v1/health > /dev/null 2>&1; then
    echo "   ✅ Backend is responding"
    curl -s http://10.20.6.58/api/v1/health | head -3
else
    echo "   ⚠️  Backend not responding yet (may need more time)"
    echo "   Check logs: docker logs bakong-notification-services-api"
fi

echo ""

echo "🧪 Testing Frontend:"
if curl -s --connect-timeout 5 http://10.20.6.58 > /dev/null 2>&1; then
    echo "   ✅ Frontend is responding"
else
    echo "   ⚠️  Frontend not responding yet (may need more time)"
    echo "   Check logs: docker logs bakong-notification-services-frontend"
fi

echo ""
echo "✅ Deployment process completed!"
echo ""
echo "🌐 Access URLs:"
echo "   • Backend API: http://10.20.6.58:8080/api/v1/health"
echo "   • Frontend: http://10.20.6.58"
echo "   • Domain: http://bakong-notification.nbc.gov.kh (when DNS ready)"
echo ""
echo "💡 Useful commands:"
echo "   • View logs: docker-compose -f docker-compose.production.yml logs -f"
echo "   • Restart: docker-compose -f docker-compose.production.yml restart"
echo "   • Stop: docker-compose -f docker-compose.production.yml down"

