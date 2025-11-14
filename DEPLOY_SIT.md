# 🚀 SIT Deployment Guide

## 📋 Complete Deployment Steps

### Step 1: Connect to SIT Server

**Run in PowerShell or Git Bash:**

```powershell
# Connect with password authentication
# Username: dev, Password: dev
ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no dev@10.20.6.57
```

**OR using hostname:**

```powershell
ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no dev@sit-bk-notifi-service
```

**Enter password when prompted.**

---

### Step 2: Check Current Version & Pull Latest Code

**First, check if your server code is outdated:**

```bash
cd ~/bakong-notification-services

# Check current commit
git log --oneline -1

# Check if there's a dev.config.js file (this shouldn't exist and might cause errors)
ls -la | grep dev.config

# If dev.config.js exists, remove it (it's not in the repository)
rm -f dev.config.js
```

**Latest commit should be:** `ee5edb9 - Add build args for VITE environment variables in Docker builds`

**If your commit is different or older, you need to pull the latest code.**

---

### Step 2a: Pull Latest Code (GitHub Authentication)

**⚠️ GitHub no longer supports password authentication. You need a Personal Access Token (PAT).**

#### Option A: Use Personal Access Token (Recommended)

1. **Create a PAT on GitHub:**
   - Go to: https://github.com/settings/tokens
   - Click "Generate new token" → "Generate new token (classic)"
   - Name: "SIT Server Deploy"
   - Select scopes: `repo` (full control of private repositories)
   - Click "Generate token"
   - **Copy the token immediately** (you won't see it again!)

2. **On the server, use the token:**

   ```bash
   cd ~/bakong-notification-services

   # Update remote URL to use token
   git remote set-url origin https://YOUR_TOKEN@github.com/stheany/bakong-notification-services.git

   # Or use token when pulling (replace YOUR_TOKEN with your actual token)
   git pull https://YOUR_TOKEN@github.com/stheany/bakong-notification-services.git develop
   ```

#### Option B: Use SSH Keys (More Secure)

1. **Generate SSH key on server:**

   ```bash
   ssh-keygen -t ed25519 -C "sit-server@bakong"
   # Press Enter to accept default location
   # Press Enter for no passphrase (or set one)
   ```

2. **Copy public key:**

   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```

3. **Add to GitHub:**
   - Go to: https://github.com/settings/keys
   - Click "New SSH key"
   - Paste the public key
   - Save

4. **Update remote URL:**
   ```bash
   cd ~/bakong-notification-services
   git remote set-url origin git@github.com:stheany/bakong-notification-services.git
   git pull origin develop
   ```

#### Option C: Manual File Transfer (If Git doesn't work)

If you can't set up authentication, you can manually transfer files:

**On your Windows machine:**

```powershell
# Create a zip of the project (excluding node_modules, .git, etc.)
# Or use SCP to copy specific files
```

**On the server:**

```bash
# Extract and replace files
# Then rebuild Docker images
```

---

### Step 3: Deploy the SIT Environment

**Once you have the latest code on the server:**

```bash
# Navigate to project directory
cd ~/bakong-notification-services

# Stop existing containers
docker compose -f docker-compose.sit.yml down

# Clear Docker build cache (optional, but recommended for fresh build)
docker builder prune -f

# Build and start containers
docker compose -f docker-compose.sit.yml up -d --build

# Check status
docker compose -f docker-compose.sit.yml ps

# View logs
docker compose -f docker-compose.sit.yml logs -f
```

---

### Step 4: Verify Deployment

After running the deployment command, check the status of your Docker containers:

```bash
# View running containers for the SIT environment
docker compose -f docker-compose.sit.yml ps

# View logs for all services in the SIT environment (press Ctrl+C to exit)
docker compose -f docker-compose.sit.yml logs -f

# View logs for a specific service (e.g., backend)
docker compose -f docker-compose.sit.yml logs backend
```

---

### Step 5: Access SIT URLs

Once the containers are running, you can access your application:

| Service                | URL                             | Description                                        |
| ---------------------- | ------------------------------- | -------------------------------------------------- |
| **Frontend Dashboard** | `http://10.20.6.57:8090`        | Main application UI                                |
| **Backend API**        | `http://10.20.6.57:4002`        | API endpoint                                       |
| **Health Check**       | `http://10.20.6.57:4002/health` | Service health check                               |
| **Database**           | `10.20.6.57:5434`               | PostgreSQL (internal access from other containers) |

---

## 🐳 Install Docker & Docker Compose (If Not Installed)

**If you get "docker-compose: command not found", run these commands on Ubuntu server:**

```bash
# 1. Check if Docker is installed
docker --version

# 2. If Docker is NOT installed, install it:
sudo apt update
sudo apt install -y docker.io docker-compose

# 3. Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# 4. Add your user to docker group (to run without sudo)
sudo usermod -aG docker $USER

# 5. Log out and log back in for group changes to take effect
exit
# Then SSH again: ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no dev@10.20.6.57

# 6. Verify installation
docker --version
docker-compose --version

# 7. Test Docker (should work without sudo after step 4)
docker ps
```

**Alternative: If Docker is installed but docker-compose is not, try:**

```bash
# Newer Docker versions use "docker compose" (without hyphen)
docker compose -f docker-compose.sit.yml up -d --build
```

---

## 🔧 Fix Build Errors

**If you get frontend build error about `/app/dev.config.js`:**

The Dockerfile has been fixed. Make sure you have the latest code:

```bash
# On your Windows machine, commit and push the fixes
git add apps/frontend/Dockerfile
git commit -m "Fix frontend Dockerfile build process"
git push origin main

# Then on the server, pull the latest code
cd ~/bakong-notification-services
git pull origin main

# Clear Docker build cache and rebuild
docker compose -f docker-compose.sit.yml down
docker builder prune -f
docker compose -f docker-compose.sit.yml up -d --build
```

---

## 🛠️ Troubleshooting Commands

```bash
# Restart services
docker-compose -f docker-compose.sit.yml restart

# Stop services
docker-compose -f docker-compose.sit.yml down

# View logs
docker-compose -f docker-compose.sit.yml logs -f

# Check container status
docker ps

# Check if ports are in use
netstat -tulpn | grep -E '4002|8090|5434'
```

---

## 📝 Quick Reference

**Windows (PowerShell/Git Bash):**

```powershell
# Username: dev, Password: dev
ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no dev@10.20.6.57
```

**Ubuntu Server (after SSH):**

```bash
cd ~/bakong-notification-services

# If using PAT (replace YOUR_TOKEN):
git pull https://YOUR_TOKEN@github.com/stheany/bakong-notification-services.git develop

# If using SSH:
git pull origin develop

# Deploy
docker compose -f docker-compose.sit.yml up -d --build
```

---

## ⚠️ Important Notes

1. **GitHub Authentication:** GitHub no longer supports password authentication. You must use:
   - Personal Access Token (PAT) - Quick setup
   - SSH Keys - More secure, recommended for production

2. **Project path:** Confirm the actual path on server (might be `/opt/`, `/home/dev/`, or `/var/www/`)

3. **Firewall:** Ensure ports `4002`, `8090`, and `5434` are open on your Ubuntu server's firewall (e.g., `ufw allow 4002`, `ufw allow 8090`, `ufw allow 5434`)

4. **Docker:** Make sure Docker and Docker Compose are installed on Ubuntu server

5. **Permissions:** You may need to use `sudo` for docker commands until you add user to docker group
