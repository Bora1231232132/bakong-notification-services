# 🏭 Production Only Setup (Don't Touch SIT)

## ⚠️ Important
- **QA is testing on SIT** - DO NOT touch SIT environment
- This guide only sets up **PRODUCTION**
- All commands are safe and won't affect SIT

## Step 1: Install Docker Compose

```bash
# Install docker-compose
sudo apt install docker-compose -y

# Verify
docker-compose --version
```

If package not available, download binary:
```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
docker-compose --version
```

## Step 2: Start Production Environment Only

```bash
cd ~/bakong-notification-services

# Start ONLY Production containers
docker-compose -f docker-compose.production.yml up -d

# Verify (should only show production containers)
docker ps | grep bakong-notification-services
```

## Step 3: Run Migrations on Production Only

```bash
# Run migrations on PRODUCTION database only
bash apps/backend/scripts/run-update-usernames.sh production
bash apps/backend/scripts/run-bakong-platform-migration.sh production
```

## Step 4: Deploy Code to Production

```bash
# Deploy to production (won't touch SIT)
bash deploy-to-production.sh
```

## Step 5: Verify Production is Running

```bash
# Check production containers
docker ps | grep bakong-notification-services-db

# Check production backend logs
docker-compose -f docker-compose.production.yml logs backend

# Test production API (adjust port if needed)
curl http://localhost:4001/api/v1/health
```

## ✅ Safe Commands (Won't Touch SIT)

These commands are safe and only affect production:

```bash
# Production only
docker-compose -f docker-compose.production.yml up -d
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml logs
docker-compose -f docker-compose.production.yml ps

# Production database only
docker exec -i bakong-notification-services-db psql -U bkns -d bakong_notification_services
```

## ❌ Commands to AVOID (Will Touch SIT)

**DO NOT RUN THESE** (they affect SIT):

```bash
# ❌ DON'T RUN - Affects SIT
docker-compose -f docker-compose.sit.yml up -d
docker-compose -f docker-compose.sit.yml down
docker exec -i bakong-notification-services-db-sit ...

# ❌ DON'T RUN - Stops all containers
docker stop $(docker ps -q)
docker-compose down
```

## 📊 Copy SIT Data to Production (Optional)

If you want to copy SIT data to production for testing:

```bash
# This script only READS from SIT, doesn't modify it
cd apps/backend
bash scripts/copy-sit-data-to-production.sh
```

**Note**: This script:
- ✅ Only READS from SIT database
- ✅ Only WRITES to Production database
- ❌ Does NOT modify SIT in any way

## 🎯 Summary

1. Install docker-compose
2. Start production containers only
3. Run migrations on production only
4. Deploy code to production
5. Verify production is working

**SIT remains untouched!** ✅

