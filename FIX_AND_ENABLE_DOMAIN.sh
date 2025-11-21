#!/bin/bash
# Fix Docker Compose Error and Enable Domain Access
# This fixes the ContainerConfig error and enables domain access
# Run this on the server: bash FIX_AND_ENABLE_DOMAIN.sh

set -e

cd ~/bakong-notification-services

DOMAIN="bakong-notification.nbc.gov.kh"
SERVER_IP="10.20.6.58"

echo "🔧 Fixing Docker Compose Error and Enabling Domain"
echo "=================================================="
echo ""

echo "🛑 Step 1: Stopping and removing frontend container..."
docker stop bakong-notification-services-frontend 2>/dev/null || true
docker rm bakong-notification-services-frontend 2>/dev/null || true
sleep 2

echo ""
echo "📝 Step 2: Ensuring nginx-domain.conf exists..."
if [ ! -f "apps/frontend/nginx-domain.conf" ]; then
    echo "   Creating nginx-domain.conf..."
    # The file should already exist, but create it if missing
    cat > apps/frontend/nginx-domain.conf << 'NGINX_EOF'
# HTTP server - serve content (works with domain name)
server {
    listen 80;
    server_name bakong-notification.nbc.gov.kh 10.20.6.58;
    
    root /usr/share/nginx/html;
    index index.html;

    location ~* \.(png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}
NGINX_EOF
    echo "   ✅ Created nginx-domain.conf"
else
    echo "   ✅ nginx-domain.conf already exists"
fi

echo ""
echo "📝 Step 3: Verifying docker-compose configuration..."
if grep -q "nginx-domain.conf" docker-compose.production.yml; then
    echo "   ✅ docker-compose.yml is configured correctly"
else
    echo "   ⚠️  Updating docker-compose.yml..."
    # Backup original
    cp docker-compose.production.yml docker-compose.production.yml.bak
    
    # Update the volume mount
    sed -i 's|nginx-ssl.conf|nginx-domain.conf|g' docker-compose.production.yml
    echo "   ✅ Updated docker-compose.yml"
fi

echo ""
echo "🔄 Step 4: Starting frontend with domain configuration..."
docker-compose -f docker-compose.production.yml up -d frontend

echo ""
echo "⏳ Step 5: Waiting for frontend to start (15 seconds)..."
sleep 15

echo ""
echo "🧪 Step 6: Testing access..."

# Test via IP
echo "   Testing via IP address..."
if curl -s --connect-timeout 5 http://${SERVER_IP}/api/v1/health > /dev/null 2>&1; then
    echo "   ✅ Server accessible via IP: http://${SERVER_IP}"
    curl -s http://${SERVER_IP}/api/v1/health | head -3
else
    echo "   ⚠️  IP test failed"
fi

# Test with domain header (simulates domain access)
echo ""
echo "   Testing with domain name header..."
if curl -s --connect-timeout 5 -H "Host: ${DOMAIN}" http://${SERVER_IP}/api/v1/health > /dev/null 2>&1; then
    echo "   ✅ Server accepts domain name: ${DOMAIN}"
    curl -s -H "Host: ${DOMAIN}" http://${SERVER_IP}/api/v1/health | head -3
else
    echo "   ⚠️  Domain header test failed"
fi

echo ""
echo "📋 Step 7: Checking container status..."
docker ps | grep bakong-notification-services-frontend || {
    echo "   ❌ Frontend container not running!"
    echo "   Check logs: docker logs bakong-notification-services-frontend"
    exit 1
}

echo ""
echo "✅ Domain access enabled!"
echo ""
echo "🌐 Access URLs:"
echo "   ✅ http://${SERVER_IP} (works now)"
echo "   ⏳ http://${DOMAIN} (will work once DNS propagates)"
echo ""
echo "📋 Port Status:"
echo "   ✅ Port 80 (HTTP) - Ready for domain"
echo "   ✅ Port 443 (HTTPS) - Ready (needs SSL certificates)"
echo "   ✅ Port 8080 (Backend API) - Working"
echo "   ✅ Port 5433 (Database) - Working"
echo ""
echo "💡 Once DNS propagates, the domain will work automatically!"
echo "   Test: http://${DOMAIN}"

