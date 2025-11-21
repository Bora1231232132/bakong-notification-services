#!/bin/bash
# Fix Domain Access - Workaround for docker-compose bug
# Uses docker directly to avoid ContainerConfig error
# Run this on the server: bash FIX_DOMAIN_WORKAROUND.sh

set -e

cd ~/bakong-notification-services

DOMAIN="bakong-notification.nbc.gov.kh"
SERVER_IP="10.20.6.58"

echo "🔧 Fixing Domain Access (Workaround)"
echo "===================================="
echo ""

echo "🛑 Step 1: Stopping and removing frontend container..."
docker stop bakong-notification-services-frontend 2>/dev/null || true
docker rm -f bakong-notification-services-frontend 2>/dev/null || true

# Remove any containers with weird names
docker ps -a | grep -E "a23d70da7d44|bakong.*frontend" | awk '{print $1}' | xargs -r docker rm -f 2>/dev/null || true

sleep 2

echo ""
echo "📝 Step 2: Ensuring configuration files exist..."
mkdir -p ssl-certs

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
fi

echo ""
echo "🔄 Step 3: Building frontend image if needed..."
# Check if image exists
if ! docker images | grep -q "bakong-notification-services_frontend"; then
    echo "   Building frontend image..."
    docker-compose -f docker-compose.production.yml build frontend
else
    echo "   ✅ Frontend image exists"
fi

echo ""
echo "🔄 Step 4: Starting frontend using docker run (bypasses docker-compose bug)..."
# Get the image name
IMAGE_NAME=$(docker images | grep "bakong-notification-services_frontend" | head -1 | awk '{print $1":"$2}' || echo "bakong-notification-services_frontend:latest")

# Get network name
NETWORK_NAME=$(docker network ls | grep bakong | head -1 | awk '{print $1}' || echo "bakong-network")

# Create network if it doesn't exist
docker network create bakong-network 2>/dev/null || true

# Start container using docker run directly
docker run -d \
    --name bakong-notification-services-frontend \
    --network bakong-network \
    -p 80:80 \
    -p 443:443 \
    -v "$(pwd)/ssl-certs:/etc/nginx/ssl:ro" \
    -v "$(pwd)/apps/frontend/nginx-domain.conf:/etc/nginx/conf.d/default.conf:ro" \
    --restart unless-stopped \
    "$IMAGE_NAME" || {
    echo "   ⚠️  Docker run failed, trying docker-compose with force recreate..."
    docker-compose -f docker-compose.production.yml up -d --force-recreate --no-deps frontend
}

echo ""
echo "⏳ Step 5: Waiting for frontend to start (15 seconds)..."
sleep 15

echo ""
echo "🧪 Step 6: Testing access..."
if curl -s --connect-timeout 5 http://${SERVER_IP}/api/v1/health > /dev/null 2>&1; then
    echo "   ✅ Server accessible: http://${SERVER_IP}"
    curl -s http://${SERVER_IP}/api/v1/health | head -3
else
    echo "   ⚠️  Test failed - checking container..."
    docker ps | grep frontend
    docker logs --tail 20 bakong-notification-services-frontend 2>/dev/null | tail -10
fi

echo ""
echo "📋 Step 7: Container status..."
docker ps | grep -E "frontend|api|db"

echo ""
echo "✅ Domain access configured!"
echo ""
echo "🌐 Access:"
echo "   ✅ http://${SERVER_IP} (works now)"
echo "   ⏳ http://${DOMAIN} (will work once DNS propagates)"

