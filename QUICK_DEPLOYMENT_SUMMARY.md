# 🚀 Quick Deployment Summary

Since you've already pushed to git, here's what to do on the server:

## ✅ What's Already Done
- ✅ Code pushed to `develop` branch
- ✅ Migration scripts created
- ✅ Deployment script updated

## 📝 On the Server - Run These Commands

### Option 1: Use the Deployment Scrip (Easiest)
```bash
cd ~/bakong-notificattion-services
bash deploy-on-server.sh
```
This will:
- Pull latest code
- Run database migrations (including bakongPlatform)
- Rebuild and restart services

### Option 2: Manual Steps

**1. Pull latest code:**
```bash
cd ~/bakong-notification-services
git pull origin develop
```

**2. Run database migration:**
```bash
# Option A: Using the migration script
cd apps/backend
bash scripts/run-bakong-platform-migration.sh staging

# Option B: Direct SQL execution
docker exec -i bakong-notification-services-db-sit psql -U bkns_sit -d bakong_notification_services_sit < apps/backend/scripts/add-bakong-platform-migration.sql
```

**3. Deploy application:**
```bash
cd ~/bakong-notification-services
docker compose -f docker-compose.sit.yml down
docker compose -f docker-compose.sit.yml build --no-cache backend
docker compose -f docker-compose.sit.yml up -d
```

**4. Check logs:**
```bash
docker compose -f docker-compose.sit.yml logs -f backend
```

## ✅ Verify Migration Success

After running migration, you should see:
- ✅ `bakong_platform_enum type exists`
- ✅ `template.bakongPlatform column exists`
- ✅ `bakong_user.bakongPlatform column exists`

## 🧪 Test After Deployment

1. **Health check:**
   ```bash
   curl http://10.20.6.57:4002/api/v1/health
   ```

2. **Test API:**
   ```bash
   curl -X POST http://10.20.6.57:4002/api/v1/notification/inbox \
     -H "Content-Type: application/json" \
     -H "x-api-key: BAKONG" \
     -d '{"accountId": "test@bkrt", "fcmToken": "test", "language": "EN", "platform": "ANDROID", "bakongPlatform": "BAKONG_TOURIST"}'
   ```

3. **Check frontend:**
   - Open: http://10.20.6.57:8090
   - Create a notification with Bakong Tourist or Bakong Junior
   - Verify it works correctly

## 📋 Files Created for Deployment

- ✅ `apps/backend/scripts/add-bakong-platform-migration.sql` - SQL migration
- ✅ `apps/backend/scripts/run-bakong-platform-migration.sh` - Migration runner
- ✅ `deploy-on-server.sh` - Updated with new migration
- ✅ `DEPLOYMENT_GUIDE.md` - Detailed guide
- ✅ `DEPLOYMENT_CHECKLIST.md` - Step-by-step checklist

## 🆘 Need Help?

Refer to:
- `DEPLOYMENT_GUIDE.md` - Full deployment instructions
- `DEPLOYMENT_CHECKLIST.md` - Detailed checklist
- Check logs: `docker compose -f docker-compose.sit.yml logs -f`

---

**That's it!** The migration is idempotent (safe to run multiple times), so you can run it without worry.

