# Local Test Script for Windows PowerShell
# Run this before deploying to SIT/Production
# This verifies your Docker setup works locally

$ErrorActionPreference = "Stop"

Write-Host "🧪 Starting Local Test..." -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Step 1: Check Docker
Write-Host "`n[Step 1] Checking Docker..." -ForegroundColor Yellow
try {
    docker ps | Out-Null
    Write-Host "✓ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Step 2: Stop any existing containers
Write-Host "`n[Step 2] Cleaning up old containers..." -ForegroundColor Yellow
docker compose -f docker-compose.yml down -v 2>$null
Write-Host "✓ Cleanup complete" -ForegroundColor Green

# Step 3: Build images
Write-Host "`n[Step 3] Building Docker images..." -ForegroundColor Yellow
Write-Host "This may take several minutes..." -ForegroundColor Gray
docker compose -f docker-compose.yml build --no-cache
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Build successful" -ForegroundColor Green
} else {
    Write-Host "✗ Build failed" -ForegroundColor Red
    exit 1
}

# Step 4: Start services
Write-Host "`n[Step 4] Starting services..." -ForegroundColor Yellow
docker compose -f docker-compose.yml up -d
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Services started" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to start services" -ForegroundColor Red
    exit 1
}

# Step 5: Wait for database
Write-Host "`n[Step 5] Waiting for database to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10
$dbCheck = docker compose -f docker-compose.yml exec -T db pg_isready -U bkns_dev -d bakong_notification_services_dev 2>&1
if ($dbCheck -match "accepting connections") {
    Write-Host "✓ Database is ready" -ForegroundColor Green
} else {
    Write-Host "✗ Database not ready" -ForegroundColor Red
    docker compose -f docker-compose.yml logs db
    exit 1
}

# Step 6: Wait for backend
Write-Host "`n[Step 6] Waiting for backend to be ready..." -ForegroundColor Yellow
$maxAttempts = 30
$attempt = 0
$backendReady = $false

while ($attempt -lt $maxAttempts) {
    Start-Sleep -Seconds 2
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:4004/api/v1/health" -Method Get -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            $backendReady = $true
            break
        }
    } catch {
        # Continue waiting
    }
    $attempt++
    Write-Host "." -NoNewline
}

Write-Host ""
if ($backendReady) {
    Write-Host "✓ Backend is ready" -ForegroundColor Green
} else {
    Write-Host "✗ Backend not ready after $maxAttempts attempts" -ForegroundColor Red
    Write-Host "`nBackend logs:" -ForegroundColor Yellow
    docker compose -f docker-compose.yml logs backend | Select-Object -Last 50
    exit 1
}

# Step 7: Test API endpoints
Write-Host "`n[Step 7] Testing API endpoints..." -ForegroundColor Yellow

try {
    $healthResponse = Invoke-RestMethod -Uri "http://localhost:4004/api/v1/health" -Method Get
    if ($healthResponse.status) {
        Write-Host "✓ Health endpoint working" -ForegroundColor Green
    } else {
        Write-Host "✗ Health endpoint failed" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Health endpoint failed: $_" -ForegroundColor Red
}

# Step 8: Check frontend
Write-Host "`n[Step 8] Checking frontend..." -ForegroundColor Yellow
try {
    $frontendResponse = Invoke-WebRequest -Uri "http://localhost:3001" -Method Get -TimeoutSec 5 -UseBasicParsing -ErrorAction SilentlyContinue
    if ($frontendResponse.StatusCode -eq 200) {
        Write-Host "✓ Frontend is accessible (HTTP $($frontendResponse.StatusCode))" -ForegroundColor Green
    } else {
        Write-Host "⚠ Frontend returned HTTP $($frontendResponse.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠ Frontend check failed: $_" -ForegroundColor Yellow
    docker compose -f docker-compose.yml logs frontend | Select-Object -Last 20
}

# Step 9: Check container status
Write-Host "`n[Step 9] Container status..." -ForegroundColor Yellow
docker compose -f docker-compose.yml ps

# Summary
Write-Host "`n================================" -ForegroundColor Green
Write-Host "✅ Local Test Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""
Write-Host "Frontend: http://localhost:3001"
Write-Host "Backend API: http://localhost:4004"
Write-Host "Database: localhost:5437"
Write-Host ""
Write-Host "To view logs:"
Write-Host "  docker compose -f docker-compose.yml logs -f"
Write-Host ""
Write-Host "To stop services:"
Write-Host "  docker compose -f docker-compose.yml down"
Write-Host ""

