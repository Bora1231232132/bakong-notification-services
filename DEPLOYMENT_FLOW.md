# Deployment & Startup Flow

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT PROCESS                           │
└─────────────────────────────────────────────────────────────────┘

Step 1: Git Pull / Code Update
    ↓
    git pull origin master
    ↓
Step 2: Run Database Migration (NEW - Important!)
    ↓
    bash RUN_MIGRATION_ON_DEPLOY.sh
    ↓
    └─→ Checks if DB is running
    └─→ Runs unified-migration.sql
    └─→ Updates schema (idempotent - safe)
    ↓
Step 3: Start Docker Services
    ↓
    docker-compose -f docker-compose.production.yml up -d
    ↓
    ┌─────────────────────────────────────────┐
    │     DOCKER STARTUP SEQUENCE             │
    └─────────────────────────────────────────┘
    
    ┌─────────────────────────────────────────┐
    │ 1. DATABASE (db) - Starts FIRST          │
    │    - Container: bakong-notification-     │
    │      services-db                         │
    │    - Port: 5433:5432 (host:container)   │
    │    - Healthcheck: pg_isready             │
    │    - Waits: 30s start_period             │
    │    - Auto-runs: init-db.sql              │
    │      (only on FIRST startup)             │
    │    - Status: ✅ Healthy                 │
    └─────────────────────────────────────────┘
            ↓ (waits for healthcheck)
    ┌─────────────────────────────────────────┐
    │ 2. BACKEND (backend) - Starts SECOND     │
    │    - Container: bakong-notification-     │
    │      services-api                        │
    │    - Port: 8080:8080                     │
    │    - Depends on: db (service_healthy)    │
    │    - Connects to: db:5432                │
    │    - Environment:                        │
    │      • POSTGRES_HOST=db                  │
    │      • POSTGRES_DB=bakong_notification_ │
    │        services                          │
    │      • POSTGRES_USER=bkns                │
    │      • TYPEORM_SYNCHRONIZE=false         │
    │    - Status: ✅ Running                 │
    └─────────────────────────────────────────┘
            ↓ (waits for backend to start)
    ┌─────────────────────────────────────────┐
    │ 3. FRONTEND (frontend) - Starts LAST     │
    │    - Container: bakong-notification-     │
    │      services-frontend                   │
    │    - Ports: 80:80, 443:443               │
    │    - Depends on: backend                 │
    │    - Proxies: /api → backend:8080        │
    │    - Serves: Static files (React app)    │
    │    - Status: ✅ Running                 │
    └─────────────────────────────────────────┘
            ↓
    ┌─────────────────────────────────────────┐
    │         APPLICATION READY                │
    │    ✅ http://10.20.6.58                 │
    │    ✅ https://bakong-notification.nbc.  │
    │       gov.kh (when DNS ready)            │
    └─────────────────────────────────────────┘
```

## Detailed Startup Sequence

### Phase 1: Database Initialization

**When:** First time only (if database volume is empty)

1. Docker starts PostgreSQL container
2. PostgreSQL detects empty data directory
3. **Auto-runs:** `init-db.sql` from `/docker-entrypoint-initdb.d/`
4. Creates:
   - Extensions (uuid-ossp, pgcrypto)
   - Enum types
   - Tables
   - Initial schema
5. Database becomes ready

**Note:** `init-db.sql` only runs on FIRST startup. For existing databases, use `unified-migration.sql`.

### Phase 2: Database Health Check

**When:** Every startup

1. Docker runs healthcheck: `pg_isready -U bkns -d bakong_notification_services -p 5432`
2. Checks every 10 seconds
3. Waits up to 30 seconds (start_period)
4. Retries up to 5 times
5. Marks database as "healthy" ✅

### Phase 3: Backend Startup

**When:** After database is healthy

1. Docker starts backend container
2. Backend connects to database at `db:5432`
3. TypeORM connects (TYPEORM_SYNCHRONIZE=false - no auto-sync)
4. Backend API starts on port 8080
5. Health endpoint: `http://backend:8080/api/v1/health`

**Important:** Backend waits for database healthcheck before starting.

### Phase 4: Frontend Startup

**When:** After backend starts

1. Docker starts frontend container
2. Nginx starts
3. Loads config: `nginx-domain.conf`
4. Listens on ports 80 (HTTP) and 443 (HTTPS)
5. Proxies `/api/*` requests to `backend:8080`
6. Serves static React app files

**Important:** Frontend waits for backend to start (depends_on).

## Environment Configuration

### Production Environment Variables

**Database (db service):**
```yaml
POSTGRES_DB: bakong_notification_services
POSTGRES_USER: bkns
POSTGRES_PASSWORD: 010110bkns
```

