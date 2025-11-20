#!/bin/bash
# Fix and Start Production Database
# Run this on the server: bash FIX_AND_START_PRODUCTION_DB.sh

set -e

cd ~/bakong-notification-services

echo "🔍 Step 1: Removing corrupted SIT container that's interfering..."
# Remove the corrupted SIT container that's causing the KeyError
CORRUPTED_SIT=$(docker ps -a --format '{{.Names}}' | grep -E ".*_bakong-notification-services-db-sit$" | head -1)
if [ -n "$CORRUPTED_SIT" ]; then
  echo "⚠️  Removing corrupted SIT container: $CORRUPTED_SIT"
  docker rm -f "$CORRUPTED_SIT" 2>/dev/null || true
  echo "✅ Corrupted container removed"
fi

echo ""
echo "🔍 Step 2: Checking for existing production database container..."
PROD_CONTAINER=$(docker ps -a --format '{{.Names}}' | grep -E "^bakong-notification-services-db$" | head -1)

if [ -z "$PROD_CONTAINER" ]; then
  echo "⚠️  Production database container doesn't exist"
  echo "   Creating it now..."
  echo ""
  
  # Check if network exists, create if not
  if ! docker network ls | grep -q "bakong-network"; then
    echo "📡 Creating bakong-network..."
    docker network create bakong-network 2>/dev/null || true
  fi
  
  # Use docker run directly to avoid docker-compose bug
  echo "🚀 Creating production database container..."
  docker run -d \
    --name bakong-notification-services-db \
    --network bakong-network \
    -e POSTGRES_DB=bakong_notification_services \
    -e POSTGRES_USER=bkns \
    -e POSTGRES_PASSWORD=010110bkns \
    -e POSTGRES_INITDB_ARGS="--encoding=UTF-8 --lc-collate=C --lc-ctype=C" \
    -p 5433:5432 \
    -v postgres_data_prod:/var/lib/postgresql/data \
    -v "$(pwd)/apps/backend/init-db.sql:/docker-entrypoint-initdb.d/init-db.sql:ro" \
    --restart unless-stopped \
    --health-cmd="pg_isready -U bkns -d bakong_notification_services -p 5432" \
    --health-interval=10s \
    --health-timeout=5s \
    --health-retries=5 \
    --health-start-period=30s \
    postgres:14-alpine \
    postgres -p 5432
  
  echo "⏳ Waiting for database to initialize..."
  sleep 20
  
  # Verify it was created
  if docker ps --format '{{.Names}}' | grep -q "^bakong-notification-services-db$"; then
    echo "✅ Production database container created and running!"
  else
    echo "❌ Failed to create production database container"
    exit 1
  fi
else
  echo "✅ Found production database container: $PROD_CONTAINER"
  
  # Check if it's running
  if ! docker ps --format '{{.Names}}' | grep -q "^bakong-notification-services-db$"; then
    echo "⚠️  Production database is stopped - starting it..."
    docker start bakong-notification-services-db
    sleep 10
  fi
  
  echo "✅ Production database is running"
fi

echo ""
echo "📊 Step 3: Verifying production database..."
docker ps --format "table {{.Names}}\t{{.Status}}" | grep bakong-notification-services-db | grep -v sit

echo ""
echo "✅ Production database is ready!"
echo ""
echo "💡 Next step: bash COPY_SIT_TO_PRODUCTION_NOW.sh"

