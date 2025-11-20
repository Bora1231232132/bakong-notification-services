#!/bin/bash
# Use Existing SSL Certificates from IT Team
# This is simpler than Let's Encrypt - just copy certificates and restart
# Run this on the server: bash USE_EXISTING_SSL_CERTIFICATES.sh

set -e

cd ~/bakong-notification-services

echo "🔐 Setup SSL Using Existing Certificates"
echo "========================================="
echo ""
echo "📋 You need two files from your IT team:"
echo "   1. Certificate file (.crt or .pem)"
echo "   2. Private key file (.key or .pem)"
echo ""

# Check if certificates already exist
if [ -f "ssl-certs/fullchain.pem" ] && [ -f "ssl-certs/privkey.pem" ]; then
    echo "✅ Found existing certificates in ssl-certs/"
    echo ""
    read -p "Use existing certificates? (y/n): " use_existing
    if [ "$use_existing" = "y" ]; then
        echo ""
        echo "🔄 Restarting frontend with existing certificates..."
        docker-compose -f docker-compose.production.yml up -d frontend
        sleep 10
        
        echo ""
        echo "🧪 Testing HTTPS..."
        if curl -k -s https://localhost/api/v1/health > /dev/null 2>&1; then
            echo "✅ HTTPS is working!"
        else
            echo "⚠️  HTTPS test failed, but certificates are configured"
        fi
        
        echo ""
        echo "✅ Setup complete!"
        echo "   Test at: https://bakong-notification.nbc.gov.kh"
        exit 0
    fi
fi

echo ""
echo "📁 Step 1: Prepare certificate files"
echo ""
echo "   Option A: Certificates are on this server"
echo "   Option B: Certificates need to be uploaded"
echo ""
read -p "   Choose option (A/B): " cert_option

if [ "$cert_option" = "A" ]; then
    echo ""
    echo "   Enter the full path to your certificate files:"
    read -p "   Certificate file path (.crt or .pem): " CERT_PATH
    read -p "   Private key file path (.key or .pem): " KEY_PATH
    
    if [ ! -f "$CERT_PATH" ] || [ ! -f "$KEY_PATH" ]; then
        echo "   ❌ Files not found!"
        exit 1
    fi
    
    echo ""
    echo "📁 Step 2: Copying certificates..."
    mkdir -p ssl-certs
    sudo cp "$CERT_PATH" ssl-certs/fullchain.pem
    sudo cp "$KEY_PATH" ssl-certs/privkey.pem
    sudo chmod 644 ssl-certs/fullchain.pem
    sudo chmod 600 ssl-certs/privkey.pem
    sudo chown $USER:$USER ssl-certs/*.pem 2>/dev/null || true
    
elif [ "$cert_option" = "B" ]; then
    echo ""
    echo "📁 Step 2: Upload certificates"
    echo ""
    echo "   You can upload certificates using one of these methods:"
    echo ""
    echo "   Method 1: Using SCP (from your local computer):"
    echo "   scp certificate.crt dev@10.20.6.58:~/bakong-notification-services/ssl-certs/fullchain.pem"
    echo "   scp private.key dev@10.20.6.58:~/bakong-notification-services/ssl-certs/privkey.pem"
    echo ""
    echo "   Method 2: Copy-paste certificate content"
    echo "   (We'll create files for you to edit)"
    echo ""
    read -p "   Which method? (1/2): " upload_method
    
    mkdir -p ssl-certs
    
    if [ "$upload_method" = "1" ]; then
        echo ""
        echo "   After uploading files, run this script again and choose Option A"
        echo "   Or continue to test if files are already uploaded..."
        read -p "   Continue? (y/n): " continue_upload
        if [ "$continue_upload" != "y" ]; then
            exit 0
        fi
    elif [ "$upload_method" = "2" ]; then
        echo ""
        echo "   Creating empty files. You'll edit them with nano/vim..."
        touch ssl-certs/fullchain.pem
        touch ssl-certs/privkey.pem
        chmod 644 ssl-certs/fullchain.pem
        chmod 600 ssl-certs/privkey.pem
        
        echo ""
        echo "   Opening certificate file for editing..."
        echo "   Paste your certificate content, then save (Ctrl+X, Y, Enter)"
        read -p "   Press Enter to open editor..."
        nano ssl-certs/fullchain.pem || vi ssl-certs/fullchain.pem
        
        echo ""
        echo "   Opening private key file for editing..."
        echo "   Paste your private key content, then save"
        read -p "   Press Enter to open editor..."
        nano ssl-certs/privkey.pem || vi ssl-certs/privkey.pem
    fi
else
    echo "Invalid option"
    exit 1
fi

# Verify files exist
if [ ! -f "ssl-certs/fullchain.pem" ] || [ ! -f "ssl-certs/privkey.pem" ]; then
    echo ""
    echo "❌ Certificate files not found in ssl-certs/"
    echo "   Please ensure both files exist:"
    echo "   - ssl-certs/fullchain.pem"
    echo "   - ssl-certs/privkey.pem"
    exit 1
fi

# Check if files are not empty
if [ ! -s "ssl-certs/fullchain.pem" ] || [ ! -s "ssl-certs/privkey.pem" ]; then
    echo ""
    echo "⚠️  Certificate files appear to be empty"
    echo "   Please ensure files contain certificate data"
    exit 1
fi

echo ""
echo "✅ Certificate files found!"
echo ""

echo "🔄 Step 3: Restarting frontend with SSL..."
docker-compose -f docker-compose.production.yml up -d frontend

echo ""
echo "⏳ Step 4: Waiting for frontend to restart (10 seconds)..."
sleep 10

echo ""
echo "🧪 Step 5: Testing HTTPS..."
if curl -k -s https://localhost/api/v1/health > /dev/null 2>&1; then
    echo "✅ HTTPS is working!"
    curl -k -s https://localhost/api/v1/health | head -3
else
    echo "⚠️  Local HTTPS test failed"
    echo "   This might be normal if testing from server"
    echo "   Try accessing from browser: https://bakong-notification.nbc.gov.kh"
fi

echo ""
echo "✅ SSL setup completed!"
echo ""
echo "🌐 Your application should be accessible at:"
echo "   https://bakong-notification.nbc.gov.kh"
echo ""
echo "💡 To verify certificates:"
echo "   openssl x509 -in ssl-certs/fullchain.pem -text -noout | head -20"

