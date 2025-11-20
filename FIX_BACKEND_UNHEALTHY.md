# 🔧 Fix Backend Unhealthy Container

## Error
```
ERROR: for backend  Container "b4dd3021678f" is unhealthy.
ERROR: Encountered errors while bringing up the project.
```

## Step 1: Check Backend Logs

```bash
# Check backend container logs
docker-compose -f docker-compose.production.yml logs backend

# Or check specific container
docker logs bakong-notification-services-backend
```

## Step 2: Check Database Status

```bash
# Check if database is running and healthy
docker-compose -f docker-compose.production.yml ps

# Check database logs
docker-compose -f docker-compose.production.yml logs db

# Check database container directly
docker exec -it bakong-notification-services-db psql -U bkns -d bakong_notification_services -c "SELECT 1;"
```

## Step 3: Common Issues & Fixes

### Issue 1: Database Not Ready Yet

The database might still be initializing. Wait a bit and check again:

```bash
# Wait 30 seconds for database to initialize
sleep 30

# Check database health
docker-compose -f docker-compose.production.yml ps db

# Restart backend
docker-compose -f docker-compose.production.yml restart backend
```

### Issue 2: Database Connection Failed

Check if backend can connect to database:

```bash
# Check backend environment variables
docker-compose -f docker-compose.production.yml config | grep -A 20 backend

# Test database connection from backend container
docker exec bakong-notification-services-backend node -e "
const { Client } = require('pg');
const client = new Client({
  host: process.env.POSTGRES_HOST || 'db',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'bakong_notification_services',
  user: process.env.POSTGRES_USER || 'bkns',
  password: process.env.POSTGRES_PASSWORD || '010110bkns'
});
client.connect()
  .then(() => { console.log('✅ Database connection successful'); client.end(); })
  .catch(err => { console.error('❌ Database connection failed:', err.message); process.exit(1); });
"
```

### Issue 3: Missing Environment File

Check if environment file exists:

```bash
# Check if env file exists
ls -la apps/backend/env.production

# If missing, check what env files exist
ls -la apps/backend/env*
```

### Issue 4: Health Check Failing

The health check might be too strict. Check backend logs:

```bash
# Check if backend is actually running
docker exec bakong-notification-services-backend ps aux

# Test health endpoint manually
docker exec bakong-notification-services-backend wget -qO- http://localhost:8080/api/v1/health || echo "Health check failed"
```

## Step 4: Restart Services

```bash
# Stop all production containers
docker-compose -f docker-compose.production.yml down

# Start database first
docker-compose -f docker-compose.production.yml up -d db

# Wait for database to be ready (check logs)
docker-compose -f docker-compose.production.yml logs -f db
# Press Ctrl+C when you see "database system is ready to accept connections"

# Then start backend and frontend
docker-compose -f docker-compose.production.yml up -d
```

## Step 5: Verify Everything is Running

```bash
# Check all container statuses
docker-compose -f docker-compose.production.yml ps

# All should show "Up (healthy)" or "Up"
# If backend shows "Up (unhealthy)", check logs:
docker-compose -f docker-compose.production.yml logs backend | tail -50
```

## Quick Fix Command

Try this sequence:

```bash
# Stop everything
docker-compose -f docker-compose.production.yml down

# Start database and wait
docker-compose -f docker-compose.production.yml up -d db
sleep 20

# Start backend and frontend
docker-compose -f docker-compose.production.yml up -d backend frontend

# Check status
docker-compose -f docker-compose.production.yml ps

# Check logs if still unhealthy
docker-compose -f docker-compose.production.yml logs backend | tail -30
```

