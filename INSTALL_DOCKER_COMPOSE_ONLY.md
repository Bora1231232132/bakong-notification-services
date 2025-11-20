# 🔧 Install Docker Compose Only (Don't Touch SIT)

## Current Status
- ✅ Docker is installed and running
- ❌ docker-compose is missing
- ⚠️ **DO NOT touch SIT** - QA is testing there

## Install Docker Compose

Run this on your server:

```bash
# Install docker-compose package
sudo apt install docker-compose -y

# Verify installation
docker-compose --version
```

## Alternative: Download Docker Compose Binary

If the package doesn't work:

```bash
# Download latest docker-compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make it executable
sudo chmod +x /usr/local/bin/docker-compose

# Verify
docker-compose --version
```

## After Installation - Start Production Only

```bash
cd ~/bakong-notification-services

# Start ONLY Production (NOT SIT)
docker-compose -f docker-compose.production.yml up -d

# Verify only production containers are running
docker ps
```

## ⚠️ Important: Don't Touch SIT

- ❌ Do NOT run: `docker-compose -f docker-compose.sit.yml`
- ❌ Do NOT stop/restart SIT containers
- ✅ Only work with production: `docker-compose -f docker-compose.production.yml`

