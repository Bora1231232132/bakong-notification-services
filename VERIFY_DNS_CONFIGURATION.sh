#!/bin/bash
# Verify DNS Configuration - Check what IT configured
# Run this to see if DNS is propagating
# Run this on the server: bash VERIFY_DNS_CONFIGURATION.sh

set -e

DOMAIN="bakong-notification.nbc.gov.kh"
SERVER_IP="10.20.6.58"

echo "🔍 Verifying DNS Configuration"
echo "=============================="
echo ""
echo "📋 Checking from multiple DNS servers..."
echo ""

# Check from different DNS servers
echo "1. Google DNS (8.8.8.8):"
dig @8.8.8.8 +short ${DOMAIN} 2>&1 || echo "   Not found"

echo ""
echo "2. Cloudflare DNS (1.1.1.1):"
dig @1.1.1.1 +short ${DOMAIN} 2>&1 || echo "   Not found"

echo ""
echo "3. System DNS:"
dig +short ${DOMAIN} 2>&1 || echo "   Not found"

echo ""
echo "4. Full DNS query:"
dig ${DOMAIN} +noall +answer 2>&1 | head -5

echo ""
echo "📋 Current Status:"
RESOLVED_IP=$(dig @8.8.8.8 +short ${DOMAIN} 2>/dev/null | head -1 || echo "")

if [ -z "$RESOLVED_IP" ]; then
    echo "❌ DNS record not found yet"
    echo ""
    echo "💡 Possible reasons:"
    echo "   1. DNS record was just created - needs time to propagate (5 min - 48 hours)"
    echo "   2. DNS record not created yet - verify with IT"
    echo "   3. DNS record created but wrong name/IP - check with IT"
    echo ""
    echo "📋 What to ask IT:"
    echo "   - Confirm DNS A record was created:"
    echo "     Name: ${DOMAIN}"
    echo "     Value: ${SERVER_IP}"
    echo "   - Ask for DNS propagation time"
    echo "   - Verify the exact domain name (no typos)"
else
    echo "✅ DNS record found!"
    echo "   Domain resolves to: $RESOLVED_IP"
    if [ "$RESOLVED_IP" = "$SERVER_IP" ]; then
        echo "   ✅ Correctly pointing to this server!"
    else
        echo "   ⚠️  Points to $RESOLVED_IP (should be $SERVER_IP)"
        echo "   Ask IT to update DNS record"
    fi
fi

echo ""
echo "📋 Server Status:"
if curl -s --connect-timeout 5 http://${SERVER_IP}/api/v1/health > /dev/null 2>&1; then
    echo "   ✅ Server is running and accessible via IP"
    echo "   ✅ Application is working!"
    echo ""
    echo "💡 Access the application now:"
    echo "   http://${SERVER_IP}"
    echo ""
    if [ -n "$RESOLVED_IP" ] && [ "$RESOLVED_IP" = "$SERVER_IP" ]; then
        echo "   https://${DOMAIN} (should work once DNS propagates to your location)"
    else
        echo "   ⏳ Waiting for DNS to propagate..."
        echo "   Use IP address for now: http://${SERVER_IP}"
    fi
else
    echo "   ⚠️  Server not accessible"
fi

echo ""
echo "💡 DNS Propagation Check:"
echo "   DNS changes can take 5 minutes to 48 hours to propagate worldwide"
echo "   Different locations may see the change at different times"
echo ""
echo "   Test from your computer:"
echo "   nslookup ${DOMAIN}"
echo "   or"
echo "   ping ${DOMAIN}"

