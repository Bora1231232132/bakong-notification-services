# Quick Fix - Update users and fix enum before TypeORM sync
Write-Host "🔧 Quick Fix - Preparing database for TypeORM sync..." -ForegroundColor Cyan
Write-Host ""

$dbContainer = "bakong-notification-services-db-dev"

# Step 1: Stop backend to prevent TypeORM from interfering
Write-Host "📝 Step 1: Stopping backend..." -ForegroundColor Cyan
docker-compose stop backend
Write-Host "✅ Backend stopped" -ForegroundColor Green
Write-Host ""

# Step 2: Update any users with ADMINISTRATOR to EDITOR temporarily
Write-Host "📝 Step 2: Updating users with ADMINISTRATOR role..." -ForegroundColor Cyan
docker exec $dbContainer psql -U bkns_dev -d bakong_notification_services_dev -c "UPDATE \"user\" SET role = 'EDITOR' WHERE role::text = 'ADMINISTRATOR';" 2>&1 | Out-Null
Write-Host "✅ Users updated" -ForegroundColor Green
Write-Host ""

# Step 3: Use the comprehensive enum fix script
Write-Host "📝 Step 3: Running comprehensive enum fix..." -ForegroundColor Cyan
if (Test-Path "apps/backend/scripts/fix-enum-values-realtime.sql") {
    Get-Content "apps/backend/scripts/fix-enum-values-realtime.sql" | docker exec -i $dbContainer psql -U bkns_dev -d bakong_notification_services_dev
    Write-Host "✅ Enum fix completed" -ForegroundColor Green
} else {
    Write-Host "⚠️  fix-enum-values-realtime.sql not found, using direct SQL..." -ForegroundColor Yellow
    # Direct SQL fallback
    docker exec $dbContainer psql -U bkns_dev -d bakong_notification_services_dev -c "DO `$`$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ADMINISTRATOR' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role_enum')) THEN ALTER TYPE user_role_enum ADD VALUE 'ADMINISTRATOR'; END IF; END `$`$;" 2>&1 | Out-Null
}

Write-Host ""

# Step 4: Add mustChangePassword column
Write-Host "📝 Step 4: Adding mustChangePassword column..." -ForegroundColor Cyan
docker exec $dbContainer psql -U bkns_dev -d bakong_notification_services_dev -c "ALTER TABLE \"user\" ADD COLUMN IF NOT EXISTS \"mustChangePassword\" BOOLEAN NOT NULL DEFAULT true;" 2>&1 | Out-Null
Write-Host "✅ Column added" -ForegroundColor Green
Write-Host ""

# Step 5: Start backend
Write-Host "🔄 Starting backend..." -ForegroundColor Cyan
docker-compose up -d backend

Write-Host ""
Write-Host "⏳ Waiting for backend to start (15 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

Write-Host ""
Write-Host "📋 Checking backend logs..." -ForegroundColor Cyan
docker logs bakong-notification-services-api-dev --tail 30

Write-Host ""
Write-Host "✅ Fix complete!" -ForegroundColor Green
