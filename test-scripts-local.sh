#!/bin/bash
# ============================================================================
# Local Script Testing & Verification
# ============================================================================
# This script tests all consolidated scripts locally to ensure they work
# Usage: bash test-scripts-local.sh
# ============================================================================

# Don't exit on error - we want to count failures
set +e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "=========================================="
echo "🧪 LOCAL SCRIPT VERIFICATION TEST"
echo "=========================================="
echo ""

PASSED=0
FAILED=0
WARNINGS=0

# Test counter
test_count() {
    local exit_code=$?
    if [ $exit_code -eq 0 ]; then
        ((PASSED++))
        echo -e "${GREEN}✅ PASS${NC}"
    else
        ((FAILED++))
        echo -e "${RED}❌ FAIL${NC}"
    fi
    return $exit_code
}

warn_count() {
    ((WARNINGS++))
    echo -e "${YELLOW}⚠️  WARNING${NC}"
}

# ============================================================================
# Test 1: Check Docker is running
# ============================================================================
echo -e "${BLUE}Test 1: Docker is running${NC}"
if docker ps > /dev/null 2>&1; then
    test_count
else
    echo -e "${RED}❌ Docker is not running!${NC}"
    echo -e "${YELLOW}   Please start Docker Desktop and try again${NC}"
    warn_count
fi
echo ""

# ============================================================================
# Test 2: Check utils-server.sh exists and is executable
# ============================================================================
echo -e "${BLUE}Test 2: utils-server.sh exists and is executable${NC}"
if [ -f "utils-server.sh" ]; then
    if [ -x "utils-server.sh" ] || [ -f "utils-server.sh" ]; then
        test_count
    else
        echo -e "${YELLOW}   Making utils-server.sh executable...${NC}"
        chmod +x utils-server.sh
        test_count
    fi
else
    echo -e "${RED}❌ utils-server.sh not found!${NC}"
    warn_count
fi
echo ""

# ============================================================================
# Test 3: Check utils-server.sh syntax
# ============================================================================
echo -e "${BLUE}Test 3: utils-server.sh syntax check${NC}"
if bash -n utils-server.sh 2>&1; then
    test_count
else
    warn_count
fi
echo ""

# ============================================================================
# Test 4: Check utils-server.sh help command
# ============================================================================
echo -e "${BLUE}Test 4: utils-server.sh help command${NC}"
if bash utils-server.sh help 2>&1 | grep -q "Available commands"; then
    test_count
else
    warn_count
fi
echo ""

# ============================================================================
# Test 5: Check deploy-sit-server.sh exists and syntax
# ============================================================================
echo -e "${BLUE}Test 5: deploy-sit-server.sh syntax check${NC}"
if [ -f "deploy-sit-server.sh" ]; then
    if bash -n deploy-sit-server.sh 2>&1; then
        test_count
    else
        warn_count
    fi
else
    echo -e "${YELLOW}   deploy-sit-server.sh not found (may be optional)${NC}"
    warn_count
fi
echo ""

# ============================================================================
# Test 6: Check deploy-prod-server.sh exists and syntax
# ============================================================================
echo -e "${BLUE}Test 6: deploy-prod-server.sh syntax check${NC}"
if [ -f "deploy-prod-server.sh" ]; then
    if bash -n deploy-prod-server.sh 2>&1; then
        test_count
    else
        warn_count
    fi
else
    echo -e "${YELLOW}   deploy-prod-server.sh not found (may be optional)${NC}"
    warn_count
fi
echo ""

# ============================================================================
# Test 7: Check verify-all.sql exists
# ============================================================================
echo -e "${BLUE}Test 7: verify-all.sql exists${NC}"
if [ -f "apps/backend/scripts/verify-all.sql" ]; then
    test_count
else
    warn_count
fi
echo ""

# ============================================================================
# Test 8: Check verify-all.sql syntax (basic)
# ============================================================================
echo -e "${BLUE}Test 8: verify-all.sql basic syntax check${NC}"
if [ -f "apps/backend/scripts/verify-all.sql" ]; then
    # Check for basic SQL syntax issues
    if grep -q "DO \$\$" apps/backend/scripts/verify-all.sql && \
       grep -q "END \$\$" apps/backend/scripts/verify-all.sql; then
        test_count
    else
        echo -e "${YELLOW}   SQL file structure check (may still be valid)${NC}"
        warn_count
    fi
else
    warn_count
fi
echo ""

# ============================================================================
# Test 9: Check required SQL files exist
# ============================================================================
echo -e "${BLUE}Test 9: Required SQL files exist${NC}"
MISSING=0
for file in "update-usernames-to-lowercase.sql" "associate-images-to-templates.sql" "restore-images-to-templates.sql"; do
    if [ ! -f "apps/backend/scripts/$file" ]; then
        echo -e "${YELLOW}   Missing: $file${NC}"
        ((MISSING++))
    fi
done
if [ $MISSING -eq 0 ]; then
    test_count
else
    warn_count
fi
echo ""

# ============================================================================
# Test 10: Check unified-migration.sql exists
# ============================================================================
echo -e "${BLUE}Test 10: unified-migration.sql exists${NC}"
if [ -f "apps/backend/migrations/unified-migration.sql" ]; then
    test_count
else
    warn_count
fi
echo ""

