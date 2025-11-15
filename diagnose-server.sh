#!/bin/bash
# Server Diagnostic Script - Run this on SIT/Production server to diagnose issues

set -e

echo "🔍 Server Diagnostic Tool"
echo "================================"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check Docker
echo -e "\n${BLUE}1. Docker Status${NC}"
if command -v docker &> /dev/null; then
  echo -e "${GREEN}✓ Docker installed${NC}"
  docker --version
else
  echo -e "${RED}✗ Docker not installed${NC}"
  exit 1
fi

# Check Docker Compose
echo -e "\n${BLUE}2. Docker Compose Status${NC}"
if docker compose version &> /dev/null; then
  echo -e "${GREEN}✓ Docker Compose available${NC}"
  docker compose version
else
  echo -e "${RED}✗ Docker Compose not available${NC}"
  exit 1
fi

# Check containers
echo -e "\n${BLUE}3. Container Status${NC}"
docker compose -f docker-compose.sit.yml ps

# Check if containers are running
BACKEND_RUNNING=$(docker compose -f docker-compose.sit.yml ps backend | grep -c "Up" || echo "0")
FRONTEND_RUNNING=$(docker compose -f docker-compose.sit.yml ps frontend | grep -c "Up" || echo "0")
DB_RUNNING=$(docker compose -f docker-compose.sit.yml ps db | grep -c "Up" || echo "0")

if [ "$DB_RUNNING" -eq "1" ]; then
  echo -e "${GREEN}✓ Database container is running${NC}"
else
  echo -e "${RED}✗ Database container is NOT running${NC}"
fi

if [ "$BACKEND_RUNNING" -eq "1" ]; then
  echo -e "${GREEN}✓ Backend container is running${NC}"
else
  echo -e "${RED}✗ Backend container is NOT running${NC}"
  echo -e "\n${YELLOW}Backend logs (last 30 lines):${NC}"
  docker compose -f docker-compose.sit.yml logs --tail=30 backend
fi

if [ "$FRONTEND_RUNNING" -eq "1" ]; then
  echo -e "${GREEN}✓ Frontend container is running${NC}"
else
  echo -e "${RED}✗ Frontend container is NOT running${NC}"
  echo -e "\n${YELLOW}Frontend logs (last 30 lines):${NC}"
  docker compose -f docker-compose.sit.yml logs --tail=30 frontend
fi

# Check backend health
echo -e "\n${BLUE}4. Backend Health Check${NC}"
BACKEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4002/api/v1/health 2>/dev/null || echo "000")
if [ "$BACKEND_HEALTH" = "200" ]; then
  echo -e "${GREEN}✓ Backend health endpoint responding (HTTP $BACKEND_HEALTH)${NC}"
  curl -s http://localhost:4002/api/v1/health | head -5
else
  echo -e "${RED}✗ Backend health endpoint failed (HTTP $BACKEND_HEALTH)${NC}"
  echo -e "\n${YELLOW}Possible causes:${NC}"
  echo "  - Backend not started"
  echo "  - Backend crashed (check logs)"
  echo "  - Port 4002 not accessible"
fi

# Check frontend
echo -e "\n${BLUE}5. Frontend Accessibility${NC}"
FRONTEND_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8090 2>/dev/null || echo "000")
if [ "$FRONTEND_CODE" = "200" ]; then
  echo -e "${GREEN}✓ Frontend is accessible (HTTP $FRONTEND_CODE)${NC}"
else
  echo -e "${RED}✗ Frontend not accessible (HTTP $FRONTEND_CODE)${NC}"
fi

# Check network connectivity
echo -e "\n${BLUE}6. Network Connectivity${NC}"
echo "Testing backend from frontend container..."
docker compose -f docker-compose.sit.yml exec -T frontend wget -q -O- http://backend:8080/api/v1/health 2>/dev/null && \
  echo -e "${GREEN}✓ Frontend can reach backend via Docker network${NC}" || \
  echo -e "${RED}✗ Frontend cannot reach backend via Docker network${NC}"

# Check environment variables
echo -e "\n${BLUE}7. Backend Environment Variables${NC}"
echo "CORS_ORIGIN: $(docker compose -f docker-compose.sit.yml exec -T backend printenv CORS_ORIGIN 2>/dev/null || echo 'NOT SET')"
echo "API_BASE_URL: $(docker compose -f docker-compose.sit.yml exec -T backend printenv API_BASE_URL 2>/dev/null || echo 'NOT SET')"
echo "API_PORT: $(docker compose -f docker-compose.sit.yml exec -T backend printenv API_PORT 2>/dev/null || echo 'NOT SET')"

# Check recent backend errors
echo -e "\n${BLUE}8. Recent Backend Errors (last 20 lines)${NC}"
docker compose -f docker-compose.sit.yml logs --tail=20 backend | grep -i "error\|fail\|exception" || echo "No recent errors found"

# Check database connection
echo -e "\n${BLUE}9. Database Connection${NC}"
DB_CONNECTION=$(docker compose -f docker-compose.sit.yml exec -T backend node -e "
  const { Client } = require('pg');
  const client = new Client({
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD
  });
  client.connect().then(() => {
    console.log('OK');
    client.end();
  }).catch(err => {
    console.log('FAIL: ' + err.message);
    process.exit(1);
  });
" 2>/dev/null || echo "FAIL: Could not test database connection")

if echo "$DB_CONNECTION" | grep -q "OK"; then
  echo -e "${GREEN}✓ Database connection successful${NC}"
else
  echo -e "${RED}✗ Database connection failed${NC}"
  echo "$DB_CONNECTION"
fi

# Summary
echo -e "\n${BLUE}================================"
echo "Diagnostic Complete"
echo "================================"
echo -e "${NC}"

if [ "$BACKEND_RUNNING" -eq "1" ] && [ "$FRONTEND_RUNNING" -eq "1" ] && [ "$DB_RUNNING" -eq "1" ] && [ "$BACKEND_HEALTH" = "200" ]; then
  echo -e "${GREEN}✅ All services appear to be running correctly${NC}"
  echo ""
  echo "Frontend URL: http://10.20.6.57:8090"
  echo "Backend API: http://10.20.6.57:4002"
  echo ""
  echo "If you're still seeing errors in the browser:"
  echo "  1. Check browser console for specific error messages"
  echo "  2. Verify you can access backend directly: curl http://10.20.6.57:4002/api/v1/health"
  echo "  3. Check CORS_ORIGIN matches your frontend URL"
else
  echo -e "${RED}❌ Some services are not running correctly${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Check logs: docker compose -f docker-compose.sit.yml logs -f"
  echo "  2. Restart services: docker compose -f docker-compose.sit.yml restart"
  echo "  3. Rebuild if needed: docker compose -f docker-compose.sit.yml up -d --build"
fi

