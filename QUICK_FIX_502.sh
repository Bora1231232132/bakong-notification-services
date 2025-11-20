#!/bin/bash
# Quick Fix for 502 Bad Gateway
# Restarts backend and frontend, verifies connectivity
# Run this on the server: bash QUICK_FIX_502.sh

set -e

cd ~/bakong-notification-services

echo "🔄 Step 1: Ensuring database columns exist..."
docker exec -i bakong-notification-services-db psql -U bkns -d bakong_notification_services -c "
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'template' AND column_name = 'createdBy') THEN
        ALTER TABLE template ADD COLUMN \"createdBy\" VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'template' AND column_name = 'updatedBy') THEN
        ALTER TABLE template ADD COLUMN \"updatedBy\" VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'template' AND column_name = 'publishedBy') THEN
        ALTER TABLE template ADD COLUMN \"publishedBy\" VARCHAR(255);
    END IF;
END\$\$;
" 2>&1 | grep -v "NOTICE" || true

echo ""
echo "🔄 Step 2: Restarting backend..."
docker restart bakong-notification-services-api

echo ""
echo "⏳ Step 3: Waiting for backend to start (40 seconds)..."
sleep 40

echo ""
echo "🔍 Step 4: Checking backend status..."
if docker exec bakong-notification-services-api curl -s http://localhost:8080/api/v1/health > /dev/null 2>&1; then
    echo "✅ Backend is healthy!"
    docker logs --tail 5 bakong-notification-services-api | grep -i "started\|listening" || true
else
    echo "❌ Backend health check failed"
    echo "   Recent logs:"
    docker logs --tail 20 bakong-notification-services-api | tail -10
    exit 1
fi

echo ""
echo "🔍 Step 5: Testing backend from frontend container..."
if docker exec bakong-notification-services-frontend curl -s http://backend:8080/api/v1/health > /dev/null 2>&1; then
    echo "✅ Frontend can reach backend!"
else
    echo "⚠️  Frontend cannot reach backend via 'backend' hostname"
    echo "   Trying container name..."
    if docker exec bakong-notification-services-frontend curl -s http://bakong-notification-services-api:8080/api/v1/health > /dev/null 2>&1; then
        echo "✅ Frontend can reach backend via container name!"
        echo "   ⚠️  You may need to update nginx config to use container name"
    else
        echo "❌ Frontend cannot reach backend at all"
    fi
fi

echo ""
echo "🔄 Step 6: Restarting frontend..."
docker restart bakong-notification-services-frontend

echo ""
echo "⏳ Step 7: Waiting for frontend to restart (10 seconds)..."
sleep 10

echo ""
echo "✅ Quick fix completed!"
echo ""
echo "🧪 Test the application now. If 502 errors persist:"
echo "   1. Check backend: docker logs bakong-notification-services-api | tail -50"
echo "   2. Check frontend: docker logs bakong-notification-services-frontend | tail -50"
echo "   3. Test backend directly: curl http://10.20.6.58:8080/api/v1/health"

