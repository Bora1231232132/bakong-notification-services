#!/bin/bash
# ============================================================================
# Server Utilities Script
# ============================================================================
# Consolidated utility scripts for server management
# Combines: database setup, data migration, verification, SSL setup, fixes
# Usage: bash utils-server.sh [command]
# ============================================================================

set -e

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR" && pwd)"
cd "$PROJECT_ROOT" 2>/dev/null || cd ~/bakong-notification-services 2>/dev/null || {
    echo "❌ Error: Cannot find project directory"
    exit 1
}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================================================
# Internal Helper Functions (Embedded Logic)
# ============================================================================

# Get database config for environment
_get_db_config() {
    local env="$1"
    case "$env" in
        dev|development)
            DB_CONTAINER="bakong-notification-services-db-dev"
            DB_NAME="bakong_notification_services_dev"
            DB_USER="bkns_dev"
            DB_PASSWORD="dev"
            ;;
        sit|staging)
            DB_CONTAINER="bakong-notification-services-db-sit"
            DB_NAME="bakong_notification_services_sit"
            DB_USER="bkns_sit"
            DB_PASSWORD="0101bkns_sit"
            ;;
        production|prod)
            DB_CONTAINER="bakong-notification-services-db"
            DB_NAME="bakong_notification_services"
            DB_USER="bkns"
            DB_PASSWORD="010110bkns"
            ;;
        *)
            echo "❌ Unknown environment: $env"
            return 1
            ;;
    esac
}

# Run migration internally
_run_migration_internal() {
    local env="${1:-production}"
    _get_db_config "$env" || return 1
    
    echo "🔄 Running Unified Database Migration"
    echo "======================================"
    echo ""
    echo "📋 Configuration:"
    echo "   Environment: $env"
    echo "   Container: $DB_CONTAINER"
    echo "   Database: $DB_NAME"
    echo "   User: $DB_USER"
    echo ""
    
    # Check if container exists and is running
    if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
        echo "❌ Database container '$DB_CONTAINER' is not running!"
        echo ""
        echo "   Available containers:"
        docker ps --format "   - {{.Names}}" | grep -i bakong || echo "   (none found)"
        echo ""
        echo "💡 Start the database first:"
        echo "   docker-compose -f docker-compose.production.yml up -d db"
        return 1
    fi
    
    echo "✅ Database container is running"
    echo ""
    
    # Check if migration file exists
    MIGRATION_FILE="apps/backend/migrations/unified-migration.sql"
    if [ ! -f "$MIGRATION_FILE" ]; then
        echo "❌ Migration file not found: $MIGRATION_FILE"
        return 1
    fi
    
    echo "📝 Running migration..."
    echo ""
    
    # Run migration
    docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" < "$MIGRATION_FILE"
    
    EXIT_CODE=$?
    
    if [ $EXIT_CODE -eq 0 ]; then
        echo ""
        echo "✅ Migration completed successfully!"
    else
        echo ""
        echo "❌ Migration failed with exit code: $EXIT_CODE"
        return $EXIT_CODE
    fi
}

# Backup database internally
_backup_database_internal() {
    local env="${1:-staging}"
    _get_db_config "$env" || return 1
    
    BACKUP_DIR="backups"
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    mkdir -p "$BACKUP_DIR"
    
    BACKUP_FILE="$BACKUP_DIR/backup_${env}_${TIMESTAMP}.sql"
    BACKUP_FILE_LATEST="$BACKUP_DIR/backup_${env}_latest.sql"
    
    echo "💾 Starting database backup..."
    echo "📊 Environment: $env"
    echo "🗄️  Database: $DB_NAME"
    echo "📁 Backup file: $BACKUP_FILE"
    echo ""
    
    if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
        echo "❌ Docker container not found: $DB_CONTAINER"
        return 1
    fi
    
    echo "📤 Creating backup (this may take a while for large databases)..."
    echo ""
    
    export PGPASSWORD="$DB_PASSWORD"
    docker exec "$DB_CONTAINER" pg_dump \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --clean \
        --if-exists \
        --create \
        --format=plain \
        --no-owner \
        --no-privileges \
        > "$BACKUP_FILE"
    unset PGPASSWORD
    
    # Also create a latest copy
    cp "$BACKUP_FILE" "$BACKUP_FILE_LATEST"
    
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    
    echo ""
    echo "✅ Backup completed successfully!"
    echo "📄 Backup file: $BACKUP_FILE"
    echo "📊 File size: $FILE_SIZE"
}

