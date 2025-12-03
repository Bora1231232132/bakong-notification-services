#!/bin/bash
# Fix permission issues on SIT server and pull latest code

echo "🔧 Fixing permissions and pulling latest code..."

cd ~/bakong-notification-services

# Stop Docker containers first (they may have mounted the files)
echo "🛑 Stopping Docker containers to release file locks..."
docker compose -f docker-compose.sit.yml down 2>/dev/null || true
sleep 2

# Fix ownership of files (if they're owned by root/docker)
echo "📁 Fixing file ownership..."
# Try with sudo first
if sudo chown -R $USER:$USER apps/frontend/src/assets/image/ 2>/dev/null; then
    echo "✅ Fixed permissions with sudo"
elif chown -R $USER:$USER apps/frontend/src/assets/image/ 2>/dev/null; then
    echo "✅ Fixed permissions without sudo"
else
    echo "⚠️  Cannot fix permissions - trying to remove files..."
    # Remove files that git can't update due to permissions (with sudo)
    sudo rm -f apps/frontend/src/assets/image/*.svg apps/frontend/src/assets/image/*.png apps/frontend/src/assets/image/*.jpg 2>/dev/null || true
    # Also try without sudo
    rm -f apps/frontend/src/assets/image/*.svg apps/frontend/src/assets/image/*.png apps/frontend/src/assets/image/*.jpg 2>/dev/null || true
    echo "✅ Removed problematic files"
fi

# Stash or discard local changes
echo "💾 Stashing local changes..."
git stash push -m "Stash before pull $(date)" || true

# Remove untracked files that conflict
echo "🗑️  Removing conflicting untracked files..."
rm -rf apps/backend/assets/images/Event.png 2>/dev/null || true
rm -rf apps/backend/assets/images/News.png 2>/dev/null || true
rm -rf apps/backend/assets/images/Other.png 2>/dev/null || true
rm -rf apps/backend/assets/images/ProductAndFeature.png 2>/dev/null || true
rm -rf apps/backend/scripts/fix-notification-cascade-delete.sql 2>/dev/null || true
rm -rf apps/backend/scripts/init-db.sql 2>/dev/null || true
rm -rf apps/backend/scripts/unified-migration.sql 2>/dev/null || true
rm -rf apps/backend/scripts/verify-all-fields.sql 2>/dev/null || true
rm -rf apps/backend/scripts/verify-all.sql 2>/dev/null || true
rm -rf apps/backend/src/entities/category-type.entity.ts 2>/dev/null || true
rm -rf apps/backend/src/modules/auth/dto/change-password.dto.ts 2>/dev/null || true
rm -rf apps/backend/src/modules/category-type/ 2>/dev/null || true
rm -rf apps/frontend/src/services/categoryTypeApi.ts 2>/dev/null || true
rm -rf apps/frontend/src/stores/categoryTypes.ts 2>/dev/null || true
rm -rf apps/frontend/src/views/AddNewNotificationTypeView.vue 2>/dev/null || true

# Remove problematic image files that have permission issues
echo "🗑️  Removing files with permission issues..."
sudo rm -f apps/frontend/src/assets/image/*.svg apps/frontend/src/assets/image/*.png apps/frontend/src/assets/image/*.jpg 2>/dev/null || true
# Also try without sudo
rm -f apps/frontend/src/assets/image/*.svg apps/frontend/src/assets/image/*.png apps/frontend/src/assets/image/*.jpg 2>/dev/null || true

# Pull latest code
echo "⬇️  Pulling latest code from develop..."
git fetch origin
git reset --hard origin/develop

# Verify LogoNBC.svg exists
echo "✅ Verifying LogoNBC.svg exists..."
if [ -f "apps/frontend/src/assets/image/LogoNBC.svg" ]; then
    echo "✅ LogoNBC.svg found!"
    ls -lh apps/frontend/src/assets/image/LogoNBC.svg
else
    echo "❌ LogoNBC.svg still missing!"
    echo "Trying to checkout from remote..."
    git checkout origin/develop -- apps/frontend/src/assets/image/LogoNBC.svg
    if [ -f "apps/frontend/src/assets/image/LogoNBC.svg" ]; then
        echo "✅ LogoNBC.svg restored!"
    else
        echo "⚠️  WARNING: LogoNBC.svg still missing - build may fail"
        echo "   You may need to manually copy the file or fix permissions"
    fi
fi

echo "✅ Done! Ready to deploy."

