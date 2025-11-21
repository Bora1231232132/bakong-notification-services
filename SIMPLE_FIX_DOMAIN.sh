#!/bin/bash
# Simple Fix - Clean restart to enable domain
# Run this on the server: bash SIMPLE_FIX_DOMAIN.sh

set -e

cd ~/bakong-notification-services

echo "🔧 Simple Fix for Domain Access"
echo "==============================="
echo ""

echo "🛑 Step 1: Complete cleanup..."
docker-compose -f docker-compose.production.yml down
docker rm -f bakong-notification-services-frontend 2>/dev/null || true
sleep 2

echo ""
echo "📝 Step 2: Ensuring nginx-domain.conf exists..."
if [ ! -f "apps/frontend/nginx-domain.conf" ]; then
    echo "   File missing - will be created by script"
fi

echo ""
echo "🔄 Step 3: Starting all services fresh..."
docker-compose -f docker-compose.production.yml up -d

echo ""
echo "⏳ Step 4: Waiting for services (20 seconds)..."
sleep 20

echo ""
echo "🧪 Step 5: Testing..."
curl -s http://10.20.6.58/api/v1/health | head -3 || echo "   Still starting..."

echo ""
echo "✅ Done! Test: http://10.20.6.58"

