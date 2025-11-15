# Test Commands Reference

## 🏠 Local Testing (Your Windows Machine)

### Backend Health Check
```powershell
# PowerShell
Invoke-WebRequest -Uri "http://localhost:4004/api/v1/health"

# Or simpler (shows JSON response)
Invoke-RestMethod -Uri "http://localhost:4004/api/v1/health"
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "service": "Bakong Notification Service API",
  "version": "1.0.0"
}
```

### Other Local Endpoints
```powershell
# Health check (simple)
Invoke-RestMethod -Uri "http://localhost:4004/api/v1/health"

# Management healthcheck (with database check)
Invoke-RestMethod -Uri "http://localhost:4004/api/v1/management/healthcheck"

# Frontend
Start-Process "http://localhost:3001"
```

### Local URLs
- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:4004
- **Database**: localhost:5437

---

## 🌐 Server Testing (SIT Server: 10.20.6.57)

### From Your Windows Machine (Testing Server Remotely)

```powershell
# Backend Health Check
Invoke-WebRequest -Uri "http://10.20.6.57:4002/api/v1/health"

# Or with JSON response
Invoke-RestMethod -Uri "http://10.20.6.57:4002/api/v1/health"
```

### From the Server Itself (SSH into server)

```bash
# Backend Health Check
curl http://localhost:4002/api/v1/health

# Or from outside the container
curl http://10.20.6.57:4002/api/v1/health
```

### Server URLs
- **Frontend**: http://10.20.6.57:8090
- **Backend API**: http://10.20.6.57:4002
- **Database**: 10.20.6.57:5434 (if exposed)

---

## 🔍 Quick Test Checklist

### Local Testing (Before Deployment)
```powershell
# 1. Check Docker is running
docker ps

# 2. Start services
docker compose -f docker-compose.yml up -d

# 3. Wait 30 seconds, then test backend
Invoke-RestMethod -Uri "http://localhost:4004/api/v1/health"

# 4. Test frontend in browser
# Open: http://localhost:3001
```

### Server Testing (After Deployment)
```powershell
# 1. Test backend from your Windows machine
Invoke-RestMethod -Uri "http://10.20.6.57:4002/api/v1/health"

# 2. Test frontend in browser
# Open: http://10.20.6.57:8090

# 3. Check browser console for errors
# Press F12 in browser, check Console tab
```

---

## 🐛 Troubleshooting

### "Cannot connect" or "Connection refused"
- **Local**: Make sure `docker compose -f docker-compose.yml up -d` is running
- **Server**: Make sure containers are running: `docker compose -f docker-compose.sit.yml ps`

### "404 Not Found"
- Check the URL path is correct: `/api/v1/health` (not `/health`)
- Verify backend is running: `docker compose logs backend`

### "500 Internal Server Error"
- Check backend logs: `docker compose logs backend`
- Check database connection
- Verify environment variables are set correctly

### Network Errors in Browser
- Check CORS_ORIGIN matches frontend URL
- Verify backend is accessible: test with `Invoke-RestMethod` first
- Check browser console (F12) for specific error messages

---

## 📝 Port Reference

| Environment | Frontend Port | Backend Port | Database Port |
|------------|---------------|--------------|---------------|
| **Local**   | 3001          | 4004         | 5437          |
| **SIT**     | 8090          | 4002         | 5434          |
| **Production** | 80/443     | 8080         | (internal)   |

---

## ✅ Success Indicators

### Backend is Working:
- ✅ `Invoke-RestMethod` returns JSON with `"status": "ok"`
- ✅ No errors in `docker compose logs backend`
- ✅ Container status shows "Up" (not "Restarting")

### Frontend is Working:
- ✅ Browser shows the login page (not blank)
- ✅ No network errors in browser console (F12)
- ✅ Can see API requests in Network tab

### Full Stack is Working:
- ✅ Can log in successfully
- ✅ API calls return data (not errors)
- ✅ No CORS errors in browser console

