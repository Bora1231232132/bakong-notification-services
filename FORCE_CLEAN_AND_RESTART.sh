#!/bin/bash
# Force Clean and Restart - Removes all containers and restarts cleanly
# Run this on the server: bash FORCE_CLEAN_AND_RESTART.sh

set -e

cd ~/bakong-notification-services

echo "🛑 Step 1: Force stopping and removing ALL containers..."
docker-compose -f docker-compose.production.yml down 2>/dev/null || true

# Force remove by container name
echo "   Removing containers by name..."
docker rm -f bakong-notification-services-api 2>/dev/null || true
docker rm -f bakong-notification-services-frontend 2>/dev/null || true
docker rm -f bakong-notification-services-db 2>/dev/null || true

# Also try removing by ID if name doesn't work
echo "   Removing any remaining containers..."
docker ps -a | grep bakong-notification-services | awk '{print $1}' | xargs -r docker rm -f 2>/dev/null || true

# Remove networks
echo "   Removing networks..."
docker network rm bakong-notification-services_bakong-network 2>/dev/null || true
docker network rm bakong-network 2>/dev/null || true

echo ""
echo "✅ Cleanup complete. Waiting 2 seconds..."
sleep 2

echo ""
echo "🔍 Step 2: Verifying containers are removed..."
if docker ps -a | grep -q bakong-notification-services; then
    echo "⚠️  Some containers still exist:"
    docker ps -a | grep bakong-notification-services
    echo "   Trying to remove by ID..."
    docker ps -a | grep bakong-notification-services | awk '{print $1}' | while read id; do
        docker rm -f "$id" 2>/dev/null || echo "   Could not remove $id"
    done
else
    echo "✅ All containers removed"
fi

echo ""
echo "🔍 Step 3: Ensuring database columns exist (will start DB temporarily)..."
# Start DB to add columns
docker-compose -f docker-compose.production.yml up -d db
sleep 8

# Add columns if they don't exist
docker exec -i bakong-notification-services-db psql -U bkns -d bakong_notification_services -c "
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'template' AND column_name = 'createdBy') THEN
        ALTER TABLE template ADD COLUMN \"createdBy\" VARCHAR(255);
        RAISE NOTICE 'Added createdBy column';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'template' AND column_name = 'updatedBy') THEN
        ALTER TABLE template ADD COLUMN \"updatedBy\" VARCHAR(255);
        RAISE NOTICE 'Added updatedBy column';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'template' AND column_name = 'publishedBy') THEN
        ALTER TABLE template ADD COLUMN \"publishedBy\" VARCHAR(255);
        RAISE NOTICE 'Added publishedBy column';
    END IF;
END\$\$;
" 2>&1 | grep -v "NOTICE" || true

echo ""
echo "🔄 Step 4: Starting all services with docker-compose..."
docker-compose -f docker-compose.production.yml up -d

echo ""
echo "⏳ Step 5: Waiting for services to start (50 seconds)..."
sleep 50

echo ""
echo "🔍 Step 6: Checking container status..."
docker ps | grep -E "bakong-notification-services-(api|frontend|db)" || {
    echo "❌ Some containers are not running!"
    docker ps -a | grep bakong-notification-services
    exit 1
}

echo ""
echo "🔍 Step 7: Testing backend health..."
for i in {1..6}; do
    if curl -s http://localhost:8080/api/v1/health > /dev/null 2>&1; then
        echo "✅ Backend is healthy!"
        curl -s http://localhost:8080/api/v1/health | head -3
        break
    else
        echo "⏳ Waiting for backend... (attempt $i/6)"
        sleep 5
    fi
done

if ! curl -s http://localhost:8080/api/v1/health > /dev/null 2>&1; then
    echo "❌ Backend not responding"
    echo "   Logs:"
    docker logs --tail 20 bakong-notification-services-api
    exit 1
fi

echo ""
echo "🔍 Step 8: Testing frontend connectivity to backend..."
sleep 5
if docker exec bakong-notification-services-frontend wget -q -O- http://backend:8080/api/v1/health > /dev/null 2>&1; then
    echo "✅ Frontend can reach backend!"
elif docker exec bakong-notification-services-frontend wget -q -O- http://bakong-notification-services-api:8080/api/v1/health > /dev/null 2>&1; then
    echo "✅ Frontend can reach backend via container name!"
else
    echo "⚠️  Frontend connectivity test failed (may still work via nginx)"
fi

echo ""
echo "🔍 Step 9: Testing frontend proxy..."
sleep 5
if curl -s http://localhost/api/v1/health > /dev/null 2>&1; then
    echo "✅ Frontend proxy is working!"
    curl -s http://localhost/api/v1/health | head -3
else
    echo "⚠️  Frontend proxy test failed"
    echo "   But backend is accessible at: http://localhost:8080/api/v1/health"
fi

echo ""
echo "✅ Force clean and restart completed!"
echo ""
echo "🧪 Test your application now at: http://10.20.6.58"
echo ""
echo "💡 If issues persist:"
echo "   1. Check logs: docker logs bakong-notification-services-api"
echo "   2. Check frontend: docker logs bakong-notification-services-frontend"
echo "   3. Test backend: curl http://localhost:8080/api/v1/health"
echo "   4. Test frontend: curl http://localhost/api/v1/health"