# Restore database internally
_restore_database_internal() {
    local env="${1:-staging}"
    local backup_file="$2"
    
    if [ -z "$backup_file" ] || [ ! -f "$backup_file" ]; then
        echo "❌ Error: Backup file not found: $backup_file"
        return 1
    fi
    
    _get_db_config "$env" || return 1
    
    echo "🔄 Starting database restore..."
    echo "📊 Environment: $env"
    echo "📄 Backup file: $backup_file"
    echo "🗄️  Database: $DB_NAME"
    echo "⚠️  WARNING: This will replace all existing data!"
    echo ""
    read -p "Are you sure you want to continue? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        echo "❌ Restore cancelled by user"
        return 1
    fi
    
    if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
        echo "❌ Docker container not found: $DB_CONTAINER"
        return 1
    fi
    
    echo ""
    echo "🔄 Restoring database (this may take a while)..."
    echo ""
    
    export PGPASSWORD="$DB_PASSWORD"
    docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d postgres < "$backup_file"
    unset PGPASSWORD
    
    echo ""
    echo "✅ Database restore completed!"
}

# Update usernames internally
_update_usernames_internal() {
    local env="${1:-staging}"
    _get_db_config "$env" || return 1
    
    SQL_FILE="apps/backend/scripts/update-usernames-to-lowercase.sql"
    
    if [ ! -f "$SQL_FILE" ]; then
        echo "❌ Error: SQL migration file not found: $SQL_FILE"
        return 1
    fi
    
    echo "🔄 Starting username update migration..."
    echo "📊 Environment: $env"
    echo "🗄️  Database: $DB_NAME"
    echo ""
    echo "⚠️  WARNING: This will update all usernames to lowercase and remove spaces!"
    echo "   Example: 'So Theany' -> 'sotheany'"
    echo ""
    read -p "Continue? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        echo "❌ Migration cancelled by user"
        return 1
    fi
    
    echo ""
    echo "🔄 Running migration..."
    echo ""
    
    if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
        echo "❌ Docker container not found: $DB_CONTAINER"
        return 1
    fi
    
    export PGPASSWORD="$DB_PASSWORD"
    docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" < "$SQL_FILE"
    unset PGPASSWORD
    
    echo ""
    echo "✅ Migration completed!"
}

# Verify data internally
_verify_data_internal() {
    local env="${1:-staging}"
    _get_db_config "$env" || return 1
    
    echo "🔍 Verifying data after restart..."
    echo "📊 Environment: $env"
    echo "🗄️  Database: $DB_NAME"
    echo ""
    
    if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
        echo "❌ Docker container not found: $DB_CONTAINER"
        return 1
    fi
    
    VERIFY_SQL=$(cat <<'EOF'
SELECT 
    'Users' as table_name,
    COUNT(*) as record_count
FROM "user"
WHERE "deletedAt" IS NULL
UNION ALL
SELECT 'Templates', COUNT(*) FROM template WHERE "deletedAt" IS NULL
UNION ALL
SELECT 'Template Translations', COUNT(*) FROM template_translation
UNION ALL
SELECT 'Images', COUNT(*) FROM image
UNION ALL
SELECT 'Images with Data', COUNT(*) FROM image WHERE file IS NOT NULL AND LENGTH(file) > 0
UNION ALL
SELECT 'Template Translations with Images', COUNT(*) FROM template_translation WHERE "imageId" IS NOT NULL AND "imageId" != ''
UNION ALL
SELECT 'Notifications', COUNT(*) FROM notification
UNION ALL
SELECT 'Bakong Users', COUNT(*) FROM bakong_user;
EOF
)
    
    export PGPASSWORD="$DB_PASSWORD"
    echo "$VERIFY_SQL" | docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME"
    unset PGPASSWORD
    
    echo ""
    echo "✅ Data verification completed!"
}

