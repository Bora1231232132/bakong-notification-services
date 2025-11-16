#!/bin/bash
# Test Locally with SIT Configuration
# This simulates the SIT server environment on your local machine
# Use this to verify your code works with server configuration before deploying

set -e

echo "🧪 Testing Locally with SIT Configuration"
echo "=========================================="
echo ""
echo "This will:"
echo "  1. Build Docker images with SIT configuration"
echo "  2. Start services using docker-compose.sit.yml"
echo "  3. Test that everything works with server URLs"
echo ""
echo "⚠️  Note: This uses SIT server IPs in configuration, but runs locally"
echo "   Frontend will be at: http://localhost:8090"
echo "   Backend will be at: http://localhost:4002"
echo ""
echo "⏱️  First Run: Database initialization takes 2-5 minutes"
echo "   Subsequent runs are much faster (database already initialized)"
echo "   To speed up: Don't use '-v' flag when stopping (keeps database volume)"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Ask for confirmation
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Cancelled."
  exit 0
fi

# Step 1: Validate configuration first
echo -e "\n${BLUE}Step 1: Validating configuration...${NC}"
if [ -f "validate-deployment.sh" ]; then
  chmod +x validate-deployment.sh
  ./validate-deployment.sh
  if [ $? -ne 0 ]; then
    echo -e "${RED}Configuration validation failed. Please fix errors first.${NC}"
    exit 1
  fi
else
  echo -e "${YELLOW}⚠ validate-deployment.sh not found, skipping validation${NC}"
fi

# Step 2: Check for port conflicts
echo -e "\n${BLUE}Step 2: Checking for port conflicts...${NC}"
REQUIRED_PORTS=(4002 8090 5434)
PORT_CONFLICTS=()

for port in "${REQUIRED_PORTS[@]}"; do
  # Check if port is in use by Docker containers
  if docker ps --format "{{.Ports}}" | grep -q ":$port->" || \
     (netstat -an 2>/dev/null | grep -q ":$port " && ! docker ps --format "{{.Ports}}" | grep -q ":$port->"); then
    # Check if it's our own container
    if ! docker ps --format "{{.Names}}" | grep -q "bakong-notification-services.*-sit"; then
      PORT_CONFLICTS+=("$port")
    fi
  fi
done

