#!/bin/bash
# Run Unified Database Migration
# This script runs the unified migration file on the database
# Usage: bash apps/backend/scripts/run-migration.sh [environment]
#   environment: dev|sit|production (default: production)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_ROOT"

ENVIRONMENT="${1:-production}"

# Database configuration based on environment
case "$ENVIRONMENT" in
    dev|development)
        DB_CONTAINER="bakong-notification-services-db-dev"
        DB_NAME="bakong_notification_services_dev"
        DB_USER="bkns_dev"
        DB_PASSWORD="dev"
        ;;
    sit)
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
        echo "❌ Unknown environment: $ENVIRONMENT"
        echo "   Usage: bash apps/backend/scripts/run-migration.sh [dev|sit|production]"
        exit 1
        ;;
esac

echo "🔄 Running Unified Database Migration"
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
    echo "   docker-compose -f docker-compose.production.yml up -d db"
    exit 1
fi

echo "✅ Database container is running"
echo ""

# Check if migration file exists
MIGRATION_FILE="apps/backend/migrations/unified-migration.sql"
if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Migration file not found: $MIGRATION_FILE"
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
    echo "   1. Restart your backend service"
    echo "   2. Verify the application is working"
    echo "   3. Check logs if needed: docker logs bakong-notification-services-api"
else
    echo ""
    echo "❌ Migration failed with exit code: $EXIT_CODE"
    echo ""
    echo "💡 Troubleshooting:"
    echo "   1. Check database logs: docker logs $DB_CONTAINER"
    echo "   2. Verify database connection: docker exec -it $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c 'SELECT version();'"
    exit $EXIT_CODE
fi
