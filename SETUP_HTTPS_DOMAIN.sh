#!/bin/bash
# Setup HTTPS for bakong-notification.nbc.gov.kh
# This script configures SSL certificates and updates nginx configuration
# Run this on the server: bash SETUP_HTTPS_DOMAIN.sh

set -e

cd ~/bakong-notification-services

DOMAIN="bakong-notification.nbc.gov.kh"
CERT_DIR="/etc/letsencrypt/live/${DOMAIN}"
CERT_PATH="${CERT_DIR}/fullchain.pem"
KEY_PATH="${CERT_DIR}/privkey.pem"

echo "🔍 Step 1: Checking for existing SSL certificates..."
if [ -f "$CERT_PATH" ] && [ -f "$KEY_PATH" ]; then
    echo "✅ Found existing SSL certificates at:"
    echo "   Certificate: $CERT_PATH"
    echo "   Key: $KEY_PATH"
    USE_EXISTING_CERTS=true
elif [ -d "/etc/ssl/certs" ] && [ -f "/etc/ssl/certs/${DOMAIN}.crt" ]; then
    echo "✅ Found SSL certificate in /etc/ssl/certs/"
    CERT_PATH="/etc/ssl/certs/${DOMAIN}.crt"
    KEY_PATH="/etc/ssl/private/${DOMAIN}.key"
    USE_EXISTING_CERTS=true
else
    echo "⚠️  No existing SSL certificates found"
    echo "   Options:"
    echo "   1. Use Let's Encrypt (certbot) - Recommended for free SSL"
    echo "   2. Use existing certificates in a different location"
    echo "   3. Skip SSL setup (HTTPS won't work)"
    read -p "   Choose option (1/2/3): " cert_option
    
    if [ "$cert_option" = "1" ]; then
        echo ""
        echo "📋 Step 2: Setting up Let's Encrypt certificate..."
        echo "   Installing certbot if needed..."
        sudo apt-get update -qq
        sudo apt-get install -y certbot python3-certbot-nginx 2>/dev/null || {
            echo "   ⚠️  Could not install certbot automatically"
            echo "   Please install certbot manually: sudo apt-get install certbot python3-certbot-nginx"
            exit 1
        }
        
        echo ""
        echo "   Obtaining certificate for ${DOMAIN}..."
        echo "   ⚠️  Make sure the domain ${DOMAIN} points to this server (10.20.6.58)"
        echo "   ⚠️  Ports 80 and 443 must be open"
        read -p "   Continue with certbot? (y/n): " continue_certbot
        
        if [ "$continue_certbot" = "y" ]; then
            # Stop nginx temporarily for certbot
            docker stop bakong-notification-services-frontend 2>/dev/null || true
            sleep 2
            
            # Run certbot
            sudo certbot certonly --standalone -d "${DOMAIN}" --non-interactive --agree-tos --email admin@nbc.gov.kh || {
                echo "   ❌ Certbot failed. You may need to:"
                echo "      1. Ensure domain DNS points to this server"
                echo "      2. Ensure ports 80 and 443 are open"
                echo "      3. Run manually: sudo certbot certonly --standalone -d ${DOMAIN}"
                docker start bakong-notification-services-frontend 2>/dev/null || true
                exit 1
            }
            
            docker start bakong-notification-services-frontend 2>/dev/null || true
            USE_EXISTING_CERTS=true
        else
            echo "   Skipping certificate setup"
            exit 0
        fi
    elif [ "$cert_option" = "2" ]; then
        read -p "   Enter certificate file path: " custom_cert
        read -p "   Enter private key file path: " custom_key
        if [ -f "$custom_cert" ] && [ -f "$custom_key" ]; then
            CERT_PATH="$custom_cert"
            KEY_PATH="$custom_key"
            USE_EXISTING_CERTS=true
        else
            echo "   ❌ Certificate files not found"
            exit 1
        fi
    else
        echo "   Skipping SSL setup"
        exit 0
    fi
