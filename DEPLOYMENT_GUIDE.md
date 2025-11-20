# Deployment Guide - Bakong Platform Feature

This guide covers deploying the new `bakongPlatform` feature to both develop branch and production server.

## 📋 Pre-Deployment Checklist

- [ ] All code changes committed
- [ ] Tests pass locally
- [ ] Database migrations prepared
- [ ] Backend builds successfully
- [ ] Frontend builds successfully

## 🗄️ Database Migrations Required

The following database changes need to be applied:

1. **`bakong_platform_enum` type** - Enum for Bakong platforms
2. **`template.bakongPlatform` column** - Store platform for each template
3. **`bakong_user.bakongPlatform` column** - Store platform for each user

## 📦 Step 1: Push to Develop Branch

```bash
# Make sure you're on the correct branch
git status

# Add all changes
git add .

# Commit changes
git commit -m "feat: Add bakongPlatform filtering for notifications

- Add bakongPlatform to template and bakong_user tables
- Filter notifications by bakongPlatform in inbox and send APIs
- Update frontend to display platform-specific messages
- Add helper functions for platform name formatting"

# Push to develop branch
git push origin develop
```

## 🗄️ Step 2: Run Database Migrations

### Option A: Using the Migration Script (Recommended)

```bash
# Navigate to backend directory
cd apps/backend

# Run the consolidated migration script
bash scripts/run-bakong-platform-migration.sh [environment]

# Examples:
bash scripts/run-bakong-platform-migration.sh development
bash scripts/run-bakong-platform-migration.sh staging
bash scripts/run-bakong-platform-migration.sh production
```

### Option B: Manual SQL Execution

```bash
# For development
psql -U bkns_dev -d bakong_notification_services_dev -f scripts/add-bakong-platform-migration.sql

# For staging
psql -U bkns_sit -d bakong_notification_services_sit -f scripts/add-bakong-platform-migration.sql

# For production
psql -U bkns -d bakong_notification_services -f scripts/add-bakong-platform-migration.sql
```

### Option C: Via Docker

```bash
# For development
docker exec -i bakong-notification-services-db-dev psql -U bkns_dev -d bakong_notification_services_dev < apps/backend/scripts/add-bakong-platform-migration.sql

# For staging
docker exec -i bakong-notification-services-db-sit psql -U bkns_sit -d bakong_notification_services_sit < apps/backend/scripts/add-bakong-platform-migration.sql

# For production
docker exec -i bakong-notification-services-db-prod psql -U bkns -d bakong_notification_services < apps/backend/scripts/add-bakong-platform-migration.sql
```

## 🚀 Step 3: Deploy to Server

### Using the Deployment Script

```bash
# Make sure you're in the project root
cd /path/to/bakong-notification-services

# Run deployment script
bash deploy-on-server.sh
```

### Manual Deployment Steps

1. **SSH into the server**
   ```bash
   ssh user@your-server
   ```

2. **Navigate to project directory**
   ```bash
   cd /path/to/bakong-notification-services
   ```

3. **Pull latest code**
   ```bash
   git pull origin develop
   # or
   git pull origin main
   ```

4. **Run database migrations** (see Step 2 above)

5. **Rebuild and restart services**
   ```bash
   # Rebuild Docker images
   docker compose -f docker-compose.production.yml build

   # Restart services
   docker compose -f docker-compose.production.yml up -d

   # Or if using different compose file
   docker compose -f docker-compose.sit.yml up -d --build
   ```

6. **Verify deployment**
   ```bash
   # Check logs
   docker compose -f docker-compose.production.yml logs -f backend

   # Check if services are running
   docker compose -f docker-compose.production.yml ps
   ```

## ✅ Step 4: Verify Deployment

1. **Check database schema**
   ```sql
   -- Verify enum type exists
   SELECT typname FROM pg_type WHERE typname = 'bakong_platform_enum';

   -- Verify template table has bakongPlatform column
   SELECT column_name, data_type, udt_name 
   FROM information_schema.columns 
   WHERE table_name = 'template' AND column_name = 'bakongPlatform';

   -- Verify bakong_user table has bakongPlatform column
   SELECT column_name, data_type, udt_name 
   FROM information_schema.columns 
   WHERE table_name = 'bakong_user' AND column_name = 'bakongPlatform';
   ```

2. **Test API endpoints**
   ```bash
   # Test inbox endpoint with bakongPlatform
   curl -X POST http://your-server/api/v1/notification/inbox \
     -H "Content-Type: application/json" \
     -H "x-api-key: BAKONG" \
     -d '{
       "accountId": "test@bkrt",
       "fcmToken": "test-token",
       "language": "EN",
       "platform": "ANDROID",
       "bakongPlatform": "BAKONG_TOURIST"
     }'
   ```

3. **Test frontend**
   - Open the application in browser
   - Create a notification with a specific Bakong platform
   - Verify it filters correctly

## 🔄 Rollback Plan (If Needed)

If you need to rollback:

1. **Revert code changes**
   ```bash
   git revert <commit-hash>
   git push origin develop
   ```

2. **Database rollback** (if needed)
   ```sql
   -- Remove columns (be careful - this will lose data!)
   ALTER TABLE template DROP COLUMN IF EXISTS "bakongPlatform";
   ALTER TABLE bakong_user DROP COLUMN IF EXISTS "bakongPlatform";
   
   -- Note: Cannot drop enum type if it's still in use
   -- Only drop if you're sure nothing uses it
   -- DROP TYPE IF EXISTS bakong_platform_enum;
   ```

## 📝 Migration Script Details

The migration script (`add-bakong-platform-migration.sql`) will:
- ✅ Create `bakong_platform_enum` if it doesn't exist
- ✅ Add `bakongPlatform` column to `template` table if it doesn't exist
- ✅ Add `bakongPlatform` column to `bakong_user` table if it doesn't exist
- ✅ Create indexes for better query performance
- ✅ Verify all changes were applied successfully

## 🐛 Troubleshooting

### Migration fails with "type already exists"
- This is normal if the enum was created previously
- The script uses `IF NOT EXISTS` so it's safe to run multiple times

### Migration fails with "column already exists"
- This is normal if the column was added previously
- The script uses `IF NOT EXISTS` so it's safe to run multiple times

### Application fails to start after migration
- Check database connection settings
- Verify all migrations completed successfully
- Check application logs for specific errors

### Frontend shows errors
- Clear browser cache
- Rebuild frontend: `cd apps/frontend && npm run build`
- Check browser console for errors

## 📞 Support

If you encounter issues:
1. Check the logs: `docker compose logs -f`
2. Verify database schema matches expected structure
3. Check that all environment variables are set correctly
4. Review the migration script output for errors

