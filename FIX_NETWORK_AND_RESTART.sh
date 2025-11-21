#!/bin/bash
# Fix Network Connectivity and Restart All Services
# This ensures containers are properly networked via docker-compose
# Run this on the server: bash FIX_NETWORK_AND_RESTART.sh

set -e

cd ~/bakong-notification-services

echo "🛑 Step 1: Stopping and removing all containers..."
docker-compose -f docker-compose.production.yml down 2>/dev/null || true

# Force remove containers by name if they still exist
echo "   Force removing containers if they exist..."
docker rm -f bakong-notification-services-api bakong-notification-services-frontend bakong-notification-services-db 2>/dev/null || true

# Remove any orphaned networks
docker network rm bakong-notification-services_bakong-network bakong-network 2>/dev/null || true

echo ""
echo "🔍 Step 2: Checking for running containers..."
docker ps -a | grep bakong-notification-services || echo "   No containers found"

echo ""
echo "🔍 Step 3: Ensuring database columns exist..."
# Start DB temporarily to add columns if needed
# First check if DB container exists and is running
if docker ps | grep -q bakong-notification-services-db; then
    echo "   DB container is running, using it..."
elif docker ps -a | grep -q bakong-notification-services-db; then
    echo "   DB container exists but stopped, starting it..."
    docker start bakong-notification-services-db
    sleep 5
else
    echo "   Starting DB container..."
    docker-compose -f docker-compose.production.yml up -d db
    sleep 5
fi

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
echo "🔄 Step 4: Starting all services with docker-compose (ensures proper networking)..."
docker-compose -f docker-compose.production.yml up -d

echo ""
echo "⏳ Step 5: Waiting for services to start (45 seconds)..."
sleep 45

echo ""
echo "🔍 Step 6: Checking container status..."
docker ps | grep -E "bakong-notification-services-(api|frontend|db)" || {
    echo "❌ Some containers are not running!"
    docker ps -a | grep bakong-notification-services
    exit 1
}

echo ""
echo "🔍 Step 7: Testing backend health from host..."
for i in {1..5}; do
    if curl -s http://localhost:8080/api/v1/health > /dev/null 2>&1; then
        echo "✅ Backend is healthy!"
        curl -s http://localhost:8080/api/v1/health | head -3
        break
    else
        echo "⏳ Waiting for backend... (attempt $i/5)"
        sleep 5
    fi
done

if ! curl -s http://localhost:8080/api/v1/health > /dev/null 2>&1; then
    echo "❌ Backend not responding after 25 seconds"
    echo "   Check logs: docker logs bakong-notification-services-api"
    exit 1
fi

echo ""
echo "🔍 Step 8: Testing backend connectivity from frontend container..."
# Install curl in frontend if needed, or use wget
if docker exec bakong-notification-services-frontend curl -s http://backend:8080/api/v1/health > /dev/null 2>&1; then
    echo "✅ Frontend can reach backend via 'backend' hostname!"
elif docker exec bakong-notification-services-frontend wget -q -O- http://backend:8080/api/v1/health > /dev/null 2>&1; then
    echo "✅ Frontend can reach backend via 'backend' hostname (using wget)!"
else
    echo "❌ Frontend still cannot reach backend"
    echo "   Testing network connectivity..."
    docker exec bakong-notification-services-frontend ping -c 2 backend 2>&1 || {
        echo "   ❌ Cannot ping 'backend' hostname"
        echo "   Trying container name..."
        docker exec bakong-notification-services-frontend ping -c 2 bakong-notification-services-api 2>&1 || {
            echo "   ❌ Cannot ping container name either"
            echo "   Checking network..."
            docker network inspect bakong-network | grep -A 10 "bakong-notification-services-api" || {
                echo "   ❌ Backend not in network!"
            }
        }
    }
fi

echo ""
echo "🔍 Step 9: Checking nginx configuration..."
docker exec bakong-notification-services-frontend cat /etc/nginx/conf.d/default.conf 2>/dev/null | grep -A 2 "proxy_pass" | head -5 || {
    echo "⚠️  Could not read nginx config"
}

echo ""
echo "🔍 Step 10: Testing frontend from host..."
if curl -s http://localhost/api/v1/health > /dev/null 2>&1; then
    echo "✅ Frontend proxy is working!"
    curl -s http://localhost/api/v1/health | head -3
else
    echo "⚠️  Frontend proxy not responding"
    echo "   Testing direct backend: curl http://localhost:8080/api/v1/health"
    curl -s http://localhost:8080/api/v1/health | head -3 || echo "   Backend also not accessible"
fi

echo ""
echo "✅ Network fix completed!"
echo ""
echo "💡 If issues persist:"
echo "   1. Check all containers: docker ps"
echo "   2. Check backend logs: docker logs bakong-notification-services-api"
echo "   3. Check frontend logs: docker logs bakong-notification-services-frontend"
echo "   4. Check network: docker network inspect bakong-network"
echo "   5. Test from frontend: docker exec bakong-notification-services-frontend wget -O- http://backend:8080/api/v1/health"

