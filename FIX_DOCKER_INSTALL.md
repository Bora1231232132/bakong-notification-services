# 🔧 Fix Docker Installation - Step by Step

## Current Error
- `docker-compose-plugin` package not found
- Docker service not found

## Solution: Install Docker Properly

### Step 1: Install docker.io (Basic Package)

```bash
sudo apt update
sudo apt install docker.io -y
```

### Step 2: Install Docker Compose (Standalone)

```bash
# Install standalone docker-compose
sudo apt install docker-compose -y

# OR download directly if package not available:
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### Step 3: Start Docker Service

```bash
sudo systemctl start docker
sudo systemctl enable docker
sudo systemctl status docker
```

### Step 4: Add User to Docker Group

```bash
sudo usermod -aG docker $USER
newgrp docker
```

### Step 5: Verify Installation

```bash
docker --version
docker-compose --version
```

## Alternative: Official Docker Installation

If the above doesn't work, use official Docker repository:

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

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify
docker --version
docker compose version
```

## After Installation

Once Docker is installed, continue with:

```bash
cd ~/bakong-notification-services

# Start containers
docker compose -f docker-compose.sit.yml up -d
docker compose -f docker-compose.production.yml up -d

# Or if docker-compose (with hyphen) works:
docker-compose -f docker-compose.sit.yml up -d
docker-compose -f docker-compose.production.yml up -d
```

