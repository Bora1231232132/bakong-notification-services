Write-Host "=== Backend Status Check ===" -ForegroundColor Cyan

# Check Docker
Write-Host "`n1. Checking Docker containers..." -ForegroundColor Yellow
$dockerBackend = docker ps --filter "name=bakong-notification-services-api-dev" --format "{{.Names}}"
if ($dockerBackend) {
    Write-Host "   ✅ Docker backend is RUNNING: $dockerBackend" -ForegroundColor Green
} else {
    Write-Host "   ❌ Docker backend is NOT running" -ForegroundColor Red
}

# Check Ports
Write-Host "`n2. Checking ports..." -ForegroundColor Yellow
$port4004 = netstat -ano | findstr :4004
$port4005 = netstat -ano | findstr :4005

if ($port4004) {
    Write-Host "   ✅ Port 4004 is in use (Docker)" -ForegroundColor Green
} else {
    Write-Host "   ❌ Port 4004 is NOT in use" -ForegroundColor Red
}

if ($port4005) {
    Write-Host "   ✅ Port 4005 is in use (Local)" -ForegroundColor Green
} else {
    Write-Host "   ❌ Port 4005 is NOT in use" -ForegroundColor Red
}

# Test endpoints
Write-Host "`n3. Testing endpoints..." -ForegroundColor Yellow
try {
    $response4004 = Invoke-WebRequest -Uri "http://localhost:4004/api/v1/management/healthcheck" -Method GET -TimeoutSec 2 -ErrorAction Stop
    Write-Host "   ✅ Port 4004 (Docker) is RESPONDING" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Port 4004 (Docker) is NOT responding" -ForegroundColor Red
}

try {
    $response4005 = Invoke-WebRequest -Uri "http://localhost:4005/api/v1/management/healthcheck" -Method GET -TimeoutSec 2 -ErrorAction Stop
    Write-Host "   ✅ Port 4005 (Local) is RESPONDING" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Port 4005 (Local) is NOT responding" -ForegroundColor Red
}

Write-Host "`n=== Check Complete ===" -ForegroundColor Cyan
