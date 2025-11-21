#!/bin/bash
# Fix Missing Column Error
# Run this on the server: bash FIX_MISSING_COLUMN.sh

set -e

cd ~/bakong-notification-services

echo "🔍 Step 1: Checking template table structure..."
docker exec -i bakong-notification-services-db psql -U bkns -d bakong_notification_services -c "\d template"

echo ""
echo "🔍 Step 2: Checking what columns TypeORM expects..."
# The error suggests it's looking for a column that doesn't exist
# Let's check the full backend logs for the exact query

echo ""
echo "📋 Step 3: Getting full error details..."
docker logs bakong-notification-services-api 2>&1 | grep -A 5 -B 5 "errorMissingColumn\|42703" | tail -20

echo ""
echo "💡 The issue is likely a missing column in the template table."
echo "   Copying SIT data will fix this as SIT has the correct schema."
echo ""
echo "   Run: bash COPY_SIT_TO_PRODUCTION_NOW.sh"

