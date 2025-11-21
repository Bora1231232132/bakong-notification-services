#!/bin/bash
# Check and Fix Connection Issues
# Run this on the server: bash CHECK_AND_FIX_CONNECTION.sh

set -e

cd ~/bakong-notification-services

echo "🔍 Checking Service Status"
echo "=========================="
echo ""

echo "📋 Step 1: Checking container status..."
docker ps -a | grep bakong-notification-services || echo "   No containers found"

echo ""
echo "📋 Step 2: Checking if containers are running..."
RUNNING=$(docker ps | grep bakong-notification-services | wc -l)
echo "   Running containers: $RUNNING"

if [ "$RUNNING" -lt 3 ]; then
    echo "   ⚠️  Not all containers are running!"
    echo ""
    echo "🔄 Step 3: Starting all services..."
    docker-compose -f docker-compose.production.yml up -d
    
    echo ""
    echo "⏳ Waiting 30 seconds for services to start..."
    sleep 30
else
    echo "   ✅ All containers are running"
fi

echo ""
echo "📋 Step 4: Checking port accessibility..."

# Check port 80
if netstat -tlnp 2>/dev/null | grep -q ":80 " || ss -tlnp 2>/dev/null | grep -q ":80 "; then
    echo "   ✅ Port 80 is listening"
else
    echo "   ❌ Port 80 is NOT listening"
    echo "   Checking frontend container..."
    docker logs --tail 20 bakong-notification-services-frontend 2>/dev/null | tail -10
fi

# Check port 8080
if netstat -tlnp 2>/dev/null | grep -q ":8080 " || ss -tlnp 2>/dev/null | grep -q ":8080 "; then
    echo "   ✅ Port 8080 is listening"
else
    echo "   ❌ Port 8080 is NOT listening"
    echo "   Checking backend container..."
    docker logs --tail 20 bakong-notification-services-api 2>/dev/null | tail -10
fi

echo ""
echo "📋 Step 5: Testing from inside containers..."

# Test backend from inside
if docker exec bakong-notification-services-api wget -q -O- http://localhost:8080/api/v1/health > /dev/null 2>&1; then
    echo "   ✅ Backend is working inside container"
else
    echo "   ❌ Backend not responding inside container"
    echo "   Backend logs:"
    docker logs --tail 30 bakong-notification-services-api 2>/dev/null | grep -i "error\|started\|listening" | tail -10
fi

# Test frontend from inside
if docker exec bakong-notification-services-frontend wget -q -O- http://localhost/api/v1/health > /dev/null 2>&1; then
    echo "   ✅ Frontend proxy is working inside container"
else
    echo "   ⚠️  Frontend proxy test failed"
fi

echo ""
echo "📋 Step 6: Testing from host..."

# Test backend
if curl -s --connect-timeout 5 http://localhost:8080/api/v1/health > /dev/null 2>&1; then
    echo "   ✅ Backend accessible from host: http://localhost:8080"
    curl -s http://localhost:8080/api/v1/health | head -3
else
    echo "   ❌ Backend NOT accessible from host"
fi

# Test frontend
if curl -s --connect-timeout 5 http://localhost/api/v1/health > /dev/null 2>&1; then
    echo "   ✅ Frontend accessible from host: http://localhost"
    curl -s http://localhost/api/v1/health | head -3
else
    echo "   ❌ Frontend NOT accessible from host"
    echo "   Frontend logs:"
    docker logs --tail 30 bakong-notification-services-frontend 2>/dev/null | tail -15
fi

echo ""
echo "📋 Step 7: Checking firewall..."
if command -v ufw &> /dev/null; then
    echo "   UFW status:"
    sudo ufw status | head -5 || echo "   Could not check UFW"
elif command -v firewall-cmd &> /dev/null; then
    echo "   Firewalld status:"
    sudo firewall-cmd --list-all 2>/dev/null | head -10 || echo "   Could not check firewalld"
else
    echo "   ⚠️  Could not detect firewall type"
fi

echo ""
echo "📋 Step 8: Summary and Recommendations"
echo "======================================"
echo ""
echo "If services are running but not accessible:"
echo "   1. Check firewall: sudo ufw allow 80,443,8080/tcp"
echo "   2. Check if ports are bound to 0.0.0.0 (not just localhost)"
echo "   3. Verify containers are healthy: docker ps"
echo ""
echo "If containers are not running:"
echo "   1. Check logs: docker logs bakong-notification-services-frontend"
echo "   2. Restart: docker-compose -f docker-compose.production.yml restart"
echo "   3. Rebuild if needed: docker-compose -f docker-compose.production.yml up -d --build"

