#!/bin/bash
# Local Test Script - Run this before deploying to SIT/Production
# This verifies your Docker setup works locally

set -e  # Exit on error

echo "🧪 Starting Local Test..."
echo "================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Stop any existing containers
echo -e "\n${YELLOW}Step 1: Cleaning up old containers...${NC}"
docker compose -f docker-compose.yml down -v 2>/dev/null || true
echo -e "${GREEN}✓ Cleanup complete${NC}"

# Step 2: Build images
echo -e "\n${YELLOW}Step 2: Building Docker images...${NC}"
docker compose -f docker-compose.yml build --no-cache
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Build successful${NC}"
else
  echo -e "${RED}✗ Build failed${NC}"
  exit 1
fi

# Step 3: Start services
echo -e "\n${YELLOW}Step 3: Starting services...${NC}"
docker compose -f docker-compose.yml up -d
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Services started${NC}"
else
  echo -e "${RED}✗ Failed to start services${NC}"
  exit 1
fi

# Step 4: Wait for database
echo -e "\n${YELLOW}Step 4: Waiting for database to be ready...${NC}"
sleep 10
DB_HEALTH=$(docker compose -f docker-compose.yml exec -T db pg_isready -U bkns_dev -d bakong_notification_services_dev 2>&1)
if echo "$DB_HEALTH" | grep -q "accepting connections"; then
  echo -e "${GREEN}✓ Database is ready${NC}"
else
  echo -e "${RED}✗ Database not ready${NC}"
  docker compose -f docker-compose.yml logs db
  exit 1
fi

# Step 5: Wait for backend
echo -e "\n${YELLOW}Step 5: Waiting for backend to be ready...${NC}"
MAX_ATTEMPTS=30
ATTEMPT=0
BACKEND_READY=false

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  sleep 2
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4004/api/v1/health || echo "000")
  if [ "$HTTP_CODE" = "200" ]; then
    BACKEND_READY=true
    break
  fi
  ATTEMPT=$((ATTEMPT + 1))
  echo -n "."
done

if [ "$BACKEND_READY" = true ]; then
  echo -e "\n${GREEN}✓ Backend is ready (HTTP $HTTP_CODE)${NC}"
else
  echo -e "\n${RED}✗ Backend not ready after $MAX_ATTEMPTS attempts${NC}"
  echo -e "\n${YELLOW}Backend logs:${NC}"
  docker compose -f docker-compose.yml logs backend | tail -50
  exit 1
fi

# Step 6: Test API endpoints
echo -e "\n${YELLOW}Step 6: Testing API endpoints...${NC}"

# Test health endpoint
HEALTH_RESPONSE=$(curl -s http://localhost:4004/api/v1/health)
if echo "$HEALTH_RESPONSE" | grep -q "status"; then
  echo -e "${GREEN}✓ Health endpoint working${NC}"
else
  echo -e "${RED}✗ Health endpoint failed${NC}"
  echo "Response: $HEALTH_RESPONSE"
fi

# Test management healthcheck
MANAGEMENT_RESPONSE=$(curl -s http://localhost:4004/api/v1/management/healthcheck)
if echo "$MANAGEMENT_RESPONSE" | grep -q "status"; then
  echo -e "${GREEN}✓ Management healthcheck working${NC}"
else
  echo -e "${YELLOW}⚠ Management healthcheck returned unexpected response${NC}"
  echo "Response: $MANAGEMENT_RESPONSE"
fi

# Step 7: Check frontend
echo -e "\n${YELLOW}Step 7: Checking frontend...${NC}"
FRONTEND_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001 || echo "000")
if [ "$FRONTEND_CODE" = "200" ]; then
  echo -e "${GREEN}✓ Frontend is accessible (HTTP $FRONTEND_CODE)${NC}"
else
  echo -e "${YELLOW}⚠ Frontend returned HTTP $FRONTEND_CODE${NC}"
  docker compose -f docker-compose.yml logs frontend | tail -20
fi

# Step 8: Check container status
echo -e "\n${YELLOW}Step 8: Container status...${NC}"
docker compose -f docker-compose.yml ps

# Summary
echo -e "\n${GREEN}================================"
echo "✅ Local Test Complete!"
echo "================================"
echo -e "${NC}"
echo "Frontend: http://localhost:3001"
echo "Backend API: http://localhost:4004"
echo "Database: localhost:5437"
echo ""
echo "To view logs:"
echo "  docker compose -f docker-compose.yml logs -f"
echo ""
echo "To stop services:"
echo "  docker compose -f docker-compose.yml down"
echo ""

