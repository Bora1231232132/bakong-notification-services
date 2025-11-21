#!/bin/bash
# Switch GitHub Repository to Organization/Workplace
# Run this script to migrate from personal repo to organization repo
# Usage: bash SWITCH_GITHUB_REPO.sh

set -e

echo "🔄 GitHub Repository Migration Script"
echo "======================================"
echo ""

# Get current repository info
CURRENT_REMOTE=$(git remote get-url origin 2>/dev/null || echo "")
CURRENT_ORG=$(echo "$CURRENT_REMOTE" | sed -n 's|.*github.com[:/]\([^/]*\)/.*|\1|p')

echo "📋 Current Configuration:"
echo "   Remote URL: $CURRENT_REMOTE"
echo "   Current Org/User: $CURRENT_ORG"
echo ""

# Get new repository details
read -p "Enter new GitHub organization/username: " NEW_ORG
read -p "Enter repository name (default: bakong-notification-services): " NEW_REPO
NEW_REPO=${NEW_REPO:-bakong-notification-services}

NEW_REMOTE="https://github.com/${NEW_ORG}/${NEW_REPO}"

echo ""
echo "📋 New Configuration:"
echo "   New Remote URL: $NEW_REMOTE"
echo "   New Org/User: $NEW_ORG"
echo ""

read -p "Continue with migration? (y/n): " confirm
if [ "$confirm" != "y" ]; then
    echo "Migration cancelled."
    exit 0
fi

echo ""
echo "🔄 Step 1: Updating git remote..."
git remote set-url origin "$NEW_REMOTE"
echo "✅ Remote updated to: $NEW_REMOTE"

echo ""
echo "🔄 Step 2: Updating docker-compose files..."

# Update docker-compose.production.yml
if [ -f "docker-compose.production.yml" ]; then
    echo "   Updating docker-compose.production.yml..."
    sed -i "s|ghcr.io/${CURRENT_ORG}/|ghcr.io/${NEW_ORG}/|g" docker-compose.production.yml
    sed -i "s|github.com/${CURRENT_ORG}/|github.com/${NEW_ORG}/|g" docker-compose.production.yml
    echo "   ✅ Updated docker-compose.production.yml"
fi

# Update docker-compose.sit.yml
if [ -f "docker-compose.sit.yml" ]; then
    echo "   Updating docker-compose.sit.yml..."
    sed -i "s|ghcr.io/${CURRENT_ORG}/|ghcr.io/${NEW_ORG}/|g" docker-compose.sit.yml
    sed -i "s|github.com/${CURRENT_ORG}/|github.com/${NEW_ORG}/|g" docker-compose.sit.yml
    echo "   ✅ Updated docker-compose.sit.yml"
fi

# Update docker-compose.test-server.yml if exists
if [ -f "docker-compose.test-server.yml" ]; then
    echo "   Updating docker-compose.test-server.yml..."
    sed -i "s|ghcr.io/${CURRENT_ORG}/|ghcr.io/${NEW_ORG}/|g" docker-compose.test-server.yml
    sed -i "s|github.com/${CURRENT_ORG}/|github.com/${NEW_ORG}/|g" docker-compose.test-server.yml
    echo "   ✅ Updated docker-compose.test-server.yml"
fi

echo ""
echo "🔄 Step 3: Checking for other GitHub references..."
# Find other files that might reference the old org
OTHER_FILES=$(grep -r -l "github.com/${CURRENT_ORG}\|ghcr.io/${CURRENT_ORG}" --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null | grep -v package-lock.json | head -10)

if [ -n "$OTHER_FILES" ]; then
    echo "   Found references in:"
    echo "$OTHER_FILES" | sed 's/^/     - /'
    echo ""
    read -p "   Update these files? (y/n): " update_others
    if [ "$update_others" = "y" ]; then
        echo "$OTHER_FILES" | while read file; do
            if [ -f "$file" ]; then
                sed -i "s|github.com/${CURRENT_ORG}/|github.com/${NEW_ORG}/|g" "$file"
                sed -i "s|ghcr.io/${CURRENT_ORG}/|ghcr.io/${NEW_ORG}/|g" "$file"
                echo "     ✅ Updated $file"
            fi
        done
    fi
fi

echo ""
echo "📋 Step 4: Summary of Changes"
echo "=============================="
echo "✅ Git remote updated"
echo "✅ Docker compose files updated"
echo ""
echo "📝 Next Steps (Manual):"
echo ""
echo "1. Create repository in GitHub organization:"
echo "   - Go to: https://github.com/organizations/${NEW_ORG}/repositories/new"
echo "   - Repository name: ${NEW_REPO}"
echo "   - Make it private/public as needed"
echo ""
echo "2. Push code to new repository:"
echo "   git push origin --all"
echo "   git push origin --tags"
echo ""
echo "3. Set up GitHub Actions secrets in new repository:"
echo "   - Go to: https://github.com/${NEW_ORG}/${NEW_REPO}/settings/secrets/actions"
echo "   - Add secret: GHCR_PAT (Personal Access Token with write:packages permission)"
echo ""
echo "4. Update server remote (on production server):"
echo "   cd ~/bakong-notification-services"
echo "   git remote set-url origin ${NEW_REMOTE}"
echo "   git fetch origin"
echo ""
echo "5. Verify GitHub Actions workflow:"
echo "   - Check: .github/workflows/docker-image.yml"
echo "   - It uses \${{ github.repository_owner }} which auto-adapts ✅"
echo ""
echo "✅ Migration script completed!"
echo ""
echo "💡 Note: GitHub Actions will automatically use the new organization"
echo "   because workflows use \${{ github.repository_owner }}"

