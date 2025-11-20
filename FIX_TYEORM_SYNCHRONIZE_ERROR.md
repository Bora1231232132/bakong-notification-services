# 🔧 Fix TypeORM Synchronize Error

## Problem
TypeORM is trying to automatically synchronize the database schema, but it's conflicting with existing migrations:
```
QueryFailedError: cannot drop type bakong_platform_enum because other objects depend on it
```

## Solution: Disable TypeORM Synchronize

TypeORM synchronize should be **FALSE** in production. It's dangerous and causes conflicts.

### Step 1: Update docker-compose.production.yml

Change:
```yaml
- TYPEORM_SYNCHRONIZE=true
```

To:
```yaml
- TYPEORM_SYNCHRONIZE=false
```

### Step 2: Run Migrations Manually

After disabling synchronize, run the migrations:

```bash
# On server
cd ~/bakong-notification-services

# Run bakongPlatform migration
docker exec -i bakong-notification-services-db psql -U bkns -d bakong_notification_services < apps/backend/scripts/add-bakong-platform-migration.sql

# Run username migration
docker exec -i bakong-notification-services-db psql -U bkns -d bakong_notification_services < apps/backend/scripts/update-usernames-to-lowercase.sql
```

### Step 3: Restart Backend

```bash
docker-compose -f docker-compose.production.yml restart backend

# Check logs
docker-compose -f docker-compose.production.yml logs backend | tail -30
```

## Quick Fix Commands

Run these on the server:

```bash
cd ~/bakong-notification-services

# 1. Stop backend
docker-compose -f docker-compose.production.yml stop backend

# 2. Edit docker-compose.production.yml to set TYPEORM_SYNCHRONIZE=false
# (Or I can help you do this)

# 3. Run migrations
docker exec -i bakong-notification-services-db psql -U bkns -d bakong_notification_services < apps/backend/scripts/add-bakong-platform-migration.sql
docker exec -i bakong-notification-services-db psql -U bkns -d bakong_notification_services < apps/backend/scripts/update-usernames-to-lowercase.sql

# 4. Restart backend
docker-compose -f docker-compose.production.yml up -d backend

# 5. Check status
docker-compose -f docker-compose.production.yml ps
docker-compose -f docker-compose.production.yml logs backend | tail -20
```

