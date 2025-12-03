#!/bin/bash
# Fix permission issues on SIT server and pull latest code

echo "🔧 Fixing permissions and pulling latest code..."

cd ~/bakong-notification-services

# Fix ownership of files (if they're owned by root/docker)
echo "📁 Fixing file ownership..."
sudo chown -R $USER:$USER apps/frontend/src/assets/image/ 2>/dev/null || true
sudo chown -R $USER:$USER . 2>/dev/null || true

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
fi

echo "✅ Done! Ready to deploy."

