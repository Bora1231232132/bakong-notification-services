# Quick Start Guide

## 🚀 Complete Deployment (One Command)

```bash
bash COMPLETE_DEPLOY.sh
```

This script:
1. ✅ Pulls latest code
2. ✅ Runs database migration
3. ✅ Starts all services in correct order
4. ✅ Verifies everything is working

## 📋 Startup Order (What Starts First)

```
1. Database (db)
   ↓ (waits for healthcheck - 30 seconds)
2. Backend (backend) 
   ↓ (waits for backend to start)
3. Frontend (frontend)
```

## 🔄 Manual Deployment Steps

```bash
# Step 1: Pull code
git pull origin master

# Step 2: Run migration (IMPORTANT - do this first!)
bash RUN_MIGRATION_ON_DEPLOY.sh

# Step 3: Start services
docker-compose -f docker-compose.production.yml up -d
```

## ✅ Environment Configuration

**All correct!** ✅

- Database: `bakong_notification_services` / `bkns` / `010110bkns`
- Backend connects to: `db:5432` (Docker service name)
- `TYPEORM_SYNCHRONIZE=false` (uses migrations, not auto-sync)

## 🔍 Verify Everything

```bash
# Check containers
docker ps | grep bakong-notification-services

# Test backend
curl http://10.20.6.58/api/v1/health

# Test frontend
curl http://10.20.6.58

# View logs
docker-compose -f docker-compose.production.yml logs -f
```

## 📚 Full Documentation

See `DEPLOYMENT_FLOW.md` for complete details.

