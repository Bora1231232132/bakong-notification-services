#!/bin/bash
# Simple deployment script for SIT server
# Run this on the server: bash deploy-on-server.sh

set -e

echo "🚀 Starting deployment..."

cd ~/bakong-notification-services

# Pull latest code
echo "📥 Pulling latest code..."
git fetch origin
git reset --hard origin/develop

# Run database migration to convert fileId from UUID to VARCHAR
echo "🔄 Running database migration..."
if [ -f "apps/backend/scripts/convert-fileid-to-varchar.sql" ]; then
    docker exec -i bakong-notification-services-db-sit psql -U bkns_sit -d bakong_notification_services_sit < apps/backend/scripts/convert-fileid-to-varchar.sql || echo "⚠️  Migration warning (may be normal if column already converted)"
else
    echo "⚠️  Migration script not found, skipping..."
fi

# Verify Dockerfile is correct (fix if corrupted)
echo "🔍 Verifying Dockerfile..."
if ! grep -q "npm exec -- tsc" apps/backend/Dockerfile; then
    echo "🔨 Fixing Dockerfile..."
    # Remove any corrupted lines and add correct one
    sed -i '/^RUN.*tsc.*tsconfig.json/d' apps/backend/Dockerfile
    # Find the line before the note and insert the correct RUN command
    sed -i '/# Build TypeScript and fix paths/a RUN npm exec -- tsc -p tsconfig.json && npm exec -- tsc-alias -p tsconfig.json' apps/backend/Dockerfile
fi

# Stop containers
echo "🛑 Stopping containers..."
docker compose -f docker-compose.sit.yml down || true

# Clean up old images
echo "🧹 Cleaning up..."
docker rmi bakong-notification-services-backend 2>/dev/null || true

# Build backend
echo "🏗️  Building backend (this will take a few minutes)..."
docker compose -f docker-compose.sit.yml build --no-cache backend

# Start services
echo "🚀 Starting services..."
docker compose -f docker-compose.sit.yml up -d

# Wait for startup
echo "⏳ Waiting for services to initialize..."
sleep 15

# Show status
echo ""
echo "📊 Container Status:"
docker compose -f docker-compose.sit.yml ps

echo ""
echo "📋 Backend Logs (last 30 lines):"
docker compose -f docker-compose.sit.yml logs --tail=30 backend

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Access your services:"
echo "   Frontend: http://10.20.6.57:8090"
echo "   Backend:  http://10.20.6.57:4002"
echo "   Health:   http://10.20.6.57:4002/api/v1/health"
echo ""
echo "💡 To follow logs: docker compose -f docker-compose.sit.yml logs -f"