# ============================================================================
# Helper Functions
# ============================================================================

show_help() {
    echo "Server Utilities Script"
    echo "======================"
    echo ""
    echo "Usage: bash utils-server.sh [command]"
    echo ""
    echo "Commands:"
    echo "  db-setup-prod      - Setup production database (create tables, run migrations)"
    echo "  db-setup-sit       - Setup SIT database (create tables, run migrations)"
    echo "  db-migrate         - Run database migration (auto-detects environment)"
    echo "  db-backup          - Backup database (auto-detects environment)"
    echo "  db-restore         - Restore database from backup"
    echo "  update-usernames   - Update usernames to lowercase (data migration)"
    echo "  copy-sit-to-prod   - Copy SIT data to Production (with confirmation)"
    echo "  verify-connection  - Check and fix connection issues"
    echo "  verify-502         - Verify and fix 502 Bad Gateway errors"
    echo "  verify-all         - Comprehensive verification (all checks in one)"
    echo "  verify-schema      - Verify database schema matches entities (uses verify-all.sql)"
    echo "  verify-images      - Verify image associations in templates (uses verify-all.sql)"
    echo "  verify-data        - Verify data after restart"
    echo "  check-tables       - Check all database tables (uses verify-all.sql)"
    echo "  associate-images   - Associate images to templates"
    echo "  restore-images     - Restore image associations"
    echo "  setup-ssl          - Setup HTTPS/SSL certificates"
    echo "  check-dns          - Check DNS configuration"
    echo "  check-ssl          - Check SSL certificate status"
    echo "  fix-missing-cols   - Fix missing database columns"
    echo "  restart-services   - Restart all services"
    echo "  show-status        - Show container and service status"
    echo "  show-logs          - Show recent logs from all services"
    echo ""
}

# ============================================================================
# Database Setup Functions
# ============================================================================

db_setup_prod() {
    echo "🔨 Setting up Production Database..."
    
    DB_CONTAINER="bakong-notification-services-db"
    DB_USER="bkns"
    DB_NAME="bakong_notification_services"
    
    # Find container
    CONTAINER=$(docker ps -a --format '{{.Names}}' | grep -E "^${DB_CONTAINER}$" | head -1)
    
    if [ -z "$CONTAINER" ]; then
        echo "❌ Production database container not found!"
        echo "   Please start it first: docker-compose -f docker-compose.production.yml up -d db"
        exit 1
    fi
    
    # Start if stopped
    if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
        echo "   Starting database container..."
        docker start "$DB_CONTAINER"
        sleep 10
    fi
    
    echo "   Running unified migration..."
    _run_migration_internal production
    
    echo "✅ Production database setup complete!"
}

db_setup_sit() {
    echo "🔨 Setting up SIT Database..."
    
    DB_CONTAINER="bakong-notification-services-db-sit"
    DB_USER="bkns_sit"
    DB_NAME="bakong_notification_services_sit"
    
    # Find container
    CONTAINER=$(docker ps -a --format '{{.Names}}' | grep -E "^${DB_CONTAINER}$" | head -1)
    
    if [ -z "$CONTAINER" ]; then
        echo "❌ SIT database container not found!"
        echo "   Please start it first: docker-compose -f docker-compose.sit.yml up -d db"
        exit 1
    fi
    
    # Start if stopped
    if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
        echo "   Starting database container..."
        docker start "$DB_CONTAINER"
        sleep 10
    fi
    
    echo "   Running unified migration..."
    _run_migration_internal sit
    
    echo "✅ SIT database setup complete!"
}

