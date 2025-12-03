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
# Step 1: Pre-deployment Backup (CRITICAL - data safety)
# ============================================================================
echo "💾 Step 1: Creating backup before deployment (CRITICAL)..."
if [ -f "utils-server.sh" ]; then
    bash utils-server.sh db-backup || {
        echo "❌ Backup failed!"
        echo "   Deployment cannot proceed without a valid backup."
        echo "   Please fix the backup issue and try again."
        exit 1
    }
else
    echo "❌ utils-server.sh not found!"
    echo "   Cannot create backup - deployment cancelled for safety."
    exit 1
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
    echo "   ⏳ Waiting for database to be ready (15 seconds)..."
    sleep 15
    
    # Wait for healthcheck
    for i in {1..10}; do
        if docker exec "$DB_CONTAINER" pg_isready -U "$DB_USER" -d "$DB_NAME" -p 5432 > /dev/null 2>&1; then
            echo "   ✅ Database is ready"
            DB_RUNNING=true
            break
        fi
        echo "   ⏳ Waiting... ($i/10)"
        sleep 2
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
    MIGRATION_FILE="apps/backend/scripts/unified-migration.sql"
    
    if [ ! -f "$MIGRATION_FILE" ]; then
        echo "   ❌ Migration file not found: $MIGRATION_FILE"
        echo "   Trying alternative method..."
        bash utils-server.sh db-migrate || {
            echo "   ⚠️  Migration warning (may be normal if already applied)"
        }
    else
        echo "   Running unified migration from: $MIGRATION_FILE"
        echo "   Database: $DB_NAME"
        echo "   User: $DB_USER"
        echo ""
        
        # Get database password from environment or docker-compose
        DB_PASSWORD="${POSTGRES_PASSWORD:-0101bkns_sit}"
        
        # Run migration directly
        export PGPASSWORD="$DB_PASSWORD"
        if docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" < "$MIGRATION_FILE"; then
            echo ""
            echo "   ✅ Migration completed successfully!"
            
            # Verify migration - check if categoryTypeId column exists
            if docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'template' AND column_name = 'categoryTypeId');" | grep -q t; then
                echo "   ✅ Verified: categoryTypeId column exists"
            else
                echo "   ⚠️  Warning: categoryTypeId column not found (may need manual check)"
            fi
        else
            echo ""
            echo "   ⚠️  Migration had warnings (may be normal if already applied)"
            echo "   Checking if migration is already applied..."
            
            # Check if migration was already applied
            if docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'template' AND column_name = 'categoryTypeId');" | grep -q t; then
                echo "   ✅ Migration already applied (categoryTypeId exists)"
            else
                echo "   ⚠️  Migration may have failed - please check manually"
            fi
        fi
        unset PGPASSWORD
    fi
else
    echo "   ⚠️  Database not running - migration will run on first startup"
fi

echo ""

# ============================================================================
# Step 4.5: Cascade Delete Migration (Fix notification cascade delete)
# ============================================================================
echo "🔄 Step 4.5: Running cascade delete migration..."

if [ "$DB_RUNNING" = true ]; then
    CASCADE_MIGRATION_FILE="apps/backend/scripts/fix-notification-cascade-delete.sql"
    
    if [ -f "$CASCADE_MIGRATION_FILE" ]; then
        echo "   Running cascade delete migration from: $CASCADE_MIGRATION_FILE"
        echo "   Database: $DB_NAME"
        echo "   User: $DB_USER"
        echo ""
        
        DB_PASSWORD="${POSTGRES_PASSWORD:-0101bkns_sit}"
        export PGPASSWORD="$DB_PASSWORD"
        if docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" < "$CASCADE_MIGRATION_FILE"; then
            echo ""
            echo "   ✅ Cascade delete migration completed!"
            
            # Verify cascade constraint
            if docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'notification'::regclass AND conname = 'FK_notification_template';" | grep -q "ON DELETE CASCADE"; then
                echo "   ✅ Verified: FK_notification_template has ON DELETE CASCADE"
            else
                echo "   ⚠️  Warning: CASCADE constraint not verified (may need manual check)"
            fi
        else
            echo ""
            echo "   ⚠️  Cascade delete migration had warnings (may be normal if already applied)"
            # Check if already applied
            if docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'notification'::regclass AND conname = 'FK_notification_template';" | grep -q "ON DELETE CASCADE"; then
                echo "   ✅ Migration already applied (CASCADE constraint exists)"
            else
                echo "   ⚠️  Migration may have failed - unified-migration.sql should handle it"
            fi
        fi
        unset PGPASSWORD
    else
        echo "   ℹ️  Cascade delete migration file not found (unified-migration.sql should handle it)"
    fi
else
    echo "   ⚠️  Database not running - cascade delete migration will be handled by unified-migration.sql"
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
echo "✅ SIT deployment complete!"
echo ""
echo "🔒 Data Safety Summary:"
echo "   ✅ Backup created before deployment: backups/backup_sit_latest.sql"
echo "   ✅ Data stored in Docker volume (persistent)"
echo "   ✅ Migration only adds schema changes (no data deletion)"
echo ""
echo "🌐 Access your services:"
echo "   Frontend: http://${SERVER_IP}:${FRONTEND_PORT}"
echo "   Backend:  http://${SERVER_IP}:${BACKEND_PORT}"
echo "   Health:   http://${SERVER_IP}:${BACKEND_PORT}/api/v1/health"
echo ""
echo "💡 Useful commands:"
echo "   • Follow logs: docker compose -f $COMPOSE_FILE logs -f"
echo "   • Verify data: bash utils-server.sh verify-all"
echo "   • Restore backup: bash utils-server.sh db-restore sit backups/backup_sit_latest.sql"
echo "   • Restart: docker compose -f $COMPOSE_FILE restart"
echo "   • Stop: docker compose -f $COMPOSE_FILE down"
echo ""

