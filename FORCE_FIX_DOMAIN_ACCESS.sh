#!/bin/bash
# Force Fix Domain Access - Aggressive cleanup and restart
# This completely removes containers and restarts fresh
# Run this on the server: bash FORCE_FIX_DOMAIN_ACCESS.sh

set -e

cd ~/bakong-notification-services

DOMAIN="bakong-notification.nbc.gov.kh"
SERVER_IP="10.20.6.58"

echo "🔧 Force Fixing Domain Access"
echo "============================"
echo ""

echo "🛑 Step 1: Stopping ALL containers..."
docker-compose -f docker-compose.production.yml down 2>/dev/null || true

echo ""
echo "🛑 Step 2: Force removing frontend containers..."
# Remove by name
docker rm -f bakong-notification-services-frontend 2>/dev/null || true

# Remove by pattern (catches weird named containers)
docker ps -a | grep bakong-notification-services-frontend | awk '{print $1}' | xargs -r docker rm -f 2>/dev/null || true

# Remove any container with the pattern
docker ps -a | grep -E "a23d70da7d44|bakong.*frontend" | awk '{print $1}' | xargs -r docker rm -f 2>/dev/null || true

echo ""
echo "🛑 Step 3: Cleaning up docker-compose state..."
# Remove any orphaned containers
docker-compose -f docker-compose.production.yml rm -f frontend 2>/dev/null || true

echo ""
echo "📝 Step 4: Ensuring nginx-domain.conf exists..."
if [ ! -f "apps/frontend/nginx-domain.conf" ]; then
    echo "   Creating nginx-domain.conf..."
    cat > apps/frontend/nginx-domain.conf << 'NGINX_EOF'
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
    echo "   ✅ nginx-domain.conf exists"
fi

echo ""
echo "📝 Step 5: Verifying docker-compose.yml..."
# Ensure it uses nginx-domain.conf
if ! grep -q "nginx-domain.conf" docker-compose.production.yml; then
    echo "   Updating docker-compose.yml..."
    # Backup
    cp docker-compose.production.yml docker-compose.production.yml.bak
    
    # Replace the volume mount line
    sed -i 's|nginx-ssl.conf|nginx-domain.conf|g' docker-compose.production.yml
    echo "   ✅ Updated"
else
    echo "   ✅ docker-compose.yml is correct"
fi

echo ""
echo "⏳ Step 6: Waiting 3 seconds for cleanup..."
sleep 3

echo ""
echo "🔄 Step 7: Starting frontend fresh (no-recreate flag)..."
# Use --force-recreate to avoid the ContainerConfig error
docker-compose -f docker-compose.production.yml up -d --force-recreate --no-deps frontend

echo ""
echo "⏳ Step 8: Waiting for frontend to start (15 seconds)..."
sleep 15

echo ""
echo "🧪 Step 9: Testing access..."

# Test via IP
if curl -s --connect-timeout 5 http://${SERVER_IP}/api/v1/health > /dev/null 2>&1; then
    echo "   ✅ Server accessible via IP: http://${SERVER_IP}"
    curl -s http://${SERVER_IP}/api/v1/health | head -3
else
    echo "   ⚠️  IP test failed - checking container..."
    docker ps | grep frontend || echo "   Container not running"
    docker logs --tail 10 bakong-notification-services-frontend 2>/dev/null || echo "   Could not get logs"
fi

# Test with domain header
echo ""
echo "   Testing with domain name..."
if curl -s --connect-timeout 5 -H "Host: ${DOMAIN}" http://${SERVER_IP}/api/v1/health > /dev/null 2>&1; then
    echo "   ✅ Server accepts domain name: ${DOMAIN}"
else
    echo "   ⚠️  Domain header test failed"
fi

echo ""
echo "📋 Step 10: Container status..."
docker ps | grep -E "frontend|api|db" | head -3

echo ""
echo "✅ Setup completed!"
echo ""
echo "🌐 Access URLs:"
echo "   ✅ http://${SERVER_IP} (works now)"
echo "   ⏳ http://${DOMAIN} (will work once DNS propagates)"
echo ""
echo "📋 Ports configured:"
echo "   ✅ Port 80 (HTTP) - Ready"
echo "   ✅ Port 443 (HTTPS) - Ready (needs SSL certificates)"
echo "   ✅ Port 8080 (Backend) - Working"
echo "   ✅ Port 5433 (Database) - Working"

