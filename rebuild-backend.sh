#!/bin/bash
# Quick Backend Rebuild Script
# Usage: bash rebuild-backend.sh

set -e

echo "🔧 Backend Rebuild Script"
echo "=========================="
echo ""

cd ~/bakong-notification-services

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin develop || git pull origin main || echo "⚠️  Git pull failed, continuing with local code..."

# Stop backend container
echo "🛑 Stopping backend container..."
docker compose -f docker-compose.sit.yml stop backend || true

# Remove old backend image (optional but recommended)
echo "🧹 Removing old backend image..."
docker rmi bakong-notification-services-backend 2>/dev/null || echo "   (No old image to remove)"

# Rebuild backend with NO cache
echo "🏗️  Rebuilding backend (this will take a few minutes)..."
docker compose -f docker-compose.sit.yml build --no-cache backend

# Start backend container
echo "🚀 Starting backend container..."
docker compose -f docker-compose.sit.yml up -d backend

# Wait a bit for startup
echo "⏳ Waiting for backend to start..."
sleep 10

# Show status
echo ""
echo "📊 Container Status:"
docker compose -f docker-compose.sit.yml ps backend

# Show recent logs
echo ""
echo "📋 Backend Logs (last 20 lines):"
docker compose -f docker-compose.sit.yml logs --tail=20 backend

echo ""
echo "✅ Backend rebuild complete!"
echo ""
echo "💡 To follow logs: docker compose -f docker-compose.sit.yml logs -f backend"
echo "💡 To test API: curl -X POST http://10.20.6.57/api/v1/notification/send -H 'x-api-key: BAKONG' -H 'Content-Type: application/json' -d '{\"language\":\"en\"}'"
echo ""

