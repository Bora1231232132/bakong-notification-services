# Pre-Deployment Checklist

Use this checklist before deploying to SIT or Production to avoid errors.

## ✅ Pre-Deployment Steps

### 1. Local Testing
```bash
# Run the local test script
chmod +x test-local.sh
./test-local.sh
```

**Expected Results:**
- ✅ All Docker images build successfully
- ✅ Database starts and is healthy
- ✅ Backend starts and responds to health checks
- ✅ Frontend is accessible
- ✅ API endpoints return 200 OK

### 2. Code Quality Checks
```bash
# Format code
npm run format

# Check formatting
npm run format:check

# Type check (if available)
npm run type-check
```

### 3. Verify Configuration Files

#### `docker-compose.sit.yml` - Check:
- [ ] `VITE_API_BASE_URL` matches server IP/domain
- [ ] `CORS_ORIGIN` matches frontend URL
- [ ] `API_BASE_URL` matches backend URL
- [ ] Ports don't conflict with other services
- [ ] Database credentials are correct

#### `docker-compose.production.yml` - Check:
- [ ] All URLs use HTTPS (not HTTP)
- [ ] Production database credentials
- [ ] Correct server IPs/domains
- [ ] SSL certificates configured (if needed)

### 4. Environment Variables

**Backend Environment Variables:**
- [ ] `POSTGRES_HOST` - Database hostname
- [ ] `POSTGRES_DB` - Database name
- [ ] `POSTGRES_USER` - Database user
- [ ] `POSTGRES_PASSWORD` - Database password
- [ ] `API_PORT` - Backend port (usually 8080)
- [ ] `API_BASE_URL` - Full backend URL
- [ ] `CORS_ORIGIN` - Frontend URL (for CORS)
- [ ] `NODE_ENV` - Environment (staging/production)

**Frontend Build Args:**
- [ ] `VITE_API_BASE_URL` - Backend API URL
- [ ] `VITE_FRONTEND_PORT` - Frontend port (usually 3000)
- [ ] `VITE_BASE_URL` - Base path (usually `/`)

### 5. Common Issues to Check

#### Network Errors (net::ERR...)
**Symptoms:** All API requests fail in browser console

**Causes:**
1. Backend not running
   - Check: `docker compose logs backend`
   - Fix: Ensure backend container is running and healthy

2. Wrong API URL in frontend
   - Check: Built frontend has correct `VITE_API_BASE_URL`
   - Fix: Rebuild frontend with correct build args

3. CORS errors
   - Check: Backend `CORS_ORIGIN` matches frontend URL
   - Fix: Update `CORS_ORIGIN` in docker-compose file

4. Port conflicts
   - Check: Ports are not already in use
   - Fix: Change ports in docker-compose file

#### Backend Container Restarting
**Symptoms:** Backend keeps restarting, logs show module errors

**Causes:**
1. Missing dependencies
   - Check: `docker compose logs backend` for module errors
   - Fix: Ensure Dockerfile installs all dependencies correctly

2. Database connection failed
   - Check: Database is healthy and accessible
   - Fix: Verify database credentials and network

#### Frontend Shows Blank Page
**Symptoms:** Frontend loads but shows nothing

**Causes:**
1. API URL not set correctly
   - Check: Browser console for network errors
   - Fix: Rebuild frontend with correct `VITE_API_BASE_URL`

2. JavaScript errors
   - Check: Browser console for errors
   - Fix: Check frontend build logs

## 🚀 Deployment Steps

### For SIT Server:

1. **SSH to Server**
   ```bash
   ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no dev@10.20.6.57
   ```

2. **Pull Latest Code**
   ```bash
   cd ~/bakong-notification-services
   git fetch origin
   git reset --hard origin/develop
   ```

3. **Stop Old Containers**
   ```bash
   docker compose -f docker-compose.sit.yml down
   ```

4. **Rebuild Images**
   ```bash
   docker compose -f docker-compose.sit.yml build --no-cache
   ```

5. **Start Services**
   ```bash
   docker compose -f docker-compose.sit.yml up -d
   ```

6. **Verify Deployment**
   ```bash
   # Check container status
   docker compose -f docker-compose.sit.yml ps
   
   # Check backend logs
   docker compose -f docker-compose.sit.yml logs -f backend
   
   # Test API
   curl http://10.20.6.57:4002/api/v1/health
   ```

7. **Test Frontend**
   - Open browser: `http://10.20.6.57:8090`
   - Check browser console for errors
   - Try logging in

## 🔍 Troubleshooting Commands

```bash
# View all logs
docker compose -f docker-compose.sit.yml logs

# View specific service logs
docker compose -f docker-compose.sit.yml logs -f backend
docker compose -f docker-compose.sit.yml logs -f frontend

# Check container status
docker compose -f docker-compose.sit.yml ps

# Restart a service
docker compose -f docker-compose.sit.yml restart backend

# Rebuild and restart
docker compose -f docker-compose.sit.yml up -d --build backend

# Remove everything and start fresh
docker compose -f docker-compose.sit.yml down -v
docker compose -f docker-compose.sit.yml build --no-cache
docker compose -f docker-compose.sit.yml up -d
```

## 📝 Notes

- Always test locally first using `test-local.sh`
- Check logs immediately after deployment
- Verify API endpoints respond before testing frontend
- Keep this checklist updated as you discover new issues

