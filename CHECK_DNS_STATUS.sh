#!/bin/bash
# Check DNS Status for bakong-notification.nbc.gov.kh
# Run this on the server: bash CHECK_DNS_STATUS.sh

set -e

DOMAIN="bakong-notification.nbc.gov.kh"
SERVER_IP="10.20.6.58"

echo "🔍 DNS Status Check for ${DOMAIN}"
echo "=================================="
echo ""

echo "📋 Step 1: Checking DNS resolution..."
if command -v nslookup &> /dev/null; then
    echo "   Using nslookup:"
    nslookup ${DOMAIN} 2>&1 | grep -A 2 "Name:" || echo "   ❌ Domain not found"
fi

if command -v dig &> /dev/null; then
    echo ""
    echo "   Using dig:"
    dig +short ${DOMAIN} 2>&1 || echo "   ❌ Domain not found"
fi

echo ""
echo "📋 Step 2: Checking if domain points to this server..."
RESOLVED_IP=$(dig +short ${DOMAIN} 2>/dev/null | head -1 || echo "")

if [ -n "$RESOLVED_IP" ]; then
    echo "   Domain resolves to: $RESOLVED_IP"
    if [ "$RESOLVED_IP" = "$SERVER_IP" ]; then
        echo "   ✅ DNS is correctly pointing to this server ($SERVER_IP)"
    else
        echo "   ⚠️  DNS points to $RESOLVED_IP, not $SERVER_IP"
        echo "   DNS needs to be updated!"
    fi
else
    echo "   ❌ Domain does not resolve (DNS not configured)"
fi

echo ""
echo "📋 Step 3: Testing server accessibility..."
if curl -s --connect-timeout 5 http://${SERVER_IP}/api/v1/health > /dev/null 2>&1; then
    echo "   ✅ Server is accessible via IP: http://${SERVER_IP}"
    curl -s http://${SERVER_IP}/api/v1/health | head -3
else
    echo "   ⚠️  Server not accessible via IP (may be firewall issue)"
fi

echo ""
echo "📋 Step 4: Summary"
echo "=================="
if [ -z "$RESOLVED_IP" ]; then
    echo "❌ DNS is NOT configured"
    echo ""
    echo "💡 Solutions:"
    echo "   1. Contact IT team to create DNS A record:"
    echo "      Name: ${DOMAIN}"
    echo "      Value: ${SERVER_IP}"
    echo ""
    echo "   2. Use IP address for now:"
    echo "      http://${SERVER_IP}"
    echo "      https://${SERVER_IP} (if SSL configured)"
elif [ "$RESOLVED_IP" != "$SERVER_IP" ]; then
    echo "⚠️  DNS is configured but points to wrong IP"
    echo "   Current: $RESOLVED_IP"
    echo "   Should be: $SERVER_IP"
    echo ""
    echo "💡 Contact IT team to update DNS A record"
else
    echo "✅ DNS is correctly configured!"
    echo "   Domain: ${DOMAIN}"
    echo "   IP: ${SERVER_IP}"
    echo ""
    echo "💡 Test in browser:"
    echo "   http://${DOMAIN}"
    echo "   https://${DOMAIN} (if SSL configured)"
fi