db_migrate() {
    echo "🔄 Running Database Migration..."
    
    # Auto-detect environment
    if docker ps --format '{{.Names}}' | grep -q "^bakong-notification-services-db$"; then
        ENV="production"
    elif docker ps --format '{{.Names}}' | grep -q "bakong-notification-services-db-sit"; then
        ENV="sit"
    elif docker ps --format '{{.Names}}' | grep -q "bakong-notification-services-db-dev"; then
        ENV="dev"
    else
        echo "⚠️  Could not detect environment, defaulting to production"
        ENV="production"
    fi
    
    _run_migration_internal "$ENV"
}

db_backup() {
    echo "💾 Backing up database..."
    
    # Auto-detect environment
    if docker ps --format '{{.Names}}' | grep -q "^bakong-notification-services-db$"; then
        ENV="production"
    elif docker ps --format '{{.Names}}' | grep -q "bakong-notification-services-db-sit"; then
        ENV="staging"
    else
        echo "❌ No database container found!"
        exit 1
    fi
    
    _backup_database_internal "$ENV"
}

db_restore() {
    echo "📥 Restoring database from backup..."
    
    if [ -z "$2" ]; then
        echo "❌ Error: Backup file not specified"
        echo ""
        echo "Usage: bash utils-server.sh db-restore [backup-file]"
        echo ""
        echo "Examples:"
        echo "  bash utils-server.sh db-restore backups/backup_staging_20250101_120000.sql"
        echo "  bash utils-server.sh db-restore backups/backup_staging_latest.sql"
        echo ""
        exit 1
    fi
    
    BACKUP_FILE="$2"
    
    # Auto-detect environment
    if docker ps --format '{{.Names}}' | grep -q "^bakong-notification-services-db$"; then
        ENV="production"
    elif docker ps --format '{{.Names}}' | grep -q "bakong-notification-services-db-sit"; then
        ENV="staging"
    else
        echo "❌ No database container found!"
        exit 1
    fi
    
    _restore_database_internal "$ENV" "$BACKUP_FILE"
}

update_usernames() {
    echo "👤 Updating usernames to lowercase..."
    
    # Auto-detect environment
    if docker ps --format '{{.Names}}' | grep -q "^bakong-notification-services-db$"; then
        ENV="production"
    elif docker ps --format '{{.Names}}' | grep -q "bakong-notification-services-db-sit"; then
        ENV="staging"
    else
        echo "❌ No database container found!"
        exit 1
    fi
    
    _update_usernames_internal "$ENV"
}

# ============================================================================
# Data Migration Functions
# ============================================================================

copy_sit_to_prod() {
    echo "📋 Copying SIT Data to Production"
    echo "================================"
    echo ""
    echo "⚠️  WARNING: This will REPLACE all production data with SIT data!"
    read -p "Type 'YES' to continue: " confirm
    
    if [ "$confirm" != "YES" ]; then
        echo "❌ Operation cancelled"
        exit 1
    fi
    
    bash COPY_SIT_TO_PRODUCTION_NOW.sh
}

# ============================================================================
# Verification Functions
# ============================================================================

verify_connection() {
    echo "🔍 Checking Service Status and Connections..."
    echo "=============================================="
    echo ""
    
    echo "📋 Container Status:"
    docker ps -a | grep bakong-notification-services || echo "   No containers found"
    
    echo ""
    echo "📋 Testing Backend (localhost:8080)..."
    if curl -s --connect-timeout 5 http://localhost:8080/api/v1/health > /dev/null 2>&1; then
        echo "   ✅ Backend is accessible"
        curl -s http://localhost:8080/api/v1/health | head -3
    else
        echo "   ❌ Backend NOT accessible"
        echo "   Checking logs..."
        docker logs --tail 30 bakong-notification-services-api 2>/dev/null | tail -10 || echo "   Container not found"
    fi
    
    echo ""
    echo "📋 Testing Frontend (localhost)..."
    if curl -s --connect-timeout 5 http://localhost/api/v1/health > /dev/null 2>&1; then
        echo "   ✅ Frontend proxy is working"
    else
        echo "   ❌ Frontend NOT accessible"
        echo "   Checking logs..."
        docker logs --tail 30 bakong-notification-services-frontend 2>/dev/null | tail -10 || echo "   Container not found"
    fi
    
    echo ""
    echo "💡 If services are not accessible:"
    echo "   1. Check if containers are running: docker ps"
    echo "   2. Restart services: bash utils-server.sh restart-services"
    echo "   3. Check logs: bash utils-server.sh show-logs"
}

