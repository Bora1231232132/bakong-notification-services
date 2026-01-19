# Complete Backend Fix - Fix enum and schema issues
Write-Host "🔧 Complete Backend Fix..." -ForegroundColor Cyan
Write-Host ""

$dbContainer = "bakong-notification-services-db-dev"

# Check if database container is running
$dbRunning = docker ps --format '{{.Names}}' | Select-String -Pattern $dbContainer

if (-not $dbRunning) {
    Write-Host "❌ Database container is not running!" -ForegroundColor Red
    Write-Host "   Starting containers..." -ForegroundColor Yellow
    docker-compose up -d db
    Start-Sleep -Seconds 10
}

Write-Host "✅ Database container is running" -ForegroundColor Green
Write-Host ""

# Step 1: Temporarily update users with ADMINISTRATOR to EDITOR
Write-Host "📝 Step 1: Temporarily updating ADMINISTRATOR users to EDITOR..." -ForegroundColor Cyan
docker exec $dbContainer psql -U bkns_dev -d bakong_notification_services_dev -c "UPDATE \"user\" SET role = 'EDITOR'::text WHERE role::text = 'ADMINISTRATOR';" 2>&1 | Out-Null
Write-Host "✅ Users updated" -ForegroundColor Green
Write-Host ""

# Step 2: Fix the enum - ensure it has all correct values
Write-Host "📝 Step 2: Fixing user_role_enum with all correct values..." -ForegroundColor Cyan

# First, check if enum exists and what values it has
$enumCheck = docker exec $dbContainer psql -U bkns_dev -d bakong_notification_services_dev -t -c "SELECT COUNT(*) FROM pg_type WHERE typname = 'user_role_enum';"

if ($enumCheck -match "1") {
    Write-Host "   Enum exists, adding missing values..." -ForegroundColor Yellow
    
    # Add each value if it doesn't exist
    docker exec $dbContainer psql -U bkns_dev -d bakong_notification_services_dev -c "DO `$`$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ADMINISTRATOR' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role_enum')) THEN ALTER TYPE user_role_enum ADD VALUE 'ADMINISTRATOR'; END IF; END `$`$;" 2>&1 | Out-Null
    
    docker exec $dbContainer psql -U bkns_dev -d bakong_notification_services_dev -c "DO `$`$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'VIEW_ONLY' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role_enum')) THEN ALTER TYPE user_role_enum ADD VALUE 'VIEW_ONLY'; END IF; END `$`$;" 2>&1 | Out-Null
    
    docker exec $dbContainer psql -U bkns_dev -d bakong_notification_services_dev -c "DO `$`$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'APPROVAL' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role_enum')) THEN ALTER TYPE user_role_enum ADD VALUE 'APPROVAL'; END IF; END `$`$;" 2>&1 | Out-Null
    
    docker exec $dbContainer psql -U bkns_dev -d bakong_notification_services_dev -c "DO `$`$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'EDITOR' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role_enum')) THEN ALTER TYPE user_role_enum ADD VALUE 'EDITOR'; END IF; END `$`$;" 2>&1 | Out-Null
    
    Write-Host "✅ Enum values added" -ForegroundColor Green
} else {
    Write-Host "   Enum doesn't exist, creating it..." -ForegroundColor Yellow
    docker exec $dbContainer psql -U bkns_dev -d bakong_notification_services_dev -c "CREATE TYPE user_role_enum AS ENUM ('ADMINISTRATOR', 'VIEW_ONLY', 'APPROVAL', 'EDITOR');" 2>&1 | Out-Null
    Write-Host "✅ Enum created" -ForegroundColor Green
}

Write-Host ""

# Step 3: Ensure mustChangePassword column exists
Write-Host "📝 Step 3: Adding mustChangePassword column..." -ForegroundColor Cyan
docker exec $dbContainer psql -U bkns_dev -d bakong_notification_services_dev -c "ALTER TABLE \"user\" ADD COLUMN IF NOT EXISTS \"mustChangePassword\" BOOLEAN NOT NULL DEFAULT true;" 2>&1 | Out-Null
Write-Host "✅ Column added" -ForegroundColor Green
Write-Host ""

# Step 4: Ensure other required columns exist
Write-Host "📝 Step 4: Ensuring other required columns exist..." -ForegroundColor Cyan
docker exec $dbContainer psql -U bkns_dev -d bakong_notification_services_dev -c "ALTER TABLE \"user\" ADD COLUMN IF NOT EXISTS \"status\" user_status_enum DEFAULT 'DEACTIVATED';" 2>&1 | Out-Null
docker exec $dbContainer psql -U bkns_dev -d bakong_notification_services_dev -c "ALTER TABLE \"user\" ADD COLUMN IF NOT EXISTS \"email\" VARCHAR(255);" 2>&1 | Out-Null
docker exec $dbContainer psql -U bkns_dev -d bakong_notification_services_dev -c "ALTER TABLE \"user\" ADD COLUMN IF NOT EXISTS \"syncStatus\" JSONB;" 2>&1 | Out-Null
Write-Host "✅ Columns verified" -ForegroundColor Green
Write-Host ""

# Step 5: Restart backend
Write-Host "🔄 Restarting backend..." -ForegroundColor Cyan
docker-compose restart backend

Write-Host ""
Write-Host "⏳ Waiting for backend to start (15 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

Write-Host ""
Write-Host "📋 Checking backend status..." -ForegroundColor Cyan
$backendStatus = docker ps --format '{{.Names}} {{.Status}}' | Select-String -Pattern "bakong-notification-services-api-dev"

if ($backendStatus) {
    Write-Host "✅ Backend container is running" -ForegroundColor Green
} else {
    Write-Host "❌ Backend container is not running!" -ForegroundColor Red
}

Write-Host ""
Write-Host "📋 Recent backend logs:" -ForegroundColor Cyan
docker logs bakong-notification-services-api-dev --tail 20

Write-Host ""
Write-Host "✅ Fix complete!" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Note: Users that had ADMINISTRATOR role were temporarily set to EDITOR." -ForegroundColor Yellow
Write-Host "   You may need to manually update them back to ADMINISTRATOR after verifying the backend works." -ForegroundColor Yellow
