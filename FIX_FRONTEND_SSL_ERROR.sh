#!/bin/bash
# Fix Frontend SSL Certificate Error
# This script switches to HTTP-only nginx config when SSL certificates are missing
# Run this on the server: bash FIX_FRONTEND_SSL_ERROR.sh

set -e

cd ~/bakong-notification-services

echo "🔧 Fixing Frontend SSL Certificate Error"
echo "=========================================="

echo "📋 Step 1: Checking if SSL certificates exist..."
if [ -f "./ssl-certs/fullchain.pem" ] && [ -f "./ssl-certs/privkey.pem" ]; then
    echo "   ✅ SSL certificates found - using nginx-domain.conf (HTTP + HTTPS)"
    NGINX_CONFIG="nginx-domain.conf"
else
    echo "   ⚠️  SSL certificates NOT found - using HTTP-only config"
    NGINX_CONFIG="nginx-http-only.conf"
    echo "   📝 Copying HTTP-only config to replace domain config..."
    cp ./apps/frontend/nginx-http-only.conf ./apps/frontend/nginx-domain.conf
fi

echo "🛑 Step 2: Stopping and removing frontend container..."
docker stop bakong-notification-services-frontend 2>/dev/null || true
docker rm -f bakong-notification-services-frontend 2>/dev/null || true

echo "🚀 Step 3: Starting frontend container with docker-compose..."
docker-compose -f docker-compose.production.yml up -d frontend

echo "⏳ Step 4: Waiting for frontend to start (15 seconds)..."
sleep 15

echo "🧪 Step 5: Testing frontend..."
if curl -s http://localhost > /dev/null 2>&1; then
    echo "   ✅ Frontend is responding on port 80!"
    echo "   ✅ Backend proxy test..."
    if curl -s http://localhost/api/v1/health > /dev/null 2>&1; then
        echo "   ✅ Backend proxy is working!"
    else
        echo "   ⚠️  Backend proxy test failed (backend might still be starting)"
    fi
else
    echo "   ❌ Frontend not responding. Checking logs..."
    docker logs bakong-notification-services-frontend --tail 20
fi

echo ""
echo "✅ Done!"
echo "📌 Access your application:"
echo "   - HTTP: http://10.20.6.58"
echo "   - Domain (if DNS works): http://bakong-notification.nbc.gov.kh"
echo ""
if [ "$NGINX_CONFIG" = "nginx-http-only.conf" ]; then
    echo "💡 To enable HTTPS later:"
    echo "   1. Place SSL certificates in ./ssl-certs/"
    echo "   2. Restore nginx-domain.conf: git checkout apps/frontend/nginx-domain.conf"
    echo "   3. Restart: docker-compose -f docker-compose.production.yml restart frontend"
fi

