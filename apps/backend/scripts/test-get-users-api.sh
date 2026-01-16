#!/bin/bash

# Test script for GET /user API
# Usage: ./test-get-users-api.sh [JWT_TOKEN] [BASE_URL]

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
JWT_TOKEN=${1:-""}
BASE_URL=${2:-"http://localhost:4004"}

if [ -z "$JWT_TOKEN" ]; then
    echo -e "${YELLOW}⚠️  JWT Token not provided${NC}"
    echo "Usage: $0 <JWT_TOKEN> [BASE_URL]"
    echo ""
    echo "To get a JWT token, login first:"
    echo "  curl -X POST $BASE_URL/auth/login \\"
    echo "    -H 'Content-Type: application/json' \\"
    echo "    -d '{\"username\":\"your-email\",\"password\":\"your-password\"}'"
    exit 1
fi

echo -e "${BLUE}🧪 Testing GET /user API${NC}"
echo "Base URL: $BASE_URL"
echo ""

# Test 1: Basic request
echo -e "${GREEN}Test 1: Basic request (default pagination)${NC}"
curl -s -X GET "$BASE_URL/user" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" | jq '.' || echo "Response received"
echo ""

# Test 2: With pagination
echo -e "${GREEN}Test 2: With pagination (page=1, size=5)${NC}"
curl -s -X GET "$BASE_URL/user?page=1&size=5" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" | jq '.' || echo "Response received"
echo ""

# Test 3: With sorting
echo -e "${GREEN}Test 3: Sort by name (ASC)${NC}"
curl -s -X GET "$BASE_URL/user?sortBy=name&sortOrder=ASC" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" | jq '.' || echo "Response received"
echo ""

# Test 4: With search
echo -e "${GREEN}Test 4: Search for 'admin'${NC}"
curl -s -X GET "$BASE_URL/user?search=admin" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" | jq '.' || echo "Response received"
echo ""

# Test 5: Filter by status
echo -e "${GREEN}Test 5: Filter by status (ACTIVE)${NC}"
curl -s -X GET "$BASE_URL/user?status=ACTIVE" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" | jq '.' || echo "Response received"
echo ""

# Test 6: Filter by role
echo -e "${GREEN}Test 6: Filter by role (EDITOR)${NC}"
curl -s -X GET "$BASE_URL/user?role=EDITOR" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" | jq '.' || echo "Response received"
echo ""

# Test 7: Combined parameters
echo -e "${GREEN}Test 7: Combined (search + filter + sort + pagination)${NC}"
curl -s -X GET "$BASE_URL/user?search=admin&status=ACTIVE&role=EDITOR&sortBy=name&sortOrder=ASC&page=1&size=10" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" | jq '.' || echo "Response received"
echo ""

echo -e "${BLUE}✅ All tests completed!${NC}"
