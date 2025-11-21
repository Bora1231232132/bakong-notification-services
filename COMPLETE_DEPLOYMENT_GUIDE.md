# 🚀 Complete Deployment Guide - Step by Step

## ⚠️ IMPORTANT: Copy Firebase Files FIRST!

**You MUST copy Firebase files to the server BEFORE deploying**, otherwise Docker will fail because it can't find the files to mount.

---

## 📤 Step 1: Copy Firebase Files to Server (From Your Local Machine)

**Run these commands on YOUR LOCAL MACHINE (not on server):**

### Copy SIT Firebase files to SIT server:
```bash
scp -o PreferredAuthentications=password -o PubkeyAuthentication=no bakong-sit-firebase-service-account.json dev@10.20.6.57:~/bakong-notification-services/
scp -o PreferredAuthentications=password -o PubkeyAuthentication=no bakong-junior-sit-firebase-service-account.json dev@10.20.6.57:~/bakong-notification-services/
scp -o PreferredAuthentications=password -o PubkeyAuthentication=no bakong-tourists-sit-firebase-service-account.json dev@10.20.6.57:~/bakong-notification-services/
```

### Copy Production Firebase files to Production server:
```bash
scp -o PreferredAuthentications=password -o PubkeyAuthentication=no bakong-uat-firebase-service-account.json dev@10.20.6.58:~/bakong-notification-services/
scp -o PreferredAuthentications=password -o PubkeyAuthentication=no bakong-junior-uat-firebase-service-account.json dev@10.20.6.58:~/bakong-notification-services/
scp -o PreferredAuthentications=password -o PubkeyAuthentication=no bakong-tourist-uat-firebase-service-account.json dev@10.20.6.58:~/bakong-notification-services/
```

---

## 🚀 Step 2: Deploy to SIT Server

### 2.1: SSH to SIT Server

```bash
ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no dev@10.20.6.57
```

**Or copy this single line:**
```
ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no dev@10.20.6.57
```

### 2.2: On the Server - Run These Commands:

```bash
cd ~/bakong-notification-services

# Verify Firebase files exist (IMPORTANT!)
ls -la bakong-*-firebase-service-account.json
# Should show 3 files: bakong-sit, bakong-junior-sit, bakong-tourists-sit

# 1. Fix git and pull latest code
git fetch origin
git reset --hard origin/develop

# 2. Stop containers
docker-compose -f docker-compose.sit.yml down

# 3. Remove old backend image
docker rmi bakong-notification-services-backend 2>/dev/null || true

# 4. Rebuild backend
docker-compose -f docker-compose.sit.yml build --no-cache backend

# 5. Start services
docker-compose -f docker-compose.sit.yml up -d

# 6. Check backend logs (should see Firebase initialization)
docker-compose -f docker-compose.sit.yml logs -f backend
```

**Look for these in the logs:**
```
✅ Successfully initialized 3 Firebase app(s) for multi-platform support.
✅ Initialized apps: bakong-sit, bakong-junior-sit, bakong-tourist-sit
```

---

## 🚀 Step 3: Deploy to Production Server

### 3.1: SSH to Production Server
```bash
ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no dev@10.20.6.58
```

### 3.2: On the Server - Run These Commands:

```bash
cd ~/bakong-notification-services

# Verify Firebase files exist (IMPORTANT!)
ls -la bakong-*-firebase-service-account.json
# Should show 3 files: bakong-uat, bakong-junior-uat, bakong-tourist-uat

# 1. Fix git and pull latest code
git fetch origin
git reset --hard origin/main  # or origin/master

# 2. Stop containers
docker-compose -f docker-compose.production.yml down

# 3. Remove old backend image
docker rmi bakong-notification-services-backend 2>/dev/null || true

# 4. Rebuild backend
docker-compose -f docker-compose.production.yml build --no-cache backend

# 5. Start services
docker-compose -f docker-compose.production.yml up -d

# 6. Check backend logs
docker-compose -f docker-compose.production.yml logs -f backend
```

**Look for these in the logs:**
```
✅ Successfully initialized 3 Firebase app(s) for multi-platform support.
✅ Initialized apps: bakong-uat, bakong-junior-uat, bakong-tourist-uat
```

---

## ✅ Step 4: Verify Deployment

### Check Firebase Apps Initialized:
```bash
# SIT server
docker logs bakong-notification-services-api-sit | grep FirebaseManager

# Production server
docker logs bakong-notification-services-api | grep FirebaseManager
```

### Test API Health:
```bash
# SIT server
curl http://10.20.6.57:4002/api/v1/health

# Production server
curl https://bakong-notification.nbc.gov.kh/api/v1/health
```

---

## 🔄 Quick Reference: All-in-One Commands

### For SIT Server (run on server after SSH):
```bash
cd ~/bakong-notification-services && \
ls -la bakong-*-firebase-service-account.json && \
git fetch origin && \
git reset --hard origin/develop && \
docker-compose -f docker-compose.sit.yml down && \
docker rmi bakong-notification-services-backend 2>/dev/null || true && \
docker-compose -f docker-compose.sit.yml build --no-cache backend && \
docker-compose -f docker-compose.sit.yml up -d && \
docker-compose -f docker-compose.sit.yml logs -f backend
```

### For Production Server (run on server after SSH):
```bash
cd ~/bakong-notification-services && \
ls -la bakong-*-firebase-service-account.json && \
git fetch origin && \
git reset --hard origin/main && \
docker-compose -f docker-compose.production.yml down && \
docker rmi bakong-notification-services-backend 2>/dev/null || true && \
docker-compose -f docker-compose.production.yml build --no-cache backend && \
docker-compose -f docker-compose.production.yml up -d && \
docker-compose -f docker-compose.production.yml logs -f backend
```

---

## ⚠️ Common Issues

### Issue: "No such file or directory" when starting Docker
**Solution:** Firebase files are missing. Go back to Step 1 and copy files to server.

### Issue: "Firebase apps failed to initialize"
**Solution:** Check that Firebase files exist and have correct permissions:
```bash
ls -la bakong-*-firebase-service-account.json
chmod 600 bakong-*-firebase-service-account.json
```

### Issue: Git still shows divergent branches
**Solution:** Make sure you run `git fetch origin` before `git reset --hard origin/develop`

