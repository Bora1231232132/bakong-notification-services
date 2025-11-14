
set -e

ENV=${1:-${NODE_ENV:-development}}

case $ENV in
  staging)
    DB_HOST=${POSTGRES_HOST:-localhost}
    DB_PORT=${POSTGRES_PORT:-5434}
    DB_NAME=${POSTGRES_DB:-bakong_notification_services_sit}
    DB_USER=${POSTGRES_USER:-bkns_sit}
    DB_PASSWORD=${POSTGRES_PASSWORD:-0101bkns_sit}
    ;;
  production)
    DB_HOST=${POSTGRES_HOST:-localhost}
    DB_PORT=${POSTGRES_PORT:-5433}
    DB_NAME=${POSTGRES_DB:-bakong_notification_services}
    DB_USER=${POSTGRES_USER:-bkns}
    DB_PASSWORD=${POSTGRES_PASSWORD:-010110bkns}
    ;;
  *)
    DB_HOST=${POSTGRES_HOST:-localhost}
    DB_PORT=${POSTGRES_PORT:-5437}
    DB_NAME=${POSTGRES_DB:-bakong_notification_services_dev}
    DB_USER=${POSTGRES_USER:-bkns_dev}
    DB_PASSWORD=${POSTGRES_PASSWORD:-dev}
    ;;
esac

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_FILE="$SCRIPT_DIR/init-db-data-$ENV.sql"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "🔄 Starting database data backup..."
echo "📊 Environment: $ENV"
echo "🗄️  Database: $DB_NAME"
echo "📝 Output file: $OUTPUT_FILE"
echo ""

if ! command -v pg_dump &> /dev/null; then
  echo "❌ Error: pg_dump not found!"
  echo "   Please install PostgreSQL client tools."
  echo "   On Mac: brew install postgresql"
  echo "   On Linux: sudo apt-get install postgresql-client"
  exit 1
fi

export PGPASSWORD=$DB_PASSWORD

cat > "$OUTPUT_FILE" << EOF
-- ============================================
-- Database Data Backup
-- Environment: $ENV
-- Database: $DB_NAME
-- Generated: $TIMESTAMP
-- ============================================
-- 
-- This file contains INSERT statements for all data in the database.
-- Run this file AFTER running init-db.sql to populate the database
-- with existing data.
--
-- Usage:
--   1. Run init-db.sql first (creates schema)
--   2. Then run this file: psql -U $DB_USER -d $DB_NAME -f $(basename "$OUTPUT_FILE")
--
-- ============================================

-- Disable foreign key checks temporarily for faster inserts
SET session_replication_role = 'replica';

-- Begin transaction
BEGIN;

EOF

echo "📤 Exporting data from database..."

pg_dump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --dbname="$DB_NAME" \
  --data-only \
  --inserts \
  --column-inserts \
  --no-owner \
  --no-privileges \
  --no-tablespaces \
  --disable-triggers \
  >> "$OUTPUT_FILE"

cat >> "$OUTPUT_FILE" << EOF

-- Re-enable foreign key checks
SET session_replication_role = 'origin';

-- Commit transaction
COMMIT;

-- ============================================
-- Backup completed successfully!
-- ============================================
EOF

echo "✅ Backup completed successfully!"
echo "📄 Data exported to: $OUTPUT_FILE"
echo ""
echo "💡 To restore this data:"
echo "   psql -U $DB_USER -d $DB_NAME -f $(basename "$OUTPUT_FILE")"
echo ""
echo "   Or in Docker:"
CONTAINER_NAME="bakong-notification-services-db-$(echo $ENV | sed 's/development/dev/;s/staging/sit/;s/production/prod/')"
echo "   docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME < $(basename "$OUTPUT_FILE")"