verify_502() {
    echo "🔍 Verifying and Fixing 502 Bad Gateway Error..."
    echo "================================================"
    echo ""
    
    DB_CONTAINER="bakong-notification-services-db"
    
    # Check database columns
    echo "📋 Step 1: Checking database columns..."
    docker exec -i "$DB_CONTAINER" psql -U bkns -d bakong_notification_services -c "
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns 
    WHERE table_name = 'template' 
    AND column_name IN ('createdBy', 'updatedBy', 'publishedBy')
    ORDER BY column_name;
    " || {
        echo "   ⚠️  Columns missing! Running migration..."
        _run_migration_internal production
    }
    
    echo ""
    echo "📋 Step 2: Checking backend container..."
    if docker ps | grep -q bakong-notification-services-api; then
        echo "   ✅ Backend container is running"
    else
        echo "   ❌ Backend container not running!"
        echo "   Starting services..."
        docker-compose -f docker-compose.production.yml up -d
        sleep 15
    fi
    
    echo ""
    echo "📋 Step 3: Testing backend health..."
    if curl -s http://localhost:8080/api/v1/health > /dev/null; then
        echo "   ✅ Backend is responding!"
        curl -s http://localhost:8080/api/v1/health | head -3
    else
        echo "   ⚠️  Backend not responding - restarting..."
        docker restart bakong-notification-services-api
        sleep 30
        if curl -s http://localhost:8080/api/v1/health > /dev/null; then
            echo "   ✅ Backend is now responding!"
        else
            echo "   ❌ Backend still not responding"
            echo "   Check logs: docker logs bakong-notification-services-api"
        fi
    fi
    
    echo ""
    echo "📋 Step 4: Restarting frontend..."
    docker restart bakong-notification-services-frontend
    sleep 10
    
    echo ""
    echo "✅ Verification complete!"
}

verify_all() {
    echo "🔍 Running Comprehensive Database Verification..."
    
    # Auto-detect environment
    if docker ps --format '{{.Names}}' | grep -q "^bakong-notification-services-db$"; then
        ENV="production"
    elif docker ps --format '{{.Names}}' | grep -q "bakong-notification-services-db-sit"; then
        ENV="sit"
    elif docker ps --format '{{.Names}}' | grep -q "bakong-notification-services-db-dev"; then
        ENV="dev"
    else
        echo "❌ No database container found!"
        echo "   Looking for: bakong-notification-services-db (prod)"
        echo "   Or: bakong-notification-services-db-sit (SIT)"
        echo "   Or: bakong-notification-services-db-dev (dev)"
        echo ""
        echo "   To start dev database: docker-compose up -d db"
        exit 1
    fi
    
    _get_db_config "$ENV" || exit 1
    
    SQL_FILE="apps/backend/scripts/verify-all.sql"
    if [ ! -f "$SQL_FILE" ]; then
        echo "❌ Verification script not found!"
        exit 1
    fi
    
    docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" < "$SQL_FILE"
}

verify_schema() {
    echo "🔍 Verifying Database Schema (using verify-all.sql)..."
    verify_all
}

verify_images() {
    echo "🖼️  Verifying Image Associations (using verify-all.sql)..."
    verify_all
}

verify_data() {
    echo "📊 Verifying Data After Restart..."
    
    # Auto-detect environment
    if docker ps --format '{{.Names}}' | grep -q "^bakong-notification-services-db$"; then
        ENV="production"
    elif docker ps --format '{{.Names}}' | grep -q "bakong-notification-services-db-sit"; then
        ENV="staging"
    else
        echo "❌ No database container found!"
        exit 1
    fi
    
    _verify_data_internal "$ENV"
}

