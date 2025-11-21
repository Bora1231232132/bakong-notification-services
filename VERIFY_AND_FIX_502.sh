#!/bin/bash
# Verify and Fix 502 Bad Gateway Error
# This script checks backend status, database columns, and nginx connectivity
# Run this on the server: bash VERIFY_AND_FIX_502.sh

set -e

cd ~/bakong-notification-services

echo "🔍 Step 1: Checking if database columns exist..."
docker exec -i bakong-notification-services-db psql -U bkns -d bakong_notification_services -c "
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'template' 
AND column_name IN ('createdBy', 'updatedBy', 'publishedBy')
ORDER BY column_name;
" || {
    echo "❌ Columns missing! Running migration..."
    docker exec -i bakong-notification-services-db psql -U bkns -d bakong_notification_services < apps/backend/scripts/add-template-audit-columns.sql
    echo "✅ Migration completed"
}

echo ""
echo "🔍 Step 2: Checking backend container status..."
docker ps | grep bakong-notification-services-api || {
    echo "❌ Backend container not running!"
    exit 1
}

echo ""
echo "🔍 Step 3: Checking if backend is listening on port 8080..."
docker exec bakong-notification-services-api netstat -tlnp 2>/dev/null | grep 8080 || \
docker exec bakong-notification-services-api ss -tlnp 2>/dev/null | grep 8080 || {
    echo "⚠️  Backend not listening on port 8080"
}

echo ""
echo "🔍 Step 4: Testing backend health endpoint from inside backend container..."
docker exec bakong-notification-services-api curl -s http://localhost:8080/api/v1/health || {
    echo "❌ Backend health check failed from inside container"
}

echo ""
echo "🔍 Step 5: Testing backend from host (localhost:8080)..."
curl -s http://localhost:8080/api/v1/health || {
    echo "❌ Backend not accessible from host"
}

echo ""
echo "🔍 Step 6: Checking backend logs for recent errors..."
docker logs --tail 30 bakong-notification-services-api 2>&1 | grep -i "error\|started\|listening" | tail -10

echo ""
echo "🔍 Step 7: Checking if backend is in the same network as frontend..."
docker network inspect bakong-network 2>/dev/null | grep -A 5 "bakong-notification-services-api" || {
    echo "⚠️  Backend not found in bakong-network"
}

echo ""
echo "🔍 Step 8: Testing backend connectivity from frontend container..."
docker exec bakong-notification-services-frontend curl -s http://backend:8080/api/v1/health || {
    echo "❌ Frontend cannot reach backend via 'backend' hostname"
    echo "   Trying alternative: bakong-notification-services-api"
    docker exec bakong-notification-services-frontend curl -s http://bakong-notification-services-api:8080/api/v1/health || {
        echo "❌ Frontend cannot reach backend via container name either"
    }
}

echo ""
echo "🔍 Step 9: Checking nginx configuration..."
docker exec bakong-notification-services-frontend cat /etc/nginx/conf.d/default.conf 2>/dev/null | grep -A 5 "proxy_pass" || {
    echo "⚠️  Could not read nginx config"
}

echo ""
echo "🔍 Step 10: Restarting backend to ensure clean state..."
docker restart bakong-notification-services-api
echo "⏳ Waiting 30 seconds for backend to start..."
sleep 30

echo ""
echo "🔍 Step 11: Final health check..."
if curl -s http://localhost:8080/api/v1/health > /dev/null; then
    echo "✅ Backend is healthy!"
    curl -s http://localhost:8080/api/v1/health | head -3
else
    echo "❌ Backend still not responding"
    echo "   Check logs: docker logs --tail 100 bakong-notification-services-api"
fi

echo ""
echo "🔍 Step 12: Restarting frontend to refresh nginx..."
docker restart bakong-notification-services-frontend
echo "⏳ Waiting 10 seconds for frontend to restart..."
sleep 10

echo ""
echo "✅ Verification complete!"
echo ""
echo "💡 If 502 errors persist:"
echo "   1. Check backend logs: docker logs bakong-notification-services-api"
echo "   2. Check frontend logs: docker logs bakong-notification-services-frontend"
echo "   3. Verify network: docker network inspect bakong-network"
echo "   4. Test from frontend: docker exec bakong-notification-services-frontend curl http://backend:8080/api/v1/health"

