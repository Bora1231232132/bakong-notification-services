# 🔧 Quick Fix for Connection Refused

## Your Backend is Running! ✅

From the logs, I can see:
- ✅ Backend started successfully
- ✅ Firebase initialized (3 apps)
- ✅ All containers created

## Try These URLs:

### 1. Test Backend API Directly (Port 8080)
```
http://10.20.6.58:8080/api/v1/health
```

### 2. Access Frontend (Port 80)
```
http://10.20.6.58
```

### 3. Use Domain Name (if configured)
```
https://bakong-notification.nbc.gov.kh
```

---

## Quick Diagnostic (Run on Server)

```bash
# 1. Check all containers are running
docker-compose -f docker-compose.production.yml ps

# 2. Test backend from server
curl http://localhost:8080/api/v1/health

# 3. Test frontend from server
curl http://localhost

# 4. Check frontend logs
docker-compose -f docker-compose.production.yml logs frontend
```

---

## Most Likely Issue

You're accessing `10.20.6.58` without specifying a port. Try:
- `http://10.20.6.58:8080` for backend API
- `http://10.20.6.58` for frontend (if frontend is running on port 80)

