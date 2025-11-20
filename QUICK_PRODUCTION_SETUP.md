# 🚀 Quick Production Setup Guide

## Current Situation

- ✅ **Master branch created** and pushed to GitHub
- ❌ **SIT/Production containers don't exist locally** (only `db-dev` exists)
- ❌ **Project not on server yet**

## Two Options:

### Option 1: Copy Data on Server (Recommended)

The copy script should run **on the server** where both SIT and Production containers exist.

### Option 2: Copy from Local Dev (For Testing)

If you want to test locally first, we can modify the script to copy from your local `db-dev`.

---

## 📋 Step-by-Step: Deploy to Server First

### Step 1: Clone Project on Server

SSH into your production server and clone:

```bash
# SSH to server
ssh user@your-production-server

# Clone the project
cd ~
git clone https://github.com/stheany/bakong-notification-services.git
cd bakong-notification-services

# Checkout master branch
git checkout master
```

### Step 2: Start SIT Environment on Server

```bash
# Start SIT containers
docker compose -f docker-compose.sit.yml up -d

# Verify SIT is running
docker ps | grep bakong-notification-services-db-sit
```

### Step 3: Start Production Environment on Server

```bash
# Start Production containers
docker compose -f docker-compose.production.yml up -d

# Verify Production is running
docker ps | grep bakong-notification-services-db-prod
```

### Step 4: Copy SIT Data to Production (On Server)

```bash
cd apps/backend
bash scripts/copy-sit-data-to-production.sh
```

---

## 🔄 Alternative: Copy from Local Dev (For Testing)

If you want to test the copy process locally first, I can create a script that copies from your local `db-dev` to a test production container.

Would you like me to:
1. **Create a local test script** (copy from dev to a test prod container)?
2. **Help you set up the server** (SSH commands, etc.)?

---

## 📊 What You Need on Server

1. **Docker & Docker Compose** installed
2. **Git** installed
3. **Both docker-compose files:**
   - `docker-compose.sit.yml` (for SIT environment)
   - `docker-compose.production.yml` (for Production environment)
4. **Network access** to pull images

---

## 🎯 Recommended Flow

1. **Deploy to server first** (clone project, start containers)
2. **Then copy SIT data** (run the copy script on server)
3. **Deploy code** (run deploy-to-production.sh)

Tell me which option you prefer!

