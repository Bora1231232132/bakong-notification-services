# Quick Test Guide

## Windows Users

### Option 1: PowerShell Script (Recommended)
```powershell
# Run in PowerShell
.\test-local.ps1
```

### Option 2: Git Bash
```bash
# Make sure Docker Desktop is running first!
bash test-local.sh
```

### Option 3: Manual Testing
```powershell
# 1. Check Docker is running
docker ps

# 2. Stop old containers
docker compose -f docker-compose.yml down

# 3. Build images
docker compose -f docker-compose.yml build --no-cache

# 4. Start services
docker compose -f docker-compose.yml up -d

# 5. Wait 30 seconds, then check status
docker compose -f docker-compose.yml ps

# 6. Test backend
curl http://localhost:4004/api/v1/health
# Or in PowerShell:
Invoke-WebRequest -Uri "http://localhost:4004/api/v1/health"

# 7. Open frontend in browser
# http://localhost:3001
```

## Linux/Mac Users

```bash
# Make script executable
chmod +x test-local.sh

# Run the test
./test-local.sh
```

## Troubleshooting

### "Docker is not running"
- **Windows**: Start Docker Desktop from Start Menu
- **Linux**: Start Docker service: `sudo systemctl start docker`

### "error during connect: Post http://%2F%2F.%2Fpipe%2FdockerDesktopLinuxEngine"
- Docker Desktop is not running or not fully started
- Wait 30 seconds after starting Docker Desktop, then try again
- Restart Docker Desktop if the issue persists

### "Cannot connect to Docker daemon"
- Make sure Docker Desktop is running
- On Linux, you may need to add your user to the docker group:
  ```bash
  sudo usermod -aG docker $USER
  # Then log out and log back in
  ```

### Script fails at "Building Docker images"
- This is normal - the first build takes 5-10 minutes
- Make sure you have enough disk space (at least 5GB free)
- Check your internet connection (needs to download base images)

### Backend not ready
- Check logs: `docker compose -f docker-compose.yml logs backend`
- Common issues:
  - Database not ready yet (wait longer)
  - Port 4004 already in use
  - Missing environment files

### Frontend shows blank page
- Check browser console for errors
- Verify backend is running: `curl http://localhost:4004/api/v1/health`
- Check frontend logs: `docker compose -f docker-compose.yml logs frontend`

## What the Test Checks

1. ✅ Docker is running
2. ✅ Images build successfully
3. ✅ Containers start
4. ✅ Database is healthy
5. ✅ Backend responds to health checks
6. ✅ API endpoints work
7. ✅ Frontend is accessible

If all checks pass locally, your code should work on the server!

