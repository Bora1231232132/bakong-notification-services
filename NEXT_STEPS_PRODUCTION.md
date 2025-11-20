# ✅ Next Steps - Production Setup

## Current Status
- ✅ Backend is running and healthy
- ✅ Database is running
- ⚠️ Frontend might not be started
- ⚠️ Connection refused error (need to check ports)

## Step 1: Start Frontend

```bash
# Start frontend container
docker-compose -f docker-compose.production.yml up -d frontend

# Check all containers
docker-compose -f docker-compose.production.yml ps
```

## Step 2: Verify All Services

```bash
# Check container status
docker-compose -f docker-compose.production.yml ps

# Should show:
# - bakong-notification-services-db: Up (healthy)
# - bakong-notification-services-api: Up (healthy)
# - bakong-notification-services-frontend: Up
```

## Step 3: Check Ports

The connection refused error suggests the frontend might not be accessible. Check:

```bash
# Check what ports are exposed
docker-compose -f docker-compose.production.yml ps

# Check if ports are listening
netstat -tulpn | grep -E "80|443|8080"

# Or use ss command
ss -tulpn | grep -E "80|443|8080"
```

## Step 4: Test Backend API

```bash
# Test backend health endpoint
curl http://localhost:8080/api/v1/health

# Or from your local machine (if accessible):
curl http://10.20.6.58:8080/api/v1/health
```

## Step 5: Test Frontend

```bash
# Test frontend
curl http://localhost:80

# Or from browser:
# http://10.20.6.58
# or
# https://prod-bakong-notification.nbc.gov.kh
```

## Step 6: Check Logs if Issues

```bash
# Backend logs
docker-compose -f docker-compose.production.yml logs backend | tail -30

# Frontend logs
docker-compose -f docker-compose.production.yml logs frontend | tail -30

# Database logs
docker-compose -f docker-compose.production.yml logs db | tail -30
```

## Step 7: Verify Database Tables

The migration showed tables don't exist. Check if TypeORM created them:

```bash
# Connect to database
docker exec -it bakong-notification-services-db psql -U bkns -d bakong_notification_services

# List all tables
\dt

# Exit
\q
```

If tables don't exist, run init-db.sql:
```bash
docker exec -i bakong-notification-services-db psql -U bkns -d bakong_notification_services < apps/backend/init-db.sql
```

## Quick Checklist

- [ ] Frontend container is running
- [ ] All containers show "Up" or "Up (healthy)"
- [ ] Backend API responds at port 8080
- [ ] Frontend is accessible at port 80/443
- [ ] Database tables exist
- [ ] Can access from browser

