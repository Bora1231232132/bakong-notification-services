# Switch to GitHub Organization/Workplace Repository

This guide helps you migrate from your personal GitHub repository to a GitHub organization/workplace repository.

## What Needs to Change

### 1. Repository URL References
- Current: `https://github.com/stheany/bakong-notification-services`
- New: `https://github.com/YOUR_ORG/bakong-notification-services`

### 2. Docker Image Registry (GHCR)
- Current: `ghcr.io/stheany/notification-services-backend`
- New: `ghcr.io/YOUR_ORG/notification-services-backend`

### 3. GitHub Actions
- Uses `${{ github.repository_owner }}` (automatically adapts) ✅
- May need to update secrets/permissions

## Migration Steps

### Step 1: Create New Repository in Organization
1. Go to your GitHub organization
2. Create new repository: `bakong-notification-services`
3. Copy repository URL

### Step 2: Update Local Repository Remote
```bash
# Check current remote
git remote -v

# Update to new organization repository
git remote set-url origin https://github.com/YOUR_ORG/bakong-notification-services

# Verify
git remote -v
```

### Step 3: Update Docker Compose Files
Run the migration script (see below) or manually update:
- `docker-compose.production.yml`
- `docker-compose.sit.yml`

Change: `ghcr.io/stheany/` → `ghcr.io/YOUR_ORG/`

### Step 4: Update GitHub Actions Secrets
In the new organization repository:
1. Go to Settings → Secrets and variables → Actions
2. Add `GHCR_PAT` secret (Personal Access Token with `write:packages` permission)
3. Ensure organization has GitHub Packages enabled

### Step 5: Push to New Repository
```bash
# Push all branches
git push origin --all

# Push all tags
git push origin --tags
```

### Step 6: Update Server Remote
On your production server:
```bash
cd ~/bakong-notification-services
git remote set-url origin https://github.com/YOUR_ORG/bakong-notification-services
git fetch origin
```

## Automated Migration Script

Run `SWITCH_GITHUB_REPO.sh` to automate most steps.

