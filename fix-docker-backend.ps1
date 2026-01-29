# ============================================================================
# Fix Docker Backend - Complete Fix Script
# ============================================================================
# This script:
#   1. Stops the backend container
#   2. Runs the enum recreation SQL script
#   3. Restarts the backend container
#
# Usage:
#   .\fix-docker-backend.ps1
# ============================================================================

Write-Host "🔧 Fixing Docker Backend..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if database container is running
Write-Host "📋 Step 1: Checking database container..." -ForegroundColor Yellow
$dbContainer = docker ps -a --filter "name=bakong-notification-services-db-dev" --format "{{.Names}}"
if (-not $dbContainer) {
    Write-Host "❌ Database container not found. Please start it first with: docker-compose up -d db" -ForegroundColor Red
    exit 1
}

$dbRunning = docker ps --filter "name=bakong-notification-services-db-dev" --format "{{.Names}}"
if (-not $dbRunning) {
    Write-Host "⚠️  Database container exists but is not running. Starting it..." -ForegroundColor Yellow
    docker-compose up -d db
    Write-Host "⏳ Waiting for database to be ready..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
}

Write-Host "✅ Database container is running" -ForegroundColor Green
Write-Host ""

# Step 2: Stop backend container
Write-Host "📋 Step 2: Stopping backend container..." -ForegroundColor Yellow
docker-compose stop backend
Write-Host "✅ Backend container stopped" -ForegroundColor Green
Write-Host ""

# Step 3: Run SQL script to fix enum
Write-Host "📋 Step 3: Running enum recreation SQL script..." -ForegroundColor Yellow
$sqlScript = "apps\backend\scripts\recreate-user-role-enum.sql"
if (-not (Test-Path $sqlScript)) {
    Write-Host "❌ SQL script not found at: $sqlScript" -ForegroundColor Red
    exit 1
}

Write-Host "   Executing SQL script..." -ForegroundColor Gray
Get-Content $sqlScript | docker exec -i bakong-notification-services-db-dev psql -U bkns_dev -d bakong_notification_services_dev

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Enum recreation completed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ SQL script execution failed. Check the error above." -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 4: Restart backend container
Write-Host "📋 Step 4: Restarting backend container..." -ForegroundColor Yellow
docker-compose up -d backend
Write-Host "✅ Backend container restarted" -ForegroundColor Green
Write-Host ""

# Step 5: Show logs
Write-Host "📋 Step 5: Showing backend logs (last 20 lines)..." -ForegroundColor Yellow
Write-Host ""
Start-Sleep -Seconds 3
docker-compose logs --tail=20 backend
Write-Host ""

Write-Host "✅ Fix completed!" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Tips:" -ForegroundColor Cyan
Write-Host "   - Check logs with: docker-compose logs -f backend" -ForegroundColor Gray
Write-Host "   - Check database connection: docker-compose logs backend | Select-String 'database'" -ForegroundColor Gray
Write-Host ""
