# Backend Rebuild Commands

Use these commands when you need to rebuild the backend after making authentication or code changes.

## Quick Rebuild (On Server)

```bash
# Navigate to project directory
cd ~/bakong-notification-services

# Pull latest code
git pull origin develop

# Stop backend container
docker compose -f docker-compose.sit.yml stop backend

# Remove old backend image (optional but recommended)
docker rmi bakong-notification-services-backend 2>/dev/null || true

# Rebuild backend with NO cache (ensures latest code is used)
docker compose -f docker-compose.sit.yml build --no-cache backend

# Start backend container
docker compose -f docker-compose.sit.yml up -d backend

# Check backend logs to verify it's working
docker compose -f docker-compose.sit.yml logs -f backend
```

## Full Service Rebuild (Backend + Frontend)

```bash
# Navigate to project directory
cd ~/bakong-notification-services

# Pull latest code
git pull origin develop

# Stop all containers
docker compose -f docker-compose.sit.yml down

# Remove old images (optional)
docker rmi bakong-notification-services-backend 2>/dev/null || true
docker rmi bakong-notification-services-frontend 2>/dev/null || true

# Rebuild both services with NO cache
docker compose -f docker-compose.sit.yml build --no-cache backend frontend

# Start all services
docker compose -f docker-compose.sit.yml up -d

# Check status
docker compose -f docker-compose.sit.yml ps

# View logs
docker compose -f docker-compose.sit.yml logs -f
```

## Using the Deployment Script

Alternatively, use the automated deployment script:

```bash
cd ~/bakong-notification-services
bash deploy-on-server.sh
```

This script will:
- Pull latest code
- Stop containers
- Rebuild backend
- Start all services
- Show status and logs

## Verify API Key Authentication is Working

After rebuilding, test the API:

```bash
# Test with API key (should work)
curl --location 'http://10.20.6.57/api/v1/notification/send' \
--header 'Content-Type: application/json' \
--header 'x-api-key: BAKONG' \
--data '{"language": "en"}'
```

**Expected:** Should return 200 OK (not 401)

**Check logs for success messages:**
```bash
docker compose -f docker-compose.sit.yml logs backend | grep -i "api key\|JwtAuthGuard\|RolesGuard"
```

You should see:
- `✅ JwtAuthGuard: Valid API key provided, skipping JWT validation`
- `✅ RolesGuard: Valid API key provided, skipping role check`

## Troubleshooting

### If still getting 401 errors:

1. **Check if code was pulled:**
   ```bash
   git log --oneline -5
   ```

2. **Verify API key matches:**
   ```bash
   # Check what API key the server expects
   docker compose -f docker-compose.sit.yml logs backend | grep "Expected:"
   ```
   
   Default is `BAKONG` if `API_MOBILE_KEY` environment variable is not set.

3. **Check backend is running latest code:**
   ```bash
   # Check container creation time
   docker inspect bakong-notification-services-api-sit | grep Created
   ```

4. **Force complete rebuild:**
   ```bash
   docker compose -f docker-compose.sit.yml down
   docker system prune -f
   docker compose -f docker-compose.sit.yml build --no-cache backend
   docker compose -f docker-compose.sit.yml up -d
   ```

## Important Notes

- **Always use `--no-cache`** when rebuilding after code changes to ensure Docker doesn't use cached layers
- **Check logs** after rebuilding to verify the changes are working
- **Test the API** after rebuilding to confirm authentication is working
- The API key defaults to `BAKONG` if not set in environment variables

