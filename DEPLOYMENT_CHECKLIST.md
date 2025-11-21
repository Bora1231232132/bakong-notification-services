# ✅ Deployment Checklist - SIT

## Database Migration Status

### ✅ Migration Already Exists!

The `bakongPlatform` column migration is **already included** in `apps/backend/migrations/unified-migration.sql`:

```sql
-- Add bakongPlatform to bakong_user table (lines 193-204)
IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bakong_user'
    AND column_name = 'bakongPlatform'
) THEN
    ALTER TABLE bakong_user ADD COLUMN "bakongPlatform" bakong_platform_enum;
    RAISE NOTICE '✅ Added bakongPlatform to bakong_user table';
ELSE
    RAISE NOTICE 'ℹ️  bakong_user.bakongPlatform already exists';
END IF;
```

**Index is also created:**
```sql
CREATE INDEX IF NOT EXISTS "IDX_bakong_user_bakongPlatform" ON bakong_user("bakongPlatform");
```

---

## What You Need to Do

### 1. ✅ Code Changes (No Migration Needed)
- ✅ Validation added: `bakongPlatform` required when `accountId` provided
- ✅ FCM token can be empty/temporary
- ✅ No database schema changes needed (column already exists in migration)

### 2. 🔄 Run Migration on SIT (If Not Already Run)

**Option A: Using Migration Script (Recommended)**
```bash
# On SIT server
cd ~/bakong-notification-services
bash RUN_MIGRATION_ON_DEPLOY.sh
```

**Option B: Manual Migration**
```bash
# Via Docker
docker exec -i bakong-notification-services-db psql -U bkns -d bakong_notification_services < apps/backend/migrations/unified-migration.sql

# Or directly (if not using Docker)
psql -U bkns -d bakong_notification_services -f apps/backend/migrations/unified-migration.sql
```

**Option C: Check if Column Already Exists**
```sql
-- Check if bakongPlatform column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bakong_user' 
AND column_name = 'bakongPlatform';

-- If it returns a row, column already exists ✅
-- If it returns no rows, run the migration
```

---

## Deployment Steps

### 1. Push Code to SIT
```bash
git push origin develop
# Or merge to your SIT branch
```

### 2. Pull on SIT Server
```bash
ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no dev@10.20.6.57
cd ~/bakong-notification-services
git pull origin develop
```

### 3. Run Migration (If Needed)
```bash
# Check if column exists first
docker exec -i bakong-notification-services-db psql -U bkns -d bakong_notification_services -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'bakong_user' AND column_name = 'bakongPlatform';"

# If column doesn't exist, run migration
bash RUN_MIGRATION_ON_DEPLOY.sh
```

### 4. Rebuild and Restart
```bash
cd ~/bakong-notification-services
docker-compose -f docker-compose.sit.yml down
docker-compose -f docker-compose.sit.yml build
docker-compose -f docker-compose.sit.yml up -d
```

### 5. Verify
```bash
# Check logs
docker-compose -f docker-compose.sit.yml logs -f backend

# Test API
curl -X POST http://10.20.6.57:8080/api/v1/notification/send \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "accountId": "test@bkrt",
    "bakongPlatform": "BAKONG",
    "fcmToken": "test-token",
    "language": "KM"
  }'
```

---

## Summary

| Item | Status | Action Required |
|------|--------|----------------|
| **Code Changes** | ✅ Ready | Push to SIT |
| **Database Migration** | ✅ Already in migration file | Run migration if column doesn't exist |
| **bakongPlatform Column** | ✅ Migration exists | Check if exists, run migration if needed |
| **Validation** | ✅ Added | No action needed |

---

## Important Notes

1. **Migration is Idempotent**: Safe to run multiple times - it checks if column exists before adding
2. **No Breaking Changes**: Existing users with NULL `bakongPlatform` will still work (validation only applies to new requests)
3. **Mobile App Must Provide**: New user registrations will require `bakongPlatform` when `accountId` is provided

---

## Quick Check Commands

```bash
# 1. Check if bakongPlatform column exists
docker exec -i bakong-notification-services-db psql -U bkns -d bakong_notification_services -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'bakong_user' AND column_name = 'bakongPlatform';"

# 2. Check if enum type exists
docker exec -i bakong-notification-services-db psql -U bkns -d bakong_notification_services -c "SELECT typname FROM pg_type WHERE typname = 'bakong_platform_enum';"

# 3. Check if index exists
docker exec -i bakong-notification-services-db psql -U bkns -d bakong_notification_services -c "SELECT indexname FROM pg_indexes WHERE tablename = 'bakong_user' AND indexname = 'IDX_bakong_user_bakongPlatform';"
```

**If all three return results, migration is already applied! ✅**

