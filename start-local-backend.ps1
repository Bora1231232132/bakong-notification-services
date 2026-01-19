Write-Host "=== Starting Local Backend ===" -ForegroundColor Cyan

# Stop Docker backend
Write-Host "`n1. Stopping Docker backend..." -ForegroundColor Yellow
docker stop bakong-notification-services-api-dev 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Docker backend stopped" -ForegroundColor Green
} else {
    Write-Host "   ℹ️  Docker backend was not running" -ForegroundColor Gray
}

# Check port 4005
Write-Host "`n2. Checking port 4005..." -ForegroundColor Yellow
$port4005 = netstat -ano | findstr :4005
if ($port4005) {
    Write-Host "   ⚠️  Port 4005 is in use. Checking if it's responding..." -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:4005/api/v1/management/healthcheck" -Method GET -TimeoutSec 2 -ErrorAction Stop
        Write-Host "   ✅ Port 4005 is already responding (backend might be running)" -ForegroundColor Green
        Write-Host "`n   You can test login at: http://localhost:4005/api/v1/auth/login" -ForegroundColor Cyan
        exit
    } catch {
        Write-Host "   ⚠️  Port 4005 is in use but not responding. You may need to kill the process." -ForegroundColor Yellow
        Write-Host "   Run: netstat -ano | findstr :4005" -ForegroundColor Gray
    }
} else {
    Write-Host "   ✅ Port 4005 is available" -ForegroundColor Green
}

# Navigate to backend
Write-Host "`n3. Starting local backend..." -ForegroundColor Yellow
Set-Location apps/backend

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "   Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Start backend
Write-Host "`n   Starting backend server..." -ForegroundColor Yellow
Write-Host "   Backend will run on: http://localhost:4005" -ForegroundColor Cyan
Write-Host "   Login endpoint: http://localhost:4005/api/v1/auth/login" -ForegroundColor Cyan
Write-Host "`n   Press Ctrl+C to stop the server`n" -ForegroundColor Gray

npm run dev
