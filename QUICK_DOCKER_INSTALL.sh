#!/bin/bash
# Quick Docker Installation Script for Ubuntu
# Run: bash QUICK_DOCKER_INSTALL.sh

set -e

echo "🐳 Installing Docker on Ubuntu..."
echo ""

# Method 1: Try simple installation first
echo "📦 Method 1: Installing docker.io and docker-compose..."
if sudo apt update && sudo apt install -y docker.io docker-compose; then
    echo "✅ Docker installed successfully!"
    INSTALLED=true
else
    echo "⚠️  Method 1 failed, trying official Docker installation..."
    INSTALLED=false
fi

# Method 2: Official Docker installation if Method 1 failed
if [ "$INSTALLED" = false ]; then
    echo ""
    echo "📦 Method 2: Installing Docker from official repository..."
    
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
    
    echo "✅ Docker installed from official repository!"
fi

# Start Docker service
echo ""
echo "🚀 Starting Docker service..."
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group
echo ""
echo "👤 Adding user to docker group..."
sudo usermod -aG docker $USER

# Verify installation
echo ""
echo "✅ Verifying installation..."
docker --version
docker compose version || docker-compose --version

echo ""
echo "✅ Docker installation complete!"
echo ""
echo "⚠️  Note: You may need to logout and login again for docker group changes to take effect."
echo "    Or run: newgrp docker"
echo ""