**Backend (backend service):**
```yaml
POSTGRES_HOST: db              # ← Uses Docker service name
POSTGRES_PORT: 5432           # ← Internal Docker port
POSTGRES_DB: bakong_notification_services
POSTGRES_USER: bkns
POSTGRES_PASSWORD: 010110bkns
API_BASE_URL: https://bakong-notification.nbc.gov.kh
HOSTING_BASE_URL: https://bakong-notification.nbc.gov.kh
CORS_ORIGIN: https://bakong-notification.nbc.gov.kh,http://10.20.6.58
TYPEORM_SYNCHRONIZE: false     # ← Important: No auto-sync
```

**Frontend (frontend service):**
- Uses nginx to proxy `/api` to `backend:8080`
- Serves static files from `/usr/share/nginx/html`

## Port Mapping

| Service | Container Port | Host Port | Access |
|---------|---------------|-----------|--------|
| Database | 5432 | 5433 | `localhost:5433` |
| Backend API | 8080 | 8080 | `localhost:8080` or `10.20.6.58:8080` |
| Frontend | 80 | 80 | `http://10.20.6.58` or `http://bakong-notification.nbc.gov.kh` |
| Frontend | 443 | 443 | `https://bakong-notification.nbc.gov.kh` |

## Network Communication

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│  Frontend   │────────▶│   Backend   │────────▶│  Database   │
│  (nginx)    │  /api   │  (Node.js)  │  SQL    │ (PostgreSQL)│
│  Port 80/443│         │  Port 8080  │         │  Port 5432  │
└─────────────┘         └─────────────┘         └─────────────┘
     │                         │                         │
     │                         │                         │
     └─────────────────────────┴─────────────────────────┘
                    bakong-network (Docker bridge)
```

**Key Points:**
- Services communicate via Docker service names (`db`, `backend`)
- Internal ports are used (5432, 8080)
- Host ports are for external access (5433, 8080, 80, 443)

## Migration Flow

### On First Deployment (New Database)

1. Database starts → runs `init-db.sql` automatically
2. Schema created ✅
3. Migration not needed (already done)

### On Subsequent Deployments (Existing Database)

1. **Before starting services:**
   ```bash
   bash RUN_MIGRATION_ON_DEPLOY.sh
   ```
   - Checks database is running
   - Runs `unified-migration.sql`
   - Adds new tables/columns if needed (idempotent)

2. **Then start services:**
   ```bash
   docker-compose -f docker-compose.production.yml up -d
   ```

### Why Migration Runs BEFORE Services?

- Backend expects certain tables/columns to exist
- If schema is outdated, backend will crash
- Migration updates schema first, then backend starts safely

## Complete Deployment Script

```bash
#!/bin/bash
# Complete deployment flow

cd ~/bakong-notification-services

# Step 1: Pull latest code
echo "📥 Pulling latest code..."
git pull origin master

# Step 2: Run migration (updates schema)
echo "🔄 Running database migration..."
bash RUN_MIGRATION_ON_DEPLOY.sh

# Step 3: Start/restart services
echo "🚀 Starting services..."
docker-compose -f docker-compose.production.yml up -d --build

# Step 4: Wait for services
echo "⏳ Waiting for services to be ready..."
sleep 10

# Step 5: Verify
echo "✅ Verifying services..."
docker ps | grep bakong-notification-services
curl -s http://10.20.6.58/api/v1/health | head -3

echo "✅ Deployment complete!"
```

## Troubleshooting Startup Issues

### Database won't start
```bash
# Check logs
docker logs bakong-notification-services-db

# Check if port is in use
netstat -tuln | grep 5433

# Check volume
docker volume ls | grep postgres_data_prod
```

### Backend can't connect to database
```bash
# Check backend logs
docker logs bakong-notification-services-api

# Test database connection from backend container
docker exec -it bakong-notification-services-api ping db

# Verify database is healthy
docker ps | grep bakong-notification-services-db
```

### Frontend shows 502 Bad Gateway
```bash
# Check frontend logs
docker logs bakong-notification-services-frontend

# Check if backend is running
docker ps | grep bakong-notification-services-api

# Test backend from frontend container
docker exec -it bakong-notification-services-frontend ping backend
docker exec -it bakong-notification-services-frontend curl http://backend:8080/api/v1/health
```

## Summary

**Startup Order:**
1. Database (db) - First, with healthcheck
2. Backend (backend) - After database is healthy
3. Frontend (frontend) - After backend starts

**Migration:**
- Run BEFORE starting services
- Updates schema safely (idempotent)
- Use `RUN_MIGRATION_ON_DEPLOY.sh`

**Key Environment Variables:**
- `POSTGRES_HOST=db` (Docker service name, not IP)
- `TYPEORM_SYNCHRONIZE=false` (No auto-sync, use migrations)

