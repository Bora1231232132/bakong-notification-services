#!/bin/bash
# Create Production Database Tables
# Run this on the server: bash CREATE_PRODUCTION_TABLES.sh

set -e

cd ~/bakong-notification-services

# Find the production database container (may have prefix)
DB_CONTAINER=$(docker ps --format '{{.Names}}' | grep -E "bakong-notification-services-db$|.*_bakong-notification-services-db$" | head -1)

if [ -z "$DB_CONTAINER" ]; then
  echo "❌ Production database container not found!"
  echo "   Available containers:"
  docker ps --format "   - {{.Names}}" | grep -i bakong || echo "   (none found)"
  exit 1
fi

echo "✅ Found database container: $DB_CONTAINER"
DB_NAME="bakong_notification_services"
DB_USER="bkns"

echo ""
echo "🔍 Step 1: Checking existing tables..."
docker exec -it "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "\dt" || echo "   (No tables found or error)"

echo ""
echo "🔨 Step 2: Creating tables from init-db.sql..."
docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" < apps/backend/init-db.sql

echo ""
echo "✅ Step 3: Verifying tables were created..."
docker exec -it "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "\dt"

echo ""
echo "🔄 Step 4: Running bakongPlatform migration..."
docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" < apps/backend/scripts/add-bakong-platform-migration.sql

echo ""
echo "✅ Step 5: Verifying bakongPlatform columns..."
docker exec -it "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "\d template" | grep -i bakongPlatform || echo "   (checking template table...)"
docker exec -it "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "\d bakong_user" | grep -i bakongPlatform || echo "   (checking bakong_user table...)"

echo ""
echo "✅ Tables created and migrations applied!"
echo ""
echo "💡 Next steps:"
echo "   1. Check SIT database: docker ps -a | grep bakong-notification-services-db-sit"
echo "   2. Copy SIT data: cd apps/backend && bash scripts/copy-sit-data-to-production.sh"