check_tables() {
    echo "📋 Checking All Database Tables (using verify-all.sql)..."
    verify_all
}

associate_images() {
    echo "🔗 Associating Images to Templates..."
    
    # Auto-detect environment
    if docker ps --format '{{.Names}}' | grep -q "^bakong-notification-services-db$"; then
        ENV="production"
    elif docker ps --format '{{.Names}}' | grep -q "bakong-notification-services-db-sit"; then
        ENV="sit"
    else
        echo "❌ No database container found!"
        exit 1
    fi
    
    _get_db_config "$ENV" || exit 1
    
    SQL_FILE="apps/backend/scripts/associate-images-to-templates.sql"
    if [ ! -f "$SQL_FILE" ]; then
        echo "❌ Image association script not found!"
        exit 1
    fi
    
    echo "   This will show available images and templates needing images..."
    docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" < "$SQL_FILE"
}

restore_images() {
    echo "🔄 Restoring Image Associations..."
    
    # Auto-detect environment
    if docker ps --format '{{.Names}}' | grep -q "^bakong-notification-services-db$"; then
        ENV="production"
    elif docker ps --format '{{.Names}}' | grep -q "bakong-notification-services-db-sit"; then
        ENV="sit"
    else
        echo "❌ No database container found!"
        exit 1
    fi
    
    _get_db_config "$ENV" || exit 1
    
    SQL_FILE="apps/backend/scripts/restore-images-to-templates.sql"
    if [ ! -f "$SQL_FILE" ]; then
        echo "❌ Image restoration script not found!"
        exit 1
    fi
    
    docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" < "$SQL_FILE"
}

# ============================================================================
# SSL/HTTPS Functions
# ============================================================================

setup_ssl() {
    echo "🔒 Setting up HTTPS/SSL..."
    if [ -f "SETUP_HTTPS_DOMAIN.sh" ]; then
        bash SETUP_HTTPS_DOMAIN.sh
    else
        echo "❌ SSL setup script not found!"
        exit 1
    fi
}

check_dns() {
    echo "🔍 Checking DNS Configuration..."
    DOMAIN="bakong-notification.nbc.gov.kh"
    
    echo "   Domain: $DOMAIN"
    echo ""
    echo "   DNS Lookup:"
    nslookup "$DOMAIN" 2>/dev/null || dig "$DOMAIN" 2>/dev/null || echo "   ⚠️  DNS lookup failed"
    
    echo ""
    echo "   Testing HTTP connection..."
    if curl -s --connect-timeout 5 "http://${DOMAIN}/api/v1/health" > /dev/null 2>&1; then
        echo "   ✅ Domain is accessible via HTTP"
    else
        echo "   ⚠️  Domain not accessible via HTTP"
    fi
    
    echo ""
    echo "   Testing HTTPS connection..."
    if curl -k -s --connect-timeout 5 "https://${DOMAIN}/api/v1/health" > /dev/null 2>&1; then
        echo "   ✅ Domain is accessible via HTTPS"
    else
        echo "   ⚠️  Domain not accessible via HTTPS"
    fi
}

check_ssl() {
    echo "🔒 Checking SSL Certificate Status..."
    DOMAIN="bakong-notification.nbc.gov.kh"
    CERT_DIR="/etc/letsencrypt/live/${DOMAIN}"
    
    if [ -f "${CERT_DIR}/fullchain.pem" ]; then
        echo "   ✅ Certificate found at: ${CERT_DIR}/fullchain.pem"
        echo ""
        echo "   Certificate Details:"
        openssl x509 -in "${CERT_DIR}/fullchain.pem" -text -noout 2>/dev/null | grep -E "Subject:|Issuer:|Not Before|Not After" || echo "   ⚠️  Could not read certificate"
    else
        echo "   ⚠️  Certificate not found at: ${CERT_DIR}/fullchain.pem"
        echo "   Checking alternative locations..."
        if [ -f "/etc/ssl/certs/${DOMAIN}.crt" ]; then
            echo "   ✅ Found certificate at: /etc/ssl/certs/${DOMAIN}.crt"
        else
            echo "   ❌ No certificate found"
        fi
    fi
}

