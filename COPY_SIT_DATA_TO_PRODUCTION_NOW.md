# 📊 Copy SIT Data to Production - Step by Step

## ⚠️ Important
- This will **REPLACE** all production data with SIT data
- SIT environment will **NOT be modified** (only reads from SIT)
- Production will have all SIT data including:
  - ✅ All users
  - ✅ All templates and translations
  - ✅ All images (BYTEA data)
  - ✅ All notifications
  - ✅ All bakong_user records

## Step 1: Verify SIT is Running

```bash
# Check if SIT containers are running
docker ps | grep bakong-notification-services-db-sit

# If not running, start SIT first (but DON'T touch it after)
docker-compose -f docker-compose.sit.yml up -d db
```

## Step 2: Verify Production is Running

```bash
# Check production containers
docker-compose -f docker-compose.production.yml ps

# Should show:
# - bakong-notification-services-db: Up (healthy)
# - bakong-notification-services-api: Up (healthy)
```

## Step 3: Run the Copy Script

```bash
cd ~/bakong-notification-services

# Run the copy script
cd apps/backend
bash scripts/copy-sit-data-to-production.sh
```

The script will:
1. ✅ Ask for confirmation (type "YES")
2. ✅ Create backup of production automatically
3. ✅ Export all SIT data
4. ✅ Clear production database
5. ✅ Import SIT data to production
6. ✅ Verify the copy

## Step 4: Verify Data After Copy

```bash
# Check data counts
docker exec -it bakong-notification-services-db psql -U bkns -d bakong_notification_services <<EOF
SELECT 
    'Users' as type, COUNT(*) as count FROM "user" WHERE "deletedAt" IS NULL
UNION ALL
SELECT 'Templates', COUNT(*) FROM template WHERE "deletedAt" IS NULL
UNION ALL
SELECT 'Images', COUNT(*) FROM image
UNION ALL
SELECT 'Template Translations', COUNT(*) FROM template_translation
UNION ALL
SELECT 'Bakong Users', COUNT(*) FROM bakong_user
UNION ALL
SELECT 'Notifications', COUNT(*) FROM notification;
EOF
```

## Step 5: Refresh Browser

After copying, refresh your browser at `http://10.20.6.58` and you should see all the SIT data!

## Troubleshooting

### If SIT container doesn't exist:

The script will show an error. You need to start SIT first:

```bash
# Start SIT database only (don't start backend/frontend)
docker-compose -f docker-compose.sit.yml up -d db

# Wait for it to be ready
sleep 10

# Then run copy script
cd apps/backend
bash scripts/copy-sit-data-to-production.sh
```

### If copy fails:

Check the error message and:
1. Make sure SIT database is running
2. Make sure Production database is running
3. Check if you have enough disk space
4. Check logs: `docker-compose -f docker-compose.production.yml logs db`

