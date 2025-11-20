# 🖥️ Server Setup Guide - First Time Deployment

## Current Situation

- ✅ Master branch created and pushed to GitHub
- ❌ Project not on server yet
- ❌ SIT/Production containers don't exist on server

## 📋 Step 1: Connect to Server

```bash
# SSH into your production server
ssh user@your-production-server-ip
```

## 📥 Step 2: Clone Project on Server

```bash
# Navigate to home directory
cd ~

# Clone the repository
git clone https://github.com/stheany/bakong-notification-services.git

# Navigate into project
cd bakong-notification-services

# Checkout master branch
git checkout master
```

## 🐳 Step 3: Install Docker (If Not Installed)

**If Docker is not installed**, follow `INSTALL_DOCKER_ON_SERVER.md` first.

Quick install:
```bash
# Install Docker
sudo apt update
sudo apt install docker.io docker-compose-plugin -y

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group (to run without sudo)
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker compose version
```

**If Docker is already installed**, verify it works:
```bash
docker --version
docker compose version
```

## 🚀 Step 4: Start SIT Environment (For Testing)

```bash
# Start SIT containers
docker compose -f docker-compose.sit.yml up -d

# Wait for database to be ready
sleep 10

# Verify SIT is running
docker ps | grep bakong-notification-services-db-sit

# Check logs
docker compose -f docker-compose.sit.yml logs db
```

## 🏭 Step 5: Start Production Environment

```bash
# Start Production containers
docker compose -f docker-compose.production.yml up -d

# Wait for database to be ready
sleep 10

# Verify Production is running
docker ps | grep bakong-notification-services-db

# Check logs
docker compose -f docker-compose.production.yml logs db
```

## 📊 Step 6: Copy SIT Data to Production (Optional)

**⚠️ Only do this if you want to test with SIT data first!**

```bash
cd apps/backend
bash scripts/copy-sit-data-to-production.sh
```

This will:
- ✅ Backup production automatically
- ✅ Copy all SIT data to production
- ✅ Verify the copy

## 🔄 Step 7: Run Migrations

```bash
# Run username migration
bash apps/backend/scripts/run-update-usernames.sh production

# Run bakongPlatform migration
bash apps/backend/scripts/run-bakong-platform-migration.sh production
```

## 🚀 Step 8: Deploy Code

```bash
# Run production deployment
bash deploy-to-production.sh
```

## ✅ Step 9: Verify Deployment

```bash
# Check container status
docker compose -f docker-compose.production.yml ps

# Check backend logs
docker compose -f docker-compose.production.yml logs -f backend

# Test health endpoint (adjust port if needed)
curl http://localhost:4001/api/v1/health
```

## 📝 Quick Reference

### Container Names:
- **SIT DB**: `bakong-notification-services-db-sit`
- **Production DB**: `bakong-notification-services-db`

### Ports:
- **SIT Backend**: `4002`
- **Production Backend**: `4001` (check docker-compose.production.yml)

### Database Names:
- **SIT**: `bakong_notification_services_sit`
- **Production**: `bakong_notification_services`

## 🆘 Troubleshooting

### If containers don't start:
```bash
# Check Docker logs
docker compose -f docker-compose.production.yml logs

# Check if ports are in use
netstat -tulpn | grep 4001
netstat -tulpn | grep 5433
```

### If database connection fails:
```bash
# Check database container
docker exec -it bakong-notification-services-db psql -U bkns -d bakong_notification_services

# Test connection
docker exec bakong-notification-services-db pg_isready -U bkns
```

## 📞 Next Steps

After setup:
1. ✅ Test login with production
2. ✅ Create a test notification
3. ✅ Verify bakongPlatform filtering works
4. ✅ Test image upload/display

