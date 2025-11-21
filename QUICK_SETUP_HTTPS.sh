#!/bin/bash
# Quick Setup HTTPS for bakong-notification.nbc.gov.kh
# Run this on the server: bash QUICK_SETUP_HTTPS.sh

set -e

cd ~/bakong-notification-services

DOMAIN="bakong-notification.nbc.gov.kh"

echo "🔍 Step 1: Checking for SSL certificates..."

# Check common locations
if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    CERT_PATH="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
    KEY_PATH="/etc/letsencrypt/live/${DOMAIN}/privkey.pem"
    echo "✅ Found Let's Encrypt certificates"
elif [ -f "/etc/ssl/certs/${DOMAIN}.crt" ]; then
    CERT_PATH="/etc/ssl/certs/${DOMAIN}.crt"
    KEY_PATH="/etc/ssl/private/${DOMAIN}.key"
    echo "✅ Found SSL certificates in /etc/ssl/"
else
    echo "⚠️  No SSL certificates found"
    echo ""
    echo "📋 Option 1: Use Let's Encrypt (Free SSL)"
    echo "   Run: sudo certbot certonly --standalone -d ${DOMAIN}"
    echo "   Make sure domain DNS points to this server (10.20.6.58) first!"
    echo ""
    echo "📋 Option 2: Use existing certificates"
    echo "   Place certificates in: ~/bakong-notification-services/ssl-certs/"
    echo "   Files needed: fullchain.pem and privkey.pem"
    echo ""
    read -p "Do you have certificates ready? (y/n): " has_certs
    
    if [ "$has_certs" != "y" ]; then
        echo "   Please set up certificates first, then run this script again"
        exit 0
    fi
    
    # Ask for certificate paths
    read -p "Enter full path to certificate file (fullchain.pem): " CERT_PATH
    read -p "Enter full path to private key file (privkey.pem): " KEY_PATH
    
    if [ ! -f "$CERT_PATH" ] || [ ! -f "$KEY_PATH" ]; then
        echo "❌ Certificate files not found"
        exit 1
    fi
fi

echo ""
echo "📁 Step 2: Creating ssl-certs directory..."
mkdir -p ssl-certs

echo ""
echo "📋 Step 3: Copying certificates..."
if [ -f "$CERT_PATH" ] && [ -f "$KEY_PATH" ]; then
    sudo cp "$CERT_PATH" ssl-certs/fullchain.pem
    sudo cp "$KEY_PATH" ssl-certs/privkey.pem
    sudo chmod 644 ssl-certs/fullchain.pem
    sudo chmod 600 ssl-certs/privkey.pem
    sudo chown $USER:$USER ssl-certs/*.pem 2>/dev/null || true
    echo "✅ Certificates copied to ssl-certs/"
else
    echo "❌ Could not copy certificates"
    exit 1
fi

echo ""
echo "🔄 Step 4: Restarting frontend with SSL configuration..."
docker-compose -f docker-compose.production.yml up -d frontend

echo ""
echo "⏳ Step 5: Waiting for frontend to restart (10 seconds)..."
sleep 10

echo ""
echo "🧪 Step 6: Testing HTTPS..."
if curl -k -s https://localhost/api/v1/health > /dev/null 2>&1; then
    echo "✅ HTTPS is working!"
    curl -k -s https://localhost/api/v1/health | head -3
else
    echo "⚠️  Local HTTPS test failed (may need domain access)"
fi

echo ""
echo "✅ HTTPS setup completed!"
echo ""
echo "🌐 Your application should be accessible at:"
echo "   https://${DOMAIN}"
echo ""
echo "💡 Verify:"
echo "   1. DNS points to this server: nslookup ${DOMAIN}"
echo "   2. Port 443 is open"
echo "   3. Test: curl -I https://${DOMAIN}"

