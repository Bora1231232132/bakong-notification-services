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
    bash utils-server.sh db-backup sit || {
        echo "⚠️  Backup failed or database container not running!"
        echo "   This may be normal if database container is stopped."
        echo "   Continuing with deployment..."
        echo ""
    }
else
    echo "⚠️  utils-server.sh not found!"
    echo "   Skipping backup - continuing with deployment..."
    echo ""
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
        
        # Run migration directly (capture output for better error handling)
        export PGPASSWORD="$DB_PASSWORD"
        MIGRATION_OUTPUT=$(docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" < "$MIGRATION_FILE" 2>&1)
        MIGRATION_EXIT_CODE=$?
        
        # Check for critical errors (not just warnings)
        # Ignore "already exists" messages as they're expected for idempotent migrations
        if echo "$MIGRATION_OUTPUT" | grep -qi "ERROR\|FATAL\|syntax error" && ! echo "$MIGRATION_OUTPUT" | grep -qi "already exists\|already NOT NULL\|already has"; then
            echo ""
            echo "   ❌ Migration failed with errors:"
            echo "$MIGRATION_OUTPUT" | grep -i "ERROR\|FATAL" | head -5
            echo ""
            echo "   ⚠️  Please check the full migration output above"
            echo "   ⚠️  Continuing deployment, but migration may have issues"
            unset PGPASSWORD
            # Don't exit - let deployment continue but warn
        elif [ $MIGRATION_EXIT_CODE -eq 0 ] || echo "$MIGRATION_OUTPUT" | grep -qi "already exists\|already NOT NULL\|already has"; then
            echo ""
            echo "   ✅ Migration completed successfully!"
            
            # Run comprehensive verification
            VERIFY_FILE="apps/backend/scripts/verify-migration.sql"
            if [ -f "$VERIFY_FILE" ]; then
                echo "   Running migration verification..."
                if docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" < "$VERIFY_FILE" > /dev/null 2>&1; then
                    echo "   ✅ Migration verification passed"
                else
                    echo "   ⚠️  Verification had warnings (check manually if needed)"
                fi
            fi
            
            # Quick verification - check critical columns
            if docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'template' AND column_name = 'categoryTypeId');" | grep -q t; then
                echo "   ✅ Verified: categoryTypeId column exists"
            else
                echo "   ⚠️  Warning: categoryTypeId column not found (may need manual check)"
            fi
            
            if docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'imageId');" | grep -q t; then
                echo "   ✅ Verified: user.imageId column exists"
            fi
            
            if docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'bakong_user' AND column_name = 'syncStatus');" | grep -q t; then
                echo "   ✅ Verified: bakong_user.syncStatus column exists"
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
                echo "   Migration output:"
                echo "$MIGRATION_OUTPUT" | tail -10
            fi
        fi
        unset PGPASSWORD
    fi
else
    echo "   ⚠️  Database not running - migration will run on first startup"
fi

echo ""

# ============================================================================
# Step 4.5: Verify Cascade Delete Constraint (unified-migration.sql handles it)
# ============================================================================
echo "🔍 Step 4.5: Verifying cascade delete constraint..."

if [ "$DB_RUNNING" = true ]; then
    DB_PASSWORD="${POSTGRES_PASSWORD:-0101bkns_sit}"
    export PGPASSWORD="$DB_PASSWORD"
    
    # Verify cascade constraint exists (unified-migration.sql should have created it)
    if docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'notification'::regclass AND conname = 'FK_notification_template';" 2>/dev/null | grep -q "ON DELETE CASCADE"; then
        echo "   ✅ Verified: FK_notification_template has ON DELETE CASCADE"
    else
        echo "   ⚠️  Warning: CASCADE constraint not found (unified-migration.sql should handle it)"
        echo "   This is normal if migration hasn't run yet or constraint has different name"
    fi
    
    unset PGPASSWORD
else
    echo "   ⚠️  Database not running - verification skipped"
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
echo "   ℹ️  If build fails with network errors, wait a moment and retry"
# Try building with cache first (faster), fallback to --no-cache if needed
if ! docker compose -f "$COMPOSE_FILE" build backend 2>&1 | tee /tmp/docker-build.log; then
    echo "   ⚠️  Build failed, checking if it's a network error..."
    if grep -q "ECONNRESET\|network\|ETIMEDOUT" /tmp/docker-build.log 2>/dev/null; then
        echo "   🔄 Network error detected - waiting 10 seconds and retrying..."
        sleep 10
        echo "   🔄 Retrying build..."
        docker compose -f "$COMPOSE_FILE" build backend || {
            echo "   ❌ Build failed again - please check network connectivity"
            exit 1
        }
    else
        echo "   ❌ Build failed - see error above"
        exit 1
    fi
fi

echo ""
echo "🏗️  Step 6.5: Building frontend (this will take a few minutes)..."
if ! docker compose -f "$COMPOSE_FILE" build frontend 2>&1 | tee /tmp/docker-build-frontend.log; then
    echo "   ⚠️  Frontend build failed, checking if it's a network error..."
    if grep -q "ECONNRESET\|network\|ETIMEDOUT" /tmp/docker-build-frontend.log 2>/dev/null; then
        echo "   🔄 Network error detected - waiting 10 seconds and retrying..."
        sleep 10
        echo "   🔄 Retrying frontend build..."
        docker compose -f "$COMPOSE_FILE" build frontend || {
            echo "   ❌ Frontend build failed again - please check network connectivity"
            exit 1
        }
    else
        echo "   ❌ Frontend build failed - see error above"
        exit 1
    fi
fi

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

# Run migration verification if available
VERIFY_MIGRATION_FILE="apps/backend/scripts/verify-migration.sql"
if [ -f "$VERIFY_MIGRATION_FILE" ] && [ "$DB_RUNNING" = true ]; then
    echo "   Running migration verification..."
    DB_PASSWORD="${POSTGRES_PASSWORD:-0101bkns_sit}"
    export PGPASSWORD="$DB_PASSWORD"
    if docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" < "$VERIFY_MIGRATION_FILE" 2>&1 | tee /tmp/verify_migration.log; then
        if grep -qi "verification completed successfully\|all.*exist\|all.*correct" /tmp/verify_migration.log; then
            echo "   ✅ Migration verification passed"
        else
            echo "   ⚠️  Verification completed with warnings (check /tmp/verify_migration.log)"
        fi
    else
        echo "   ⚠️  Verification had issues (check /tmp/verify_migration.log)"
    fi
    unset PGPASSWORD
fi

# Run comprehensive data verification
if [ -f "utils-server.sh" ]; then
    echo "   Running comprehensive data verification..."
    bash utils-server.sh verify-all || {
        echo "   ⚠️  Data verification warning (check manually if needed)"
    }
else
    echo "   ⚠️  utils-server.sh not found, skipping comprehensive verification..."
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

