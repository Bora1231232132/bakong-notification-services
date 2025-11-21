#!/bin/bash
# Fix Deployment - Add Missing Template Columns
# This script adds the missing createdBy, updatedBy, publishedBy columns to the template table
# Run this on the server: bash FIX_DEPLOYMENT_MISSING_COLUMNS.sh

set -e

cd ~/bakong-notification-services

echo "🔍 Step 1: Checking current template table structure..."
docker exec -i bakong-notification-services-db psql -U bkns -d bakong_notification_services -c "\d template" || {
    echo "❌ Failed to connect to database. Is the database container running?"
    exit 1
}

echo ""
echo "📋 Step 2: Checking which columns are missing..."
docker exec -i bakong-notification-services-db psql -U bkns -d bakong_notification_services -c "
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'template' 
AND column_name IN ('createdBy', 'updatedBy', 'publishedBy')
ORDER BY column_name;
"

echo ""
echo "🔧 Step 3: Running migration to add missing columns..."
docker exec -i bakong-notification-services-db psql -U bkns -d bakong_notification_services < apps/backend/scripts/add-template-audit-columns.sql

echo ""
echo "✅ Step 4: Verifying columns were added..."
docker exec -i bakong-notification-services-db psql -U bkns -d bakong_notification_services -c "
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'template' 
AND column_name IN ('createdBy', 'updatedBy', 'publishedBy')
ORDER BY column_name;
"

echo ""
echo "🔄 Step 5: Restarting backend service..."
docker restart bakong-notification-services-api

echo ""
echo "⏳ Step 6: Waiting for backend to start (30 seconds)..."
sleep 30

echo ""
echo "🔍 Step 7: Checking backend logs for errors..."
docker logs --tail 50 bakong-notification-services-api | grep -i "error\|started\|listening" | tail -20

echo ""
echo "🧪 Step 8: Testing backend health endpoint..."
if curl -s http://localhost:8080/api/v1/health > /dev/null; then
    echo "✅ Backend is responding!"
    curl -s http://localhost:8080/api/v1/health | head -5
else
    echo "⚠️  Backend not responding yet. Check logs with:"
    echo "   docker logs --tail 100 bakong-notification-services-api"
fi

echo ""
echo "✅ Deployment fix completed!"
echo ""
echo "💡 If backend still has issues, check:"
echo "   1. docker logs bakong-notification-services-api"
echo "   2. docker ps (make sure containers are running)"
echo "   3. Database connection: docker exec -it bakong-notification-services-db psql -U bkns -d bakong_notification_services"

