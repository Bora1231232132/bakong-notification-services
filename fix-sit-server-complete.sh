#!/bin/bash
# Complete fix for SIT server - handles all permission and git issues

set -e

echo "🔧 Complete SIT Server Fix"
echo "=========================="
echo ""

cd ~/bakong-notification-services

# Step 1: Stop ALL Docker containers
echo "🛑 Step 1: Stopping all Docker containers..."
docker compose -f docker-compose.sit.yml down 2>/dev/null || true
docker ps -q | xargs -r docker stop 2>/dev/null || true
sleep 3
echo "✅ Containers stopped"
echo ""

# Step 2: Discard ALL local changes forcefully
echo "🗑️  Step 2: Discarding all local changes..."
git reset --hard HEAD 2>/dev/null || true
git clean -fd 2>/dev/null || true
echo "✅ Local changes discarded"
echo ""

# Step 3: Remove conflicting untracked files
echo "🗑️  Step 3: Removing conflicting untracked files..."
rm -rf apps/backend/assets/images/ 2>/dev/null || true
rm -rf apps/backend/scripts/ 2>/dev/null || true
rm -rf apps/backend/src/entities/category-type.entity.ts 2>/dev/null || true
rm -rf apps/backend/src/modules/auth/dto/change-password.dto.ts 2>/dev/null || true
rm -rf apps/backend/src/modules/category-type/ 2>/dev/null || true
rm -rf apps/frontend/src/services/categoryTypeApi.ts 2>/dev/null || true
rm -rf apps/frontend/src/stores/categoryTypes.ts 2>/dev/null || true
rm -rf apps/frontend/src/views/AddNewNotificationTypeView.vue 2>/dev/null || true
echo "✅ Conflicting files removed"
echo ""

# Step 4: Fix permissions on image directory (with sudo)
echo "📁 Step 4: Fixing permissions on image directory..."
sudo chown -R $USER:$USER apps/frontend/src/assets/image/ 2>/dev/null || {
    echo "⚠️  sudo chown failed, trying without sudo..."
    chown -R $USER:$USER apps/frontend/src/assets/image/ 2>/dev/null || true
}

# Remove ALL image files (they'll be recreated from git)
echo "🗑️  Removing all image files (will be recreated from git)..."
sudo rm -rf apps/frontend/src/assets/image/* 2>/dev/null || rm -rf apps/frontend/src/assets/image/* 2>/dev/null || true
echo "✅ Image files removed"
echo ""

# Step 5: Pull latest code
echo "⬇️  Step 5: Pulling latest code from develop..."
git fetch origin
git reset --hard origin/develop
echo "✅ Code pulled successfully"
echo ""

# Step 6: Verify LogoNBC.svg exists
echo "✅ Step 6: Verifying LogoNBC.svg..."
if [ -f "apps/frontend/src/assets/image/LogoNBC.svg" ]; then
    echo "✅ LogoNBC.svg found!"
    ls -lh apps/frontend/src/assets/image/LogoNBC.svg
else
    echo "❌ LogoNBC.svg missing - trying to restore..."
    git checkout origin/develop -- apps/frontend/src/assets/image/LogoNBC.svg 2>/dev/null || {
        echo "⚠️  Still missing - checking git history..."
        git show origin/develop:apps/frontend/src/assets/image/LogoNBC.svg > apps/frontend/src/assets/image/LogoNBC.svg 2>/dev/null || {
            echo "❌ CRITICAL: LogoNBC.svg not found in git!"
            echo "   You may need to copy it manually from your local machine"
        }
    }
    if [ -f "apps/frontend/src/assets/image/LogoNBC.svg" ]; then
        echo "✅ LogoNBC.svg restored!"
    fi
fi
echo ""

# Step 7: List all image files to verify
echo "📋 Step 7: Verifying all image files..."
ls -la apps/frontend/src/assets/image/ | head -20
echo ""

echo "✅ Complete fix done! Ready to deploy."
echo ""
echo "Next step: bash deploy-sit-server.sh"

