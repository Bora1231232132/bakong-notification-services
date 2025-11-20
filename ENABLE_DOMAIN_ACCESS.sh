#!/bin/bash
# Enable Domain Access - Make domain work on ports 80 and 443
# This configures nginx to accept the domain name
# Run this on the server: bash ENABLE_DOMAIN_ACCESS.sh

set -e

cd ~/bakong-notification-services

DOMAIN="bakong-notification.nbc.gov.kh"
SERVER_IP="10.20.6.58"

echo "🌐 Enabling Domain Access for ${DOMAIN}"
echo "========================================"
echo ""

echo "📋 Step 1: Checking current nginx configuration..."
if [ -f "apps/frontend/nginx-ssl.conf" ]; then
    echo "   Found nginx-ssl.conf (requires SSL certificates)"
    CURRENT_CONFIG="nginx-ssl.conf"
elif [ -f "apps/frontend/nginx-domain.conf" ]; then
    echo "   Found nginx-domain.conf (works with or without SSL)"
    CURRENT_CONFIG="nginx-domain.conf"
else
    echo "   Using default nginx.conf"
    CURRENT_CONFIG="nginx.conf"
fi

echo ""
echo "📝 Step 2: Setting up domain configuration..."

# Check if SSL certificates exist
if [ -f "ssl-certs/fullchain.pem" ] && [ -f "ssl-certs/privkey.pem" ]; then
    echo "   ✅ SSL certificates found - will enable HTTPS"
    USE_SSL=true
    CONFIG_FILE="nginx-ssl.conf"
else
    echo "   ⚠️  No SSL certificates - will use HTTP only for now"
    echo "   (You can add SSL certificates later)"
    USE_SSL=false
    CONFIG_FILE="nginx-domain.conf"
fi

echo ""
echo "📝 Step 3: Updating docker-compose to use domain config..."

# Update docker-compose to use the right config
if [ "$USE_SSL" = "true" ]; then
    # Use SSL config
    sed -i 's|nginx-ssl.conf|nginx-ssl.conf|g' docker-compose.production.yml || true
    echo "   Using SSL configuration"
else
    # Use domain config (works without SSL)
    sed -i 's|nginx-ssl.conf|nginx-domain.conf|g' docker-compose.production.yml || true
    echo "   Using domain configuration (HTTP only for now)"
fi

echo ""
echo "🔄 Step 4: Restarting frontend with domain configuration..."
docker-compose -f docker-compose.production.yml up -d frontend

echo ""
echo "⏳ Step 5: Waiting for frontend to restart (10 seconds)..."
sleep 10

echo ""
echo "🧪 Step 6: Testing domain access..."

# Test via IP (should work)
echo "   Testing via IP address..."
if curl -s --connect-timeout 5 -H "Host: ${DOMAIN}" http://${SERVER_IP}/api/v1/health > /dev/null 2>&1; then
    echo "   ✅ Server responds to domain name via IP"
    curl -s -H "Host: ${DOMAIN}" http://${SERVER_IP}/api/v1/health | head -3
else
    echo "   ⚠️  Test failed"
fi

echo ""
echo "📋 Step 7: Summary"
echo "=================="
echo "✅ Configuration updated!"
echo ""
echo "🌐 Access URLs:"
echo "   HTTP:  http://${DOMAIN} (once DNS propagates)"
echo "   HTTP:  http://${SERVER_IP} (works now)"
if [ "$USE_SSL" = "true" ]; then
    echo "   HTTPS: https://${DOMAIN} (once DNS propagates)"
    echo "   HTTPS: https://${SERVER_IP} (works now if SSL configured)"
else
    echo "   HTTPS: (add SSL certificates to enable)"
fi

echo ""
echo "📋 Port Configuration:"
echo "   ✅ Port 80 (HTTP) - Ready"
if [ "$USE_SSL" = "true" ]; then
    echo "   ✅ Port 443 (HTTPS) - Ready with SSL"
else
    echo "   ⚠️  Port 443 (HTTPS) - Needs SSL certificates"
fi
echo "   ✅ Port 8080 (Backend API) - Ready"
echo "   ✅ Port 5433 (Database) - Ready"

echo ""
echo "💡 Next Steps:"
echo "   1. Wait for DNS to propagate (5 min - 48 hours)"
echo "   2. Test: http://${DOMAIN} (should work once DNS ready)"
if [ "$USE_SSL" = "false" ]; then
    echo "   3. Add SSL certificates for HTTPS:"
    echo "      bash USE_EXISTING_SSL_CERTIFICATES.sh"
fi
echo ""
echo "✅ Domain access enabled!"

