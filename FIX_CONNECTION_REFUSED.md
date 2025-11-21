# 🔧 Fix Connection Refused Error

## Problem
Browser shows `ERR_CONNECTION_REFUSED` when accessing `10.20.6.58`

## Root Cause
The application is running inside Docker containers. You need to:
1. Access it via the correct port (usually 80 for frontend, 8080 for backend API)
2. Or use the domain name if configured
3. Check that frontend container is running

---

## Step 1: Check Container Status

**On the production server, run:**

```bash
docker-compose -f docker-compose.production.yml ps
```

**All containers should show "Up" status:**
- `bakong-notification-services-db` - Database
- `bakong-notification-services-api` - Backend API
- `bakong-notification-services-frontend` - Frontend/Nginx

---

## Step 2: Check Port Mappings

**Check what ports are exposed:**

```bash
docker-compose -f docker-compose.production.yml ps
# Look at the "Ports" column

# Or check the compose file:
cat docker-compose.production.yml | grep -A 5 "ports:"
```

**Common configurations:**
- Frontend: Port 80 (HTTP) or 443 (HTTPS)
- Backend API: Port 8080 (usually not exposed directly, accessed via frontend)

---

## Step 3: Try Different URLs

### Option 1: Access via Frontend (Port 80)
```
http://10.20.6.58
```

### Option 2: Access Backend API directly (if port 8080 is exposed)
```
http://10.20.6.58:8080/api/v1/health
```

### Option 3: Use Domain Name (if configured)
```
https://bakong-notification.nbc.gov.kh
```

---

## Step 4: Check Frontend Container Logs

**If frontend is not working:**

```bash
docker-compose -f docker-compose.production.yml logs frontend
```

**Look for errors like:**
- Nginx configuration errors
- Port binding issues
- SSL certificate problems

---

## Step 5: Check if Ports are Listening

**On the server, check what ports are listening:**

```bash
# Check if port 80 is listening
sudo netstat -tlnp | grep :80
# OR
sudo ss -tlnp | grep :80

# Check if port 8080 is listening
sudo netstat -tlnp | grep :8080
# OR
sudo ss -tlnp | grep :8080
```

---

## Step 6: Check Firewall

**If ports are not accessible, check firewall:**

```bash
# Check firewall status
sudo ufw status
# OR
sudo iptables -L -n

# If needed, allow ports
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 8080/tcp
```

---

## Quick Diagnostic Commands

```bash
# 1. Check all containers are running
docker-compose -f docker-compose.production.yml ps

# 2. Check frontend logs
docker-compose -f docker-compose.production.yml logs frontend

# 3. Check backend health (from server)
curl http://localhost:8080/api/v1/health

# 4. Check if frontend responds (from server)
curl http://localhost

# 5. Check port mappings
docker-compose -f docker-compose.production.yml config | grep -A 3 "ports:"
```

---

## Common Issues

### Issue 1: Frontend Container Not Running
**Solution:** Restart frontend
```bash
docker-compose -f docker-compose.production.yml restart frontend
```

### Issue 2: Wrong Port in Browser
**Solution:** Try `http://10.20.6.58` (port 80) instead of just the IP

### Issue 3: Firewall Blocking
**Solution:** Open ports in firewall (see Step 6)

### Issue 4: Nginx Not Configured
**Solution:** Check frontend logs and nginx configuration

---

## Expected Working URLs

Based on your setup, try these:

1. **Frontend (via Nginx):**
   ```
   http://10.20.6.58
   ```

2. **Backend API (direct):**
   ```
   http://10.20.6.58:8080/api/v1/health
   ```

3. **Domain (if configured):**
   ```
   https://bakong-notification.nbc.gov.kh
   ```