if [ ${#PORT_CONFLICTS[@]} -gt 0 ]; then
  echo -e "${YELLOW}⚠️  Port conflicts detected:${NC}"
  for port in "${PORT_CONFLICTS[@]}"; do
    echo -e "${YELLOW}   Port $port is already in use${NC}"
    docker ps --format "table {{.Names}}\t{{.Ports}}" | grep ":$port" || true
  done
  echo -e "${YELLOW}   Stopping conflicting containers...${NC}"
  # Try to stop containers using these ports
  for port in "${PORT_CONFLICTS[@]}"; do
    CONFLICTING_CONTAINERS=$(docker ps --format "{{.Names}}" --filter "publish=$port" 2>/dev/null || \
                            docker ps --format "{{.Names}}" | xargs -I {} sh -c "docker port {} 2>/dev/null | grep -q ':$port->' && echo {}" || true)
    if [ -n "$CONFLICTING_CONTAINERS" ]; then
      echo "$CONFLICTING_CONTAINERS" | xargs docker stop 2>/dev/null || true
    fi
  done
  sleep 2
fi

# Step 3: Stop any existing SIT containers
echo -e "\n${BLUE}Step 3: Cleaning up old SIT containers...${NC}"
echo -e "${YELLOW}   Note: Keeping database volume for faster startup${NC}"
echo -e "${YELLOW}   (Remove '-v' from 'down' command if you need fresh database)${NC}"
docker compose -f docker-compose.sit.yml down 2>/dev/null || true
docker compose -f docker-compose.yml down 2>/dev/null || true
echo -e "${GREEN}✓ Cleanup complete${NC}"

# Step 4: Build images
echo -e "\n${BLUE}Step 4: Building Docker images with SIT configuration...${NC}"
docker compose -f docker-compose.sit.yml build --no-cache
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Build successful${NC}"
else
  echo -e "${RED}✗ Build failed${NC}"
  exit 1
fi

# Step 5: Start services
echo -e "\n${BLUE}Step 5: Starting services...${NC}"
docker compose -f docker-compose.sit.yml up -d
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Services started${NC}"
else
  echo -e "${RED}✗ Failed to start services${NC}"
  exit 1
fi

# Step 6: Wait for database
echo -e "\n${BLUE}Step 6: Waiting for database to be ready...${NC}"
echo -e "${YELLOW}⏳ This may take 2-5 minutes on first run (database initialization)...${NC}"
echo -e "${YELLOW}   Subsequent runs will be much faster.${NC}"

MAX_DB_WAIT=600  # 10 minutes max
DB_WAIT_ATTEMPT=0
DB_READY=false

# First, wait for container to start
echo -n "Waiting for database container to start"
while [ $DB_WAIT_ATTEMPT -lt 30 ]; do
  CONTAINER_STATUS=$(docker compose -f docker-compose.sit.yml ps -q db | xargs docker inspect --format '{{.State.Status}}' 2>/dev/null || echo "not_found")
  if [ "$CONTAINER_STATUS" = "running" ]; then
    break
  fi
  sleep 2
  DB_WAIT_ATTEMPT=$((DB_WAIT_ATTEMPT + 1))
  echo -n "."
done
echo ""

# Now wait for database to be ready (accepting connections)
echo -n "Waiting for database to accept connections"
DB_WAIT_ATTEMPT=0
while [ $DB_WAIT_ATTEMPT -lt $MAX_DB_WAIT ]; do
  DB_HEALTH=$(docker compose -f docker-compose.sit.yml exec -T db pg_isready -U bkns_sit -d bakong_notification_services_sit 2>&1 || echo "not_ready")
  if echo "$DB_HEALTH" | grep -q "accepting connections"; then
    DB_READY=true
    break
  fi
  sleep 5
  DB_WAIT_ATTEMPT=$((DB_WAIT_ATTEMPT + 5))
  if [ $((DB_WAIT_ATTEMPT % 30)) -eq 0 ]; then
    echo ""
    echo -e "${YELLOW}   Still waiting... ($((DB_WAIT_ATTEMPT / 60))m ${((DB_WAIT_ATTEMPT % 60))}s elapsed)${NC}"
    echo -n "   "
  fi
  echo -n "."
done
echo ""

if [ "$DB_READY" = true ]; then
  echo -e "${GREEN}✓ Database is ready${NC}"
else
  echo -e "\n${RED}✗ Database not ready after $((MAX_DB_WAIT / 60)) minutes${NC}"
  echo -e "${YELLOW}Database logs:${NC}"
  docker compose -f docker-compose.sit.yml logs db | tail -50
  echo -e "\n${YELLOW}Container status:${NC}"
  docker compose -f docker-compose.sit.yml ps db
  exit 1
fi

# Step 7: Wait for backend
echo -e "\n${BLUE}Step 7: Waiting for backend to be ready...${NC}"
MAX_ATTEMPTS=30
ATTEMPT=0
BACKEND_READY=false

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  sleep 2
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4002/api/v1/health || echo "000")
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
  docker compose -f docker-compose.sit.yml logs backend | tail -50
  exit 1
fi

# Step 8: Test API endpoints
echo -e "\n${BLUE}Step 8: Testing API endpoints...${NC}"

# Test health endpoint
HEALTH_RESPONSE=$(curl -s http://localhost:4002/api/v1/health)
if echo "$HEALTH_RESPONSE" | grep -q "status"; then
  echo -e "${GREEN}✓ Health endpoint working${NC}"
  echo "  Response: $(echo $HEALTH_RESPONSE | head -c 100)..."
else
  echo -e "${RED}✗ Health endpoint failed${NC}"
  echo "  Response: $HEALTH_RESPONSE"
fi

# Test management healthcheck
MANAGEMENT_RESPONSE=$(curl -s http://localhost:4002/api/v1/management/healthcheck)
if echo "$MANAGEMENT_RESPONSE" | grep -q "status"; then
  echo -e "${GREEN}✓ Management healthcheck working${NC}"
else
  echo -e "${YELLOW}⚠ Management healthcheck returned unexpected response${NC}"
fi

# Step 9: Check frontend
echo -e "\n${BLUE}Step 9: Checking frontend...${NC}"
FRONTEND_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8090 || echo "000")
if [ "$FRONTEND_CODE" = "200" ]; then
  echo -e "${GREEN}✓ Frontend is accessible (HTTP $FRONTEND_CODE)${NC}"
else
  echo -e "${YELLOW}⚠ Frontend returned HTTP $FRONTEND_CODE${NC}"
  docker compose -f docker-compose.sit.yml logs frontend | tail -20
fi

# Step 10: Verify environment variables
echo -e "\n${BLUE}Step 10: Verifying environment variables...${NC}"
CORS_ORIGIN=$(docker compose -f docker-compose.sit.yml exec -T backend printenv CORS_ORIGIN 2>/dev/null || echo "NOT SET")
API_BASE_URL=$(docker compose -f docker-compose.sit.yml exec -T backend printenv API_BASE_URL 2>/dev/null || echo "NOT SET")
NODE_ENV=$(docker compose -f docker-compose.sit.yml exec -T backend printenv NODE_ENV 2>/dev/null || echo "NOT SET")

echo "  CORS_ORIGIN: $CORS_ORIGIN"
echo "  API_BASE_URL: $API_BASE_URL"
echo "  NODE_ENV: $NODE_ENV"

if echo "$CORS_ORIGIN" | grep -q "10.20.6.57"; then
  echo -e "${GREEN}✓ CORS_ORIGIN contains server IP${NC}"
else
  echo -e "${YELLOW}⚠ CORS_ORIGIN may not match server configuration${NC}"
fi

if echo "$API_BASE_URL" | grep -q "10.20.6.57"; then
  echo -e "${GREEN}✓ API_BASE_URL contains server IP${NC}"
else
  echo -e "${YELLOW}⚠ API_BASE_URL may not match server configuration${NC}"
fi

# Step 11: Check container status
echo -e "\n${BLUE}Step 11: Container status...${NC}"
docker compose -f docker-compose.sit.yml ps

# Summary
echo ""
echo -e "${GREEN}=========================================="
echo "✅ Local SIT Test Complete!"
echo "=========================================="
echo -e "${NC}"
echo "Services are running with SIT configuration:"
echo "  Frontend: http://localhost:8090"
echo "  Backend API: http://localhost:4002"
echo "  Database: localhost:5434"
echo ""
echo "⚠️  Important Notes:"
echo "  - These URLs use localhost, but configuration uses server IPs"
echo "  - This simulates server environment locally"
echo "  - If this works, deployment to server should work too"
echo ""
echo "To view logs:"
echo "  docker compose -f docker-compose.sit.yml logs -f"
echo ""
echo "To stop services:"
echo "  docker compose -f docker-compose.sit.yml down"
echo ""
echo "Next steps:"
echo "  1. Test frontend in browser: http://localhost:8090"
echo "  2. Check browser console for any errors"
echo "  3. If everything works, you're ready to deploy!"
echo ""

