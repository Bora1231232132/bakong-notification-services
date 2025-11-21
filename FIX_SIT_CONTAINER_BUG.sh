#!/bin/bash
# Fix SIT Container KeyError Bug
# Run this on the server: bash FIX_SIT_CONTAINER_BUG.sh

set -e

cd ~/bakong-notification-services

echo "🔍 Step 1: Finding corrupted SIT containers..."
CORRUPTED_CONTAINERS=$(docker ps -a --format '{{.Names}}' | grep -E ".*_bakong-notification-services-db-sit$" || true)

if [ -z "$CORRUPTED_CONTAINERS" ]; then
  echo "✅ No corrupted SIT containers found"
else
  echo "⚠️  Found corrupted containers:"
  echo "$CORRUPTED_CONTAINERS"
  echo ""
  echo "🗑️  Removing corrupted containers..."
  echo "$CORRUPTED_CONTAINERS" | while read -r container; do
    echo "   Removing: $container"
    docker rm -f "$container" 2>/dev/null || true
  done
  echo "✅ Corrupted containers removed"
fi

echo ""
echo "🚀 Step 2: Starting SIT database..."
docker-compose -f docker-compose.sit.yml up -d db

echo ""
echo "⏳ Waiting for SIT database to start..."
sleep 15

echo ""
echo "✅ Step 3: Verifying SIT database is running..."
SIT_CONTAINER=$(docker ps --format '{{.Names}}' | grep -E "bakong-notification-services-db-sit$|.*_bakong-notification-services-db-sit$" | head -1)

if [ -n "$SIT_CONTAINER" ]; then
  echo "✅ SIT database is running: $SIT_CONTAINER"
  echo ""
  echo "💡 Now you can run: cd apps/backend && bash scripts/copy-sit-data-to-production.sh"
else
  echo "❌ SIT database failed to start"
  echo "   Check logs: docker-compose -f docker-compose.sit.yml logs db"
  exit 1
fi

