#!/bin/bash

# Test script to verify Test page is hidden in SIT/Production builds
# This simulates the production build that SIT uses

echo "🧪 Testing SIT Build - Verifying Test page is hidden..."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Build shared package first
echo "📦 Step 1: Building shared package..."
cd apps/packages/shared
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to build shared package${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Shared package built successfully${NC}"
echo ""

# Step 2: Build frontend in production mode
echo "🏗️  Step 2: Building frontend in PRODUCTION mode (simulating SIT)..."
cd ../../frontend

# Set NODE_ENV to production to simulate SIT build
export NODE_ENV=production

# Build the frontend
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to build frontend${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Frontend built successfully in production mode${NC}"
echo ""

# Step 3: Check if TestView is in the built files
echo "🔍 Step 3: Checking if TestView is excluded from production build..."
cd dist

# Check if TestView.vue is referenced in the built JS files
if grep -r "TestView" . --include="*.js" --include="*.html" > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Warning: TestView found in built files${NC}"
    echo "Checking details..."
    grep -r "TestView" . --include="*.js" --include="*.html" | head -5
    echo ""
    echo -e "${RED}❌ Test page might be included in production build!${NC}"
    echo "This should NOT happen in SIT/Production."
    exit 1
else
    echo -e "${GREEN}✅ TestView NOT found in production build${NC}"
    echo "Test page is correctly excluded!"
fi

# Check if test route is in the built router
echo ""
echo "🔍 Step 4: Checking if test route is excluded from router..."
if grep -r "path.*test" . --include="*.js" > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Found 'test' in router - checking if it's properly guarded...${NC}"
    # Check if devOnly check is present
    if grep -r "devOnly\|import.meta.env.PROD" . --include="*.js" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Router guard (devOnly/PROD check) found in build${NC}"
    else
        echo -e "${RED}❌ Router guard not found!${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Test route not found in production build${NC}"
fi

echo ""
echo -e "${GREEN}✅✅✅ All checks passed!${NC}"
echo ""
echo "Summary:"
echo "  ✅ Frontend built in production mode"
echo "  ✅ TestView excluded from build"
echo "  ✅ Router guards in place"
echo ""
echo "The Test page will be hidden in SIT/Production environments."
echo ""
echo "To test in browser:"
echo "  1. Run: cd apps/frontend && npm run preview"
echo "  2. Open: http://localhost:4173"
echo "  3. Check that 'Test' menu item is NOT visible"
echo "  4. Try accessing: http://localhost:4173/test (should redirect to home)"

