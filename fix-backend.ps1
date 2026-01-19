# Fix Backend - Add mustChangePassword column and fix enum
Write-Host "🔧 Fixing Backend - Adding mustChangePassword column and fixing enum..." -ForegroundColor Cyan
Write-Host ""

# Check if database container is running
$dbContainer = "bakong-notification-services-db-dev"
$dbRunning = docker ps --format '{{.Names}}' | Select-String -Pattern $dbContainer

if (-not $dbRunning) {
    Write-Host "❌ Database container '$dbContainer' is not running!" -ForegroundColor Red
    Write-Host "   Starting containers..." -ForegroundColor Yellow
    docker-compose up -d db
    Start-Sleep -Seconds 10
}

Write-Host "✅ Database container is running" -ForegroundColor Green
Write-Host ""

# Step 1: Fix enum - Add ADMINISTRATOR if it doesn't exist
Write-Host "📝 Step 1: Fixing user_role_enum (adding ADMINISTRATOR)..." -ForegroundColor Cyan
if (Test-Path "apps/backend/scripts/add-administrator-role.sql") {
    Get-Content "apps/backend/scripts/add-administrator-role.sql" | docker exec -i $dbContainer psql -U bkns_dev -d bakong_notification_services_dev
    Write-Host "✅ Enum fix script executed" -ForegroundColor Green
} else {
    Write-Host "⚠️  add-administrator-role.sql not found, using direct SQL..." -ForegroundColor Yellow
    # Direct SQL to add ADMINISTRATOR enum value
    $enumFix = "DO `$`$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ADMINISTRATOR' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role_enum')) THEN ALTER TYPE user_role_enum ADD VALUE 'ADMINISTRATOR'; END IF; END `$`$;"
    docker exec $dbContainer psql -U bkns_dev -d bakong_notification_services_dev -c $enumFix
}

Write-Host ""

# Step 2: Add the mustChangePassword column
Write-Host "📝 Step 2: Adding mustChangePassword column..." -ForegroundColor Cyan
$sql = "ALTER TABLE `"user`" ADD COLUMN IF NOT EXISTS `"mustChangePassword`" BOOLEAN NOT NULL DEFAULT true;"
docker exec $dbContainer psql -U bkns_dev -d bakong_notification_services_dev -c $sql

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Column added successfully!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Column might already exist or there was an error" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🔄 Restarting backend..." -ForegroundColor Cyan
docker-compose restart backend

Write-Host ""
Write-Host "⏳ Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "📋 Checking backend logs..." -ForegroundColor Cyan
docker logs bakong-notification-services-api-dev --tail 30

Write-Host ""
Write-Host "✅ Done! Check the logs above for any errors." -ForegroundColor Green
Write-Host ""
Write-Host "💡 If you still see errors, try:" -ForegroundColor Yellow
Write-Host "   1. Check: docker logs bakong-notification-services-api-dev --tail 50" -ForegroundColor White
Write-Host "   2. Verify enum: docker exec $dbContainer psql -U bkns_dev -d bakong_notification_services_dev -c `"SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role_enum');`"" -ForegroundColor White
