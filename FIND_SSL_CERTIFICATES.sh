#!/bin/bash
# Find SSL Certificates on the Server
# Run this to locate existing SSL certificates

echo "🔍 Searching for SSL certificates..."

DOMAIN="bakong-notification.nbc.gov.kh"

echo ""
echo "📋 Checking common locations:"
echo ""

# Check Let's Encrypt
if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    echo "✅ Found Let's Encrypt certificate:"
    echo "   Certificate: /etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
    echo "   Private Key: /etc/letsencrypt/live/${DOMAIN}/privkey.pem"
    echo ""
    echo "   Use these paths in the setup script!"
elif [ -d "/etc/letsencrypt/live" ]; then
    echo "⚠️  Let's Encrypt directory exists but no certificate for ${DOMAIN}"
    echo "   Available domains:"
    ls -1 /etc/letsencrypt/live/ 2>/dev/null || echo "   (none found)"
fi

echo ""

# Check system SSL
if [ -f "/etc/ssl/certs/${DOMAIN}.crt" ]; then
    echo "✅ Found system SSL certificate:"
    echo "   Certificate: /etc/ssl/certs/${DOMAIN}.crt"
    echo "   Private Key: /etc/ssl/private/${DOMAIN}.key"
    echo ""
    echo "   Use these paths in the setup script!"
fi

echo ""

# Check for any .pem, .crt, .key files
echo "🔍 Searching for certificate files..."
find /etc -name "*.pem" -o -name "*.crt" 2>/dev/null | grep -i "bakong\|notification\|nbc" | head -10

echo ""
echo "💡 If you don't have certificates yet:"
echo "   1. Use Let's Encrypt (free):"
echo "      sudo certbot certonly --standalone -d ${DOMAIN}"
echo ""
echo "   2. Or ask your IT team for the SSL certificates"
echo "      They should provide:"
echo "      - Certificate file (fullchain.pem or .crt)"
echo "      - Private key file (privkey.pem or .key)"