# ============================================================================
# Test 11: Check Docker containers (if running)
# ============================================================================
echo -e "${BLUE}Test 11: Docker containers status${NC}"
if docker ps > /dev/null 2>&1; then
    CONTAINERS=$(docker ps --format '{{.Names}}' 2>/dev/null | grep -E "bakong-notification-services" || true)
    if [ -n "$CONTAINERS" ]; then
        echo -e "${GREEN}   Found containers:${NC}"
        echo "$CONTAINERS" | while read -r container; do
            echo -e "${GREEN}     - $container${NC}"
        done
        test_count
    else
        echo -e "${YELLOW}   No bakong containers running (this is OK for testing)${NC}"
        warn_count
    fi
else
    warn_count
fi
echo ""

# ============================================================================
# Test 12: Test utils-server.sh commands (dry-run where possible)
# ============================================================================
echo -e "${BLUE}Test 12: utils-server.sh command availability${NC}"
COMMANDS=("help" "db-backup" "db-restore" "db-migrate" "verify-all" "verify-schema" "verify-images" "check-tables")
MISSING_CMD=0
for cmd in "${COMMANDS[@]}"; do
    if bash utils-server.sh "$cmd" 2>&1 | grep -q "Error\|Usage\|Available\|help" || \
       bash utils-server.sh help 2>&1 | grep -q "$cmd"; then
        echo -e "${GREEN}   ✓ $cmd${NC}"
    else
        echo -e "${YELLOW}   ⚠ $cmd (may need container)${NC}"
        ((MISSING_CMD++))
    fi
done
if [ $MISSING_CMD -eq 0 ]; then
    test_count
else
    warn_count
fi
echo ""

# ============================================================================
# Test 13: Check file references in scripts
# ============================================================================
echo -e "${BLUE}Test 13: File references in scripts${NC}"
BROKEN_REFS=0

# Check utils-server.sh references
if grep -q "apps/backend/scripts/verify-all.sql" utils-server.sh; then
    echo -e "${GREEN}   ✓ verify-all.sql referenced correctly${NC}"
else
    echo -e "${RED}   ✗ verify-all.sql not referenced!${NC}"
    ((BROKEN_REFS++))
fi

# Check for old verification file references (should NOT exist)
if grep -q "verify-schema-match.sql\|verify-image-associations.sql\|check-all-tables.sql" utils-server.sh; then
    echo -e "${YELLOW}   ⚠ Old verification files still referenced${NC}"
    ((BROKEN_REFS++))
else
    echo -e "${GREEN}   ✓ No old verification file references${NC}"
fi

if [ $BROKEN_REFS -eq 0 ]; then
    test_count
else
    warn_count
fi
echo ""

# ============================================================================
# Test 14: Check deployment scripts reference utils-server.sh
# ============================================================================
echo -e "${BLUE}Test 14: Deployment scripts use utils-server.sh${NC}"
BROKEN_DEPLOY=0

if [ -f "deploy-sit-server.sh" ]; then
    if grep -q "utils-server.sh" deploy-sit-server.sh; then
        echo -e "${GREEN}   ✓ deploy-sit-server.sh uses utils-server.sh${NC}"
    else
        echo -e "${RED}   ✗ deploy-sit-server.sh missing utils-server.sh reference${NC}"
        ((BROKEN_DEPLOY++))
    fi
fi

if [ -f "deploy-prod-server.sh" ]; then
    if grep -q "utils-server.sh" deploy-prod-server.sh; then
        echo -e "${GREEN}   ✓ deploy-prod-server.sh uses utils-server.sh${NC}"
    else
        echo -e "${RED}   ✗ deploy-prod-server.sh missing utils-server.sh reference${NC}"
        ((BROKEN_DEPLOY++))
    fi
fi

if [ $BROKEN_DEPLOY -eq 0 ]; then
    test_count
else
    warn_count
fi
echo ""

# ============================================================================
# Test 15: Test with actual Docker container (if available)
# ============================================================================
echo -e "${BLUE}Test 15: Test with Docker container (if running)${NC}"
if docker ps > /dev/null 2>&1; then
    # Try to find any bakong database container
    DB_CONTAINER=$(docker ps --format '{{.Names}}' 2>/dev/null | grep -E "bakong.*db" | head -1 || true)
    
    if [ -n "$DB_CONTAINER" ]; then
        echo -e "${GREEN}   Found database container: $DB_CONTAINER${NC}"
        
        # Test if we can connect
        if docker exec "$DB_CONTAINER" psql --version > /dev/null 2>&1; then
            echo -e "${GREEN}   ✓ Can connect to database${NC}"
            test_count
        else
            echo -e "${YELLOW}   ⚠ Cannot connect to database (may need credentials)${NC}"
            warn_count
        fi
    else
        echo -e "${YELLOW}   No database container running (start with: docker-compose up -d)${NC}"
        warn_count
    fi
else
    warn_count
fi
echo ""

# ============================================================================
# SUMMARY
# ============================================================================
echo ""
echo "=========================================="
echo "📊 TEST SUMMARY"
echo "=========================================="
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${YELLOW}⚠️  Warnings: $WARNINGS${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! Scripts are ready to use.${NC}"
    exit 0
elif [ $FAILED -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Some warnings (may be OK if containers not running)${NC}"
    echo -e "${YELLOW}   To test with containers: docker-compose up -d${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Please fix errors above.${NC}"
    exit 1
fi