fi

echo ""
echo "📝 Step 3: Updating nginx configuration with SSL..."

# Create updated nginx.conf with SSL
cat > /tmp/nginx-ssl.conf << 'NGINX_EOF'
server {
    listen 80;
    server_name bakong-notification.nbc.gov.kh;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name bakong-notification.nbc.gov.kh;
    
    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    root /usr/share/nginx/html;
    index index.html;

    # Serve static files directly (favicon, images, etc.)
    location ~* \.(png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # Handle client-side routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
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

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;
}
NGINX_EOF

echo ""
echo "📋 Step 4: Copying SSL certificates into container..."
# Create directory structure for certificates
mkdir -p ssl-certs

# Copy certificates to local directory
if [ "$USE_EXISTING_CERTS" = "true" ]; then
    echo "   Copying certificates from $CERT_PATH and $KEY_PATH"
    sudo cp "$CERT_PATH" ssl-certs/fullchain.pem
    sudo cp "$KEY_PATH" ssl-certs/privkey.pem
    sudo chmod 644 ssl-certs/fullchain.pem
    sudo chmod 600 ssl-certs/privkey.pem
    sudo chown $USER:$USER ssl-certs/*.pem 2>/dev/null || true
fi

echo ""
echo "📝 Step 5: Updating docker-compose to mount certificates..."
# Check if volumes are already added
if ! grep -q "ssl-certs" docker-compose.production.yml; then
    echo "   Adding certificate volumes to docker-compose.production.yml..."
    # Add volumes to frontend service
    sed -i '/container_name: bakong-notification-services-frontend/a\    volumes:\n      - ./ssl-certs:/etc/nginx/ssl:ro\n      - ./apps/frontend/nginx-ssl.conf:/etc/nginx/conf.d/default.conf:ro' docker-compose.production.yml || {
        echo "   ⚠️  Could not auto-update docker-compose.production.yml"
        echo "   Please manually add to frontend service:"
        echo "   volumes:"
        echo "     - ./ssl-certs:/etc/nginx/ssl:ro"
        echo "     - ./apps/frontend/nginx-ssl.conf:/etc/nginx/conf.d/default.conf:ro"
    }
fi

echo ""
echo "📝 Step 6: Saving updated nginx configuration..."
cp /tmp/nginx-ssl.conf apps/frontend/nginx-ssl.conf
chmod 644 apps/frontend/nginx-ssl.conf

echo ""
echo "🔄 Step 7: Restarting frontend container with SSL configuration..."
docker-compose -f docker-compose.production.yml up -d frontend

echo ""
echo "⏳ Step 8: Waiting for frontend to start (10 seconds)..."
sleep 10

echo ""
echo "🧪 Step 9: Testing HTTPS connection..."
if curl -k -s https://localhost/api/v1/health > /dev/null 2>&1; then
    echo "✅ HTTPS is working locally!"
elif curl -s https://${DOMAIN}/api/v1/health > /dev/null 2>&1; then
    echo "✅ HTTPS is working via domain!"
else
    echo "⚠️  HTTPS test failed, but configuration is set up"
    echo "   Check:"
    echo "   1. Domain DNS points to this server (10.20.6.58)"
    echo "   2. Port 443 is open in firewall"
    echo "   3. Certificates are valid: openssl x509 -in ssl-certs/fullchain.pem -text -noout"
fi

echo ""
echo "✅ HTTPS setup completed!"
echo ""
echo "🌐 Your application should now be accessible at:"
echo "   https://${DOMAIN}"
echo ""
echo "💡 If using Let's Encrypt, certificates auto-renew via certbot"
echo "   To test renewal: sudo certbot renew --dry-run"
echo ""
echo "📋 Next steps:"
echo "   1. Verify DNS: nslookup ${DOMAIN}"
echo "   2. Test HTTPS: curl -I https://${DOMAIN}"
echo "   3. Check logs: docker logs bakong-notification-services-frontend"

