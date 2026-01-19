# ============================================================================
# Run Approval Fields Migration in Docker
# ============================================================================
# This script runs the add-template-approval-fields.sql migration in Docker
# It auto-detects the environment based on running containers
#
# Usage:
#   .\run-approval-migration.ps1
#   .\run-approval-migration.ps1 -Environment dev
#   .\run-approval-migration.ps1 -Environment sit
#   .\run-approval-migration.ps1 -Environment production
# ============================================================================

param(
    [string]$Environment = ""
)

$MIGRATION_FILE = "apps/backend/scripts/add-template-approval-fields.sql"

# Auto-detect environment if not specified
if ([string]::IsNullOrEmpty($Environment)) {
    $runningContainers = docker ps --format '{{.Names}}' | Where-Object { $_ -like "*bakong*db*" }

    if ($runningContainers -like "*bakong-notification-services-db$") {
        $Environment = "production"
        $DB_CONTAINER = "bakong-notification-services-db"
        $DB_NAME = "bakong_notification_services"
        $DB_USER = "bkns"
    }
    elseif ($runningContainers -like "*bakong-notification-services-db-sit*") {
        $Environment = "sit"
        $DB_CONTAINER = "bakong-notification-services-db-sit"
        $DB_NAME = "bakong_notification_services_sit"
        $DB_USER = "bkns_sit"
    }
    elseif ($runningContainers -like "*bakong-notification-services-db-dev*") {
        $Environment = "dev"
        $DB_CONTAINER = "bakong-notification-services-db-dev"
        $DB_NAME = "bakong_notification_services_dev"
        $DB_USER = "bkns_dev"
    }
    else {
        Write-Host "❌ Could not detect environment. Please specify -Environment parameter" -ForegroundColor Red
        Write-Host ""
        Write-Host "Available containers:" -ForegroundColor Yellow
        docker ps --format "   - {{.Names}}" | Where-Object { $_ -like "*bakong*" }
        exit 1
    }
}
else {
    # Set based on explicit environment parameter
    switch ($Environment.ToLower()) {
        "dev" {
            $DB_CONTAINER = "bakong-notification-services-db-dev"
            $DB_NAME = "bakong_notification_services_dev"
            $DB_USER = "bkns_dev"
        }
        "sit" {
            $DB_CONTAINER = "bakong-notification-services-db-sit"
            $DB_NAME = "bakong_notification_services_sit"
            $DB_USER = "bkns_sit"
        }
        "production" {
            $DB_CONTAINER = "bakong-notification-services-db"
            $DB_NAME = "bakong_notification_services"
            $DB_USER = "bkns"
        }
        default {
            Write-Host "❌ Invalid environment: $Environment" -ForegroundColor Red
            Write-Host "   Valid options: dev, sit, production" -ForegroundColor Yellow
            exit 1
        }
    }
}

Write-Host "🔄 Running Approval Fields Migration" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Configuration:" -ForegroundColor Yellow
Write-Host "   Environment: $Environment"
Write-Host "   Container: $DB_CONTAINER"
Write-Host "   Database: $DB_NAME"
Write-Host "   User: $DB_USER"
Write-Host ""

# Check if container exists and is running
$containerRunning = docker ps --format '{{.Names}}' | Select-String -Pattern "^$DB_CONTAINER$"

if (-not $containerRunning) {
    Write-Host "❌ Database container '$DB_CONTAINER' is not running!" -ForegroundColor Red
    Write-Host ""
    Write-Host "   Available containers:" -ForegroundColor Yellow
    docker ps --format "   - {{.Names}}" | Where-Object { $_ -like "*bakong*" }
    Write-Host ""
    Write-Host "💡 Start the database first:" -ForegroundColor Cyan

    switch ($Environment.ToLower()) {
        "dev" { Write-Host "   docker-compose up -d db" -ForegroundColor White }
        "sit" { Write-Host "   docker-compose -f docker-compose.sit.yml up -d db" -ForegroundColor White }
        "production" { Write-Host "   docker-compose -f docker-compose.production.yml up -d db" -ForegroundColor White }
    }
    exit 1
}

Write-Host "✅ Database container is running" -ForegroundColor Green
Write-Host ""

# Check if migration file exists
if (-not (Test-Path $MIGRATION_FILE)) {
    Write-Host "❌ Migration file not found: $MIGRATION_FILE" -ForegroundColor Red
    Write-Host "   Current directory: $(Get-Location)" -ForegroundColor Yellow
    exit 1
}

Write-Host "📝 Running migration..." -ForegroundColor Cyan
Write-Host ""

# Run migration
Get-Content $MIGRATION_FILE | docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME

$EXIT_CODE = $LASTEXITCODE

if ($EXIT_CODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "💡 Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Restart your backend service to pick up the new fields" -ForegroundColor White
    Write-Host "   2. Verify the migration by checking template table structure" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "❌ Migration failed with exit code: $EXIT_CODE" -ForegroundColor Red
    exit $EXIT_CODE
}
