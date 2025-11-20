#!/bin/bash
# Migration script to add bakongPlatform support
# This script can be run on the server before starting the application
# Usage: bash scripts/run-bakong-platform-migration.sh [environment]

set -e

ENV=${1:-staging}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🔄 Starting bakongPlatform migration..."
echo "📊 Environment: $ENV"
echo ""

# Determine database connection details based on environment
case $ENV in
  development|dev)
    DB_HOST=${POSTGRES_HOST:-localhost}
    DB_PORT=${POSTGRES_PORT:-5437}
    DB_NAME=${POSTGRES_DB:-bakong_notification_services_dev}
    DB_USER=${POSTGRES_USER:-bkns_dev}
    DB_PASS=${POSTGRES_PASSWORD:-dev}
    CONTAINER_NAME="bakong-notification-services-db-dev"
    ;;
  staging|sit)
    DB_HOST=${POSTGRES_HOST:-localhost}
    DB_PORT=${POSTGRES_PORT:-5434}
    DB_NAME=${POSTGRES_DB:-bakong_notification_services_sit}
    DB_USER=${POSTGRES_USER:-bkns_sit}
    DB_PASS=${POSTGRES_PASSWORD:-0101bkns_sit}
    CONTAINER_NAME="bakong-notification-services-db-sit"
    ;;
  production|prod)
    DB_HOST=${POSTGRES_HOST:-localhost}
    DB_PORT=${POSTGRES_PORT:-5433}
    DB_NAME=${POSTGRES_DB:-bakong_notification_services}
    DB_USER=${POSTGRES_USER:-bkns}
    DB_PASS=${POSTGRES_PASSWORD:-010110bkns}
    CONTAINER_NAME="bakong-notification-services-db-prod"
    ;;
  *)
    echo "❌ Unknown environment: $ENV"
    echo "   Valid options: development, staging, production"
    exit 1
    ;;
esac

echo "🗄️  Database: $DB_NAME"
echo "👤 User: $DB_USER"
echo ""

# Check if Docker container exists
USE_DOCKER=false
if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  USE_DOCKER=true
  echo "🐳 Using Docker container: $CONTAINER_NAME"
else
  echo "📡 Attempting direct database connection..."
  # Check if psql is available
  if ! command -v psql &> /dev/null; then
    echo "❌ Error: psql not found and Docker container not available!"
    echo "   Options:"
    echo "   1. Start Docker container: docker compose up -d db"
    echo "   2. Install PostgreSQL client tools"
    exit 1
  fi
fi

SQL_FILE="$SCRIPT_DIR/add-bakong-platform-migration.sql"

if [ ! -f "$SQL_FILE" ]; then
  echo "❌ Error: SQL migration file not found: $SQL_FILE"
  exit 1
fi

echo ""
echo "🔄 Running migration..."
echo ""

if [ "$USE_DOCKER" = true ]; then
  # Run via Docker
  export PGPASSWORD="$DB_PASS"
  docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" < "$SQL_FILE"
  unset PGPASSWORD
else
  # Run directly
  export PGPASSWORD="$DB_PASS"
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SQL_FILE"
  unset PGPASSWORD
fi

echo ""
echo "✅ Migration completed!"
echo ""
echo "💡 Next steps:"
echo "   1. Restart your application"
echo "   2. Test the new bakongPlatform filtering feature"
echo "   3. Verify notifications are filtered correctly"
echo ""

