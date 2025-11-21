# ✅ Next Steps After Successful Build

## Current Status
✅ Docker build completed successfully!
✅ Backend image tagged: `bakong-notification-services_backend:latest`

---

## Step 1: Verify Firebase Files Exist

**Before starting containers, make sure Firebase files are on the server:**

```bash
ls -la bakong-*-firebase-service-account.json
```

**You should see 3 files:**
- `bakong-uat-firebase-service-account.json`
- `bakong-junior-uat-firebase-service-account.json`
- `bakong-tourist-uat-firebase-service-account.json`

**If files are missing, copy them from your local machine:**
```bash
# Run these on YOUR LOCAL MACHINE (not on server):
scp -o PreferredAuthentications=password -o PubkeyAuthentication=no bakong-uat-firebase-service-account.json dev@10.20.6.58:~/bakong-notification-services/
scp -o PreferredAuthentications=password -o PubkeyAuthentication=no bakong-junior-uat-firebase-service-account.json dev@10.20.6.58:~/bakong-notification-services/
scp -o PreferredAuthentications=password -o PubkeyAuthentication=no bakong-tourist-uat-firebase-service-account.json dev@10.20.6.58:~/bakong-notification-services/
```

---

## Step 2: Start the Containers

**On the production server, run:**

```bash
docker-compose -f docker-compose.production.yml up -d
```

This will start:
- Database container
- Backend API container
- Frontend container

---

## Step 3: Check Backend Logs

**Verify Firebase initialization:**

```bash
docker-compose -f docker-compose.production.yml logs -f backend
```

**Look for these success messages:**
```
✅ Successfully initialized 3 Firebase app(s) for multi-platform support.
✅ Initialized apps: bakong-uat, bakong-junior-uat, bakong-tourist-uat
```

**Also check for NestJS startup:**
```
[Nest] Application is running on: http://[::1]:8080
```

---

## Step 4: Verify All Services Are Running

```bash
docker-compose -f docker-compose.production.yml ps
```

All services should show "Up" status.

---

## Step 5: Test the API

```bash
# Health check
curl http://localhost:8080/api/v1/health

# Or from your local machine:
curl https://bakong-notification.nbc.gov.kh/api/v1/health
```

---

## ⚠️ About the Warnings You Saw

The warnings in the build output are **normal** and **not errors**:

1. **"DEPRECATED: The legacy builder"** - Just a notice, build still works
2. **npm deprecated warnings** - Package maintainers updating their packages
3. **npm audit vulnerabilities** - Common in Node.js projects, not critical for runtime

**The build was successful!** ✅

---

## Quick Command Summary

```bash
# 1. Verify Firebase files
ls -la bakong-*-firebase-service-account.json

# 2. Start services
docker-compose -f docker-compose.production.yml up -d

# 3. Check logs
docker-compose -f docker-compose.production.yml logs -f backend

# 4. Check status
docker-compose -f docker-compose.production.yml ps
```

