# 🐳 Install Docker on Server - Ubuntu/Debian

## Step 1: Install Docker

**Method 1: Install docker.io (Ubuntu repository)**

```bash
# Update package index
sudo apt update

# Install Docker
sudo apt install docker.io -y

# Install Docker Compose (standalone version)
sudo apt install docker-compose -y
```

**Method 2: Official Docker Installation (Recommended)**

If Method 1 doesn't work, use the official Docker installation:

```bash
# Remove old versions
sudo apt remove docker docker-engine docker.io containerd runc 2>/dev/null || true

# Install prerequisites
sudo apt update
sudo apt install -y ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine and Docker Compose
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

## Step 2: Start Docker Service

```bash
# Start Docker service
sudo systemctl start docker

# Enable Docker to start on boot
sudo systemctl enable docker

# Verify Docker is running
sudo systemctl status docker
```

## Step 3: Add User to Docker Group (Optional but Recommended)

This allows you to run Docker without `sudo`:

```bash
# Add current user to docker group
sudo usermod -aG docker $USER

# Apply the changes (you may need to logout/login)
newgrp docker

# Verify you can run docker without sudo
docker --version
docker compose version
```

## Step 4: Verify Installation

```bash
# Check Docker version
docker --version

# Check Docker Compose version
docker compose version

# Test Docker (run a test container)
docker run hello-world
```

## Step 5: Continue with Setup

After Docker is installed, continue with the server setup:

```bash
# Navigate to project
cd ~/bakong-notification-services

# Start SIT environment
docker compose -f docker-compose.sit.yml up -d

# Start Production environment
docker compose -f docker-compose.production.yml up -d

# Verify containers are running
docker ps
```

## Troubleshooting

### If `docker compose` doesn't work:

Try:
```bash
# Use docker-compose (with hyphen) instead
docker-compose -f docker-compose.production.yml up -d
```

### If permission denied:

```bash
# Make sure user is in docker group
groups | grep docker

# If not, add user and logout/login
sudo usermod -aG docker $USER
# Then logout and login again
```

### If Docker service won't start:

```bash
# Check Docker service status
sudo systemctl status docker

# View logs
sudo journalctl -u docker

# Restart Docker
sudo systemctl restart docker
```

## Quick Install Script

You can run this all at once:

```bash
sudo apt update && \
sudo apt install docker.io docker-compose-plugin -y && \
sudo systemctl start docker && \
sudo systemctl enable docker && \
sudo usermod -aG docker $USER && \
newgrp docker && \
docker --version && \
docker compose version
```

