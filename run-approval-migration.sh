#!/bin/bash

# ============================================================================
# Run Approval Fields Migration in Docker
# ============================================================================
# This script runs the add-template-approval-fields.sql migration in Docker
# It auto-detects the environment based on running containers
#
# Usage:
#   ./run-approval-migration.sh
#   ./run-approval-migration.sh dev
#   ./run-approval-migration.sh sit
#   ./run-approval-migration.sh production
# ============================================================================

ENVIRONMENT="${1:-}"

MIGRATION_FILE="apps/backend/scripts/add-template-approval-fields.sql"

# Auto-detect environment if not specified
if [ -z "$ENVIRONMENT" ]; then
    if docker ps --format '{{.Names}}' | grep -q "^bakong-notification-services-db$"; then
        ENVIRONMENT="production"
        DB_CONTAINER="bakong-notification-services-db"
        DB_NAME="bakong_notification_services"
        DB_USER="bkns"
    elif docker ps --format '{{.Names}}' | grep -q "bakong-notification-services-db-sit"; then
        ENVIRONMENT="sit"
        DB_CONTAINER="bakong-notification-services-db-sit"
        DB_NAME="bakong_notification_services_sit"
        DB_USER="bkns_sit"
    elif docker ps --format '{{.Names}}' | grep -q "bakong-notification-services-db-dev"; then
        ENVIRONMENT="dev"
        DB_CONTAINER="bakong-notification-services-db-dev"
        DB_NAME="bakong_notification_services_dev"
        DB_USER="bkns_dev"
    else
        echo "❌ Could not detect environment. Please specify environment parameter"
        echo ""
        echo "Available containers:"
        docker ps --format "   - {{.Names}}" | grep -i bakong || echo "   (none found)"
        echo ""
        echo "Usage: ./run-approval-migration.sh [dev|sit|production]"
        exit 1
    fi
else
    # Set based on explicit environment parameter
    case "$ENVIRONMENT" in
        dev|development)
            DB_CONTAINER="bakong-notification-services-db-dev"
            DB_NAME="bakong_notification_services_dev"
            DB_USER="bkns_dev"
            ;;
        sit|staging)
            DB_CONTAINER="bakong-notification-services-db-sit"
            DB_NAME="bakong_notification_services_sit"
            DB_USER="bkns_sit"
            ;;
        production|prod)
            DB_CONTAINER="bakong-notification-services-db"
            DB_NAME="bakong_notification_services"
            DB_USER="bkns"
            ;;
        *)
            echo "❌ Invalid environment: $ENVIRONMENT"
            echo "   Valid options: dev, sit, production"
            exit 1
            ;;
    esac
fi

echo "🔄 Running Approval Fields Migration"
echo "======================================"
echo ""
echo "📋 Configuration:"
echo "   Environment: $ENVIRONMENT"
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
    case "$ENVIRONMENT" in
        dev|development)
            echo "   docker-compose up -d db"
            ;;
        sit|staging)
            echo "   docker-compose -f docker-compose.sit.yml up -d db"
            ;;
        production|prod)
            echo "   docker-compose -f docker-compose.production.yml up -d db"
            ;;
    esac
    exit 1
fi

echo "✅ Database container is running"
echo ""

# Check if migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Migration file not found: $MIGRATION_FILE"
    echo "   Current directory: $(pwd)"
    exit 1
fi

echo "📝 Running migration..."
echo ""

# Run migration
docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" < "$MIGRATION_FILE"

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
    echo ""
    echo "💡 Next steps:"
    echo "   1. Restart your backend service to pick up the new fields"
    echo "   2. Verify the migration by checking template table structure"
else
    echo ""
    echo "❌ Migration failed with exit code: $EXIT_CODE"
    exit $EXIT_CODE
fi