# ============================================================================
# Fix Functions
# ============================================================================

fix_missing_cols() {
    echo "🔧 Fixing Missing Database Columns..."
    _run_migration_internal production
    echo "✅ Migration completed - columns should now exist"
}

# ============================================================================
# Service Management Functions
# ============================================================================

restart_services() {
    echo "🔄 Restarting all services..."
    
    # Auto-detect environment
    if docker ps --format '{{.Names}}' | grep -q "^bakong-notification-services-db$"; then
        COMPOSE_FILE="docker-compose.production.yml"
    elif docker ps --format '{{.Names}}' | grep -q "bakong-notification-services-db-sit"; then
        COMPOSE_FILE="docker-compose.sit.yml"
    else
        echo "❌ No containers found!"
        exit 1
    fi
    
    docker-compose -f "$COMPOSE_FILE" restart
    echo "✅ Services restarted"
}

show_status() {
    echo "📊 Container and Service Status"
    echo "==============================="
    echo ""
    
    echo "Containers:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep bakong-notification-services || echo "   No containers found"
    
    echo ""
    echo "Service Health:"
    
    # Backend
    if curl -s --connect-timeout 2 http://localhost:8080/api/v1/health > /dev/null 2>&1; then
        echo "   ✅ Backend: Healthy"
    else
        echo "   ❌ Backend: Not responding"
    fi
    
    # Frontend
    if curl -s --connect-timeout 2 http://localhost/api/v1/health > /dev/null 2>&1; then
        echo "   ✅ Frontend: Healthy"
    else
        echo "   ❌ Frontend: Not responding"
    fi
}

show_logs() {
    echo "📋 Recent Logs from All Services"
    echo "=============================="
    echo ""
    
    # Auto-detect environment
    if docker ps --format '{{.Names}}' | grep -q "^bakong-notification-services-db$"; then
        COMPOSE_FILE="docker-compose.production.yml"
    elif docker ps --format '{{.Names}}' | grep -q "bakong-notification-services-db-sit"; then
        COMPOSE_FILE="docker-compose.sit.yml"
    else
        echo "❌ No containers found!"
        exit 1
    fi
    
    echo "Backend Logs (last 20 lines):"
    docker-compose -f "$COMPOSE_FILE" logs --tail=20 backend
    echo ""
    echo "Frontend Logs (last 20 lines):"
    docker-compose -f "$COMPOSE_FILE" logs --tail=20 frontend
    echo ""
    echo "Database Logs (last 10 lines):"
    docker-compose -f "$COMPOSE_FILE" logs --tail=10 db
}

# ============================================================================
# Main Command Router
# ============================================================================

case "${1:-}" in
    db-setup-prod)
        db_setup_prod
        ;;
    db-setup-sit)
        db_setup_sit
        ;;
    db-migrate)
        db_migrate
        ;;
    db-backup)
        db_backup
        ;;
    db-restore)
        db_restore "$@"
        ;;
    update-usernames)
        update_usernames
        ;;
    copy-sit-to-prod)
        copy_sit_to_prod
        ;;
    verify-connection)
        verify_connection
        ;;
    verify-502)
        verify_502
        ;;
    verify-all)
        verify_all
        ;;
    verify-schema)
        verify_schema
        ;;
    verify-images)
        verify_images
        ;;
    verify-data)
        verify_data
        ;;
    check-tables)
        check_tables
        ;;
    associate-images)
        associate_images
        ;;
    restore-images)
        restore_images
        ;;
    setup-ssl)
        setup_ssl
        ;;
    check-dns)
        check_dns
        ;;
    check-ssl)
        check_ssl
        ;;
    fix-missing-cols)
        fix_missing_cols
        ;;
    restart-services)
        restart_services
        ;;
    show-status)
        show_status
        ;;
    show-logs)
        show_logs
        ;;
    help|--help|-h|"")
        show_help
        ;;
    *)
        echo "❌ Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac

