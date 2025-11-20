#!/bin/bash
# Copy SIT Data to Production - Complete Process
# Run this on the server: bash COPY_SIT_TO_PRODUCTION_NOW.sh

set -e

cd ~/bakong-notification-services

echo "🔍 Step 1: Checking SIT database container..."
SIT_CONTAINER=$(docker ps -a --format '{{.Names}}' | grep -E "bakong-notification-services-db-sit$|.*_bakong-notification-services-db-sit$" | head -1)

if [ -z "$SIT_CONTAINER" ]; then
  echo "⚠️  SIT database container not found"
  echo "   Available containers:"
  docker ps -a --format "   - {{.Names}}" | grep -i bakong || echo "   (none found)"
  echo ""
  echo "💡 Starting SIT database..."
  
  # Fix docker-compose KeyError bug: Remove any corrupted containers first
  CORRUPTED=$(docker ps -a --format '{{.Names}}' | grep -E ".*_bakong-notification-services-db-sit$" | head -1)
  if [ -n "$CORRUPTED" ]; then
    echo "⚠️  Removing corrupted container: $CORRUPTED"
    docker rm -f "$CORRUPTED" 2>/dev/null || true
  fi
  
  docker-compose -f docker-compose.sit.yml up -d db
  sleep 15
  SIT_CONTAINER=$(docker ps --format '{{.Names}}' | grep -E "bakong-notification-services-db-sit$|.*_bakong-notification-services-db-sit$" | head -1)
  
  if [ -z "$SIT_CONTAINER" ]; then
    echo "❌ Failed to start SIT database"
    exit 1
  fi
  echo "✅ SIT database started: $SIT_CONTAINER"
else
  # Check if it's running
  if ! docker ps --format '{{.Names}}' | grep -q "^${SIT_CONTAINER}$"; then
    echo "⚠️  SIT database is stopped - starting it..."
    docker start "$SIT_CONTAINER"
    sleep 10
  fi
  echo "✅ SIT database container found: $SIT_CONTAINER"
fi

echo ""
echo "🔍 Step 2: Checking Production database container..."
PROD_CONTAINER=$(docker ps --format '{{.Names}}' | grep -E "bakong-notification-services-db$|.*_bakong-notification-services-db$" | head -1)

if [ -z "$PROD_CONTAINER" ]; then
  echo "❌ Production database container not found!"
  exit 1
fi
echo "✅ Production database container: $PROD_CONTAINER"

echo ""
echo "📊 Step 3: Checking SIT data..."
docker exec -it "$SIT_CONTAINER" psql -U bkns_sit -d bakong_notification_services_sit <<EOF
SELECT 
    'Users' as type, COUNT(*) as count FROM "user" WHERE "deletedAt" IS NULL
UNION ALL
SELECT 'Templates', COUNT(*) FROM template WHERE "deletedAt" IS NULL
UNION ALL
SELECT 'Images', COUNT(*) FROM image
UNION ALL
SELECT 'Bakong Users', COUNT(*) FROM bakong_user;
EOF

echo ""
echo "⚠️  WARNING: This will REPLACE all production data with SIT data!"
read -p "Type 'YES' to continue: " confirm

if [ "$confirm" != "YES" ]; then
  echo "❌ Operation cancelled"
  exit 1
fi

echo ""
echo "📋 Step 4: Copying SIT data to Production..."
cd apps/backend
bash scripts/copy-sit-data-to-production.sh

echo ""
echo "✅ Data copy completed!"
echo ""
echo "💡 Next steps:"
echo "   1. Restart backend: docker-compose -f ../docker-compose.production.yml restart backend"
echo "   2. Access frontend: http://bakong-notification.nbc.gov.kh/"
echo "   3. Verify data is showing correctly"

