#!/bin/bash
# Copy SIT Database Data to Production
# This script copies all data from SIT to Production for testing
# ⚠️ WARNING: This will REPLACE all production data with SIT data!
# ⚠️ IMPORTANT: This script only READS from SIT, does not modify SIT
# Usage: bash scripts/copy-sit-data-to-production.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "⚠️  WARNING: This will REPLACE all production data with SIT data!"
echo "📊 Source: bakong_notification_services_sit (SIT)"
echo "📊 Target: bakong_notification_services (Production)"
echo ""
echo "This includes:"
echo "  ✅ All users"
echo "  ✅ All templates and translations"
echo "  ✅ All images (stored as BYTEA)"
echo "  ✅ All notifications"
echo "  ✅ All bakong_user records"
echo ""
read -p "Are you ABSOLUTELY SURE? Type 'YES' to continue: " confirm

if [ "$confirm" != "YES" ]; then
  echo "❌ Operation cancelled"
  exit 1
fi

# Database connection details
SIT_DB_NAME="bakong_notification_services_sit"
SIT_DB_USER="bkns_sit"
SIT_DB_PASS="0101bkns_sit"
SIT_CONTAINER="bakong-notification-services-db-sit"

PROD_DB_NAME="bakong_notification_services"
PROD_DB_USER="bkns"
PROD_DB_PASS="010110bkns"
PROD_CONTAINER="bakong-notification-services-db"

# Check if containers exist
echo "🔍 Checking for containers..."
echo "   Looking for SIT container: $SIT_CONTAINER"
echo "   Looking for Production container: $PROD_CONTAINER"
echo ""

if ! docker ps --format '{{.Names}}' | grep -q "^${SIT_CONTAINER}$"; then
  echo "❌ SIT database container not found: $SIT_CONTAINER"
  echo ""
  echo "💡 Available containers:"
  docker ps --format "   - {{.Names}}" | grep -i bakong || echo "   (none found)"
  echo ""
  echo "⚠️  This script should run on the SERVER where both SIT and Production containers exist."
  echo "    Or use the local dev copy script if testing locally."
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -q "^${PROD_CONTAINER}$"; then
  echo "❌ Production database container not found: $PROD_CONTAINER"
  echo ""
  echo "💡 Available containers:"
  docker ps --format "   - {{.Names}}" | grep -i bakong || echo "   (none found)"
  echo ""
  echo "⚠️  This script should run on the SERVER where both SIT and Production containers exist."
  echo "    Or use the local dev copy script if testing locally."
  exit 1
fi

echo "✅ Both containers found!"
echo ""

echo ""
echo "💾 Step 1: Creating backup of production database..."
BACKUP_DIR="$PROJECT_ROOT/backups"
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/backup_prod_before_sit_copy_$(date +%Y%m%d_%H%M%S).sql"

export PGPASSWORD="$PROD_DB_PASS"
docker exec "$PROD_CONTAINER" pg_dump \
  -U "$PROD_DB_USER" \
  -d "$PROD_DB_NAME" \
  --clean \
  --if-exists \
  --create \
  --format=plain \
  --no-owner \
  --no-privileges \
  > "$BACKUP_FILE"
unset PGPASSWORD

echo "✅ Production backup created: $BACKUP_FILE"
echo ""

echo "📤 Step 2: Exporting SIT data..."
TEMP_SIT_DUMP="/tmp/sit_data_export_$(date +%Y%m%d_%H%M%S).sql"

export PGPASSWORD="$SIT_DB_PASS"
docker exec "$SIT_CONTAINER" pg_dump \
  -U "$SIT_DB_USER" \
  -d "$SIT_DB_NAME" \
  --data-only \
  --inserts \
  --column-inserts \
  --no-owner \
  --no-privileges \
  --disable-triggers \
  > "$TEMP_SIT_DUMP"
unset PGPASSWORD

echo "✅ SIT data exported"
echo ""

echo "🔄 Step 3: Clearing production database..."
export PGPASSWORD="$PROD_DB_PASS"
docker exec -i "$PROD_CONTAINER" psql -U "$PROD_DB_USER" -d "$PROD_DB_NAME" <<EOF
-- Disable foreign key checks
SET session_replication_role = 'replica';

-- Clear all data (keep schema)
TRUNCATE TABLE notification CASCADE;
TRUNCATE TABLE template_translation CASCADE;
TRUNCATE TABLE template CASCADE;
TRUNCATE TABLE image CASCADE;
TRUNCATE TABLE bakong_user CASCADE;
TRUNCATE TABLE "user" CASCADE;

-- Re-enable foreign key checks
SET session_replication_role = 'origin';
EOF
unset PGPASSWORD

echo "✅ Production database cleared"
echo ""

echo "📥 Step 4: Importing SIT data to production..."
export PGPASSWORD="$PROD_DB_PASS"
docker exec -i "$PROD_CONTAINER" psql -U "$PROD_DB_USER" -d "$PROD_DB_NAME" < "$TEMP_SIT_DUMP"
unset PGPASSWORD

# Clean up temp file
rm -f "$TEMP_SIT_DUMP"

echo ""
echo "✅ Data copy completed!"
echo ""
echo "📊 Verification:"
export PGPASSWORD="$PROD_DB_PASS"
docker exec -i "$PROD_CONTAINER" psql -U "$PROD_DB_USER" -d "$PROD_DB_NAME" <<EOF
SELECT 
    'Users' as table_name,
    COUNT(*) as count
FROM "user"
WHERE "deletedAt" IS NULL

UNION ALL

SELECT 
    'Templates' as table_name,
    COUNT(*) as count
FROM template
WHERE "deletedAt" IS NULL

UNION ALL

SELECT 
    'Images' as table_name,
    COUNT(*) as count
FROM image

UNION ALL

SELECT 
    'Template Translations' as table_name,
    COUNT(*) as count
FROM template_translation

UNION ALL

SELECT 
    'Bakong Users' as table_name,
    COUNT(*) as count
FROM bakong_user;
EOF
unset PGPASSWORD

echo ""
echo "💡 Next steps:"
echo "   1. Verify the data looks correct"
echo "   2. Test the application with production data"
echo "   3. If something goes wrong, restore from: $BACKUP_FILE"
echo ""

