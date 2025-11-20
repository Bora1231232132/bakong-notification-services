#!/bin/bash
# Setup SSL for bakong-notification.nbc.gov.kh
# This script helps you set up SSL certificates using Let's Encrypt
# Run this on the server: bash SETUP_SSL_NOW.sh

set -e

cd ~/bakong-notification-services

DOMAIN="bakong-notification.nbc.gov.kh"
EMAIL="admin@nbc.gov.kh"  # Change this to your email

echo "🔐 SSL Certificate Setup for ${DOMAIN}"
echo "======================================"
echo ""

echo "📋 Prerequisites Check:"
echo "   1. Domain DNS must point to this server (10.20.6.58)"
echo "   2. Ports 80 and 443 must be open"
echo ""

# Check DNS
echo "🔍 Checking DNS..."
DNS_RESULT=$(nslookup ${DOMAIN} 2>/dev/null | grep -A 1 "Name:" | tail -1 | awk '{print $2}' || echo "")
if [ -n "$DNS_RESULT" ]; then
    echo "   DNS resolves to: $DNS_RESULT"
    if [ "$DNS_RESULT" = "10.20.6.58" ]; then
        echo "   ✅ DNS is correctly pointing to this server"
    else
        echo "   ⚠️  DNS points to $DNS_RESULT, not 10.20.6.58"
        echo "   Please update DNS first!"
        exit 1
    fi
else
    echo "   ⚠️  Could not resolve DNS. Please verify domain points to 10.20.6.58"
    read -p "   Continue anyway? (y/n): " continue_dns
    if [ "$continue_dns" != "y" ]; then
        exit 0
    fi
fi

echo ""
echo "📋 Choose SSL Certificate Option:"
echo "   1. Let's Encrypt (Free, Auto-renewing) - Recommended"
echo "   2. Use existing certificates from IT team"
echo "   3. Skip for now"
read -p "   Choose option (1/2/3): " ssl_option

if [ "$ssl_option" = "1" ]; then
    echo ""
    echo "🔐 Setting up Let's Encrypt certificate..."
    
    # Check if certbot is installed
    if ! command -v certbot &> /dev/null; then
        echo "   Installing certbot..."
        sudo apt-get update -qq
        sudo apt-get install -y certbot 2>/dev/null || {
            echo "   ❌ Could not install certbot"
            echo "   Please install manually: sudo apt-get install certbot"
            exit 1
        }
    fi
    
    echo ""
    echo "   ⚠️  IMPORTANT: Port 80 must be available for Let's Encrypt validation"
    echo "   We'll temporarily stop the frontend container..."
    read -p "   Continue? (y/n): " continue_certbot
    
    if [ "$continue_certbot" != "y" ]; then
        exit 0
    fi
    
    # Stop frontend to free port 80
    echo ""
    echo "   Stopping frontend container..."
    docker stop bakong-notification-services-frontend 2>/dev/null || true
    sleep 2
    
    # Run certbot
    echo ""
    echo "   Obtaining certificate from Let's Encrypt..."
    read -p "   Enter email for certificate notifications (default: ${EMAIL}): " user_email
    user_email=${user_email:-$EMAIL}
    
    sudo certbot certonly --standalone \
        -d "${DOMAIN}" \
        --non-interactive \
        --agree-tos \
        --email "${user_email}" \
        --preferred-challenges http || {
        echo ""
        echo "   ❌ Certbot failed!"
        echo "   Common issues:"
        echo "   1. Domain DNS not pointing to this server"
        echo "   2. Port 80 not accessible from internet"
        echo "   3. Firewall blocking port 80"
        echo ""
        echo "   Restarting frontend..."
        docker start bakong-notification-services-frontend 2>/dev/null || true
        exit 1
    }
    
    # Restart frontend
    echo ""
    echo "   ✅ Certificate obtained successfully!"
    echo "   Restarting frontend..."
    docker start bakong-notification-services-frontend 2>/dev/null || true
    
    CERT_PATH="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
    KEY_PATH="/etc/letsencrypt/live/${DOMAIN}/privkey.pem"
    
elif [ "$ssl_option" = "2" ]; then
    echo ""
    echo "📁 Using existing certificates..."
    echo ""
    echo "   Please provide the certificate files:"
    read -p "   Certificate file path (fullchain.pem or .crt): " CERT_PATH
    read -p "   Private key file path (privkey.pem or .key): " KEY_PATH
    
    if [ ! -f "$CERT_PATH" ] || [ ! -f "$KEY_PATH" ]; then
        echo "   ❌ Certificate files not found!"
        exit 1
    fi
    
    echo "   ✅ Found certificate files"
else
    echo "   Skipping SSL setup"
    exit 0
fi

echo ""
echo "📁 Step 2: Copying certificates to project directory..."
mkdir -p ssl-certs

if [ -f "$CERT_PATH" ] && [ -f "$KEY_PATH" ]; then
    sudo cp "$CERT_PATH" ssl-certs/fullchain.pem
    sudo cp "$KEY_PATH" ssl-certs/privkey.pem
    sudo chmod 644 ssl-certs/fullchain.pem
    sudo chmod 600 ssl-certs/privkey.pem
    sudo chown $USER:$USER ssl-certs/*.pem 2>/dev/null || true
    echo "   ✅ Certificates copied to ssl-certs/"
else
    echo "   ❌ Could not copy certificates"
    exit 1
fi

echo ""
echo "🔄 Step 3: Restarting frontend with SSL configuration..."
docker-compose -f docker-compose.production.yml up -d frontend

echo ""
echo "⏳ Step 4: Waiting for frontend to restart (10 seconds)..."
sleep 10

echo ""
echo "🧪 Step 5: Testing HTTPS..."
if curl -k -s https://localhost/api/v1/health > /dev/null 2>&1; then
    echo "   ✅ HTTPS is working locally!"
    curl -k -s https://localhost/api/v1/health | head -3
else
    echo "   ⚠️  Local HTTPS test failed (may need domain access)"
fi

echo ""
echo "✅ SSL setup completed!"
echo ""
echo "🌐 Your application should now be accessible at:"
echo "   https://${DOMAIN}"
echo ""
echo "💡 Next steps:"
echo "   1. Test from browser: https://${DOMAIN}"
echo "   2. Verify certificate: openssl s_client -connect ${DOMAIN}:443 -servername ${DOMAIN}"
echo ""
if [ "$ssl_option" = "1" ]; then
    echo "📋 Let's Encrypt Auto-Renewal:"
    echo "   Certificates auto-renew via certbot"
    echo "   Test renewal: sudo certbot renew --dry-run"
    echo "   Renewal is usually automatic via systemd timer"
fi

