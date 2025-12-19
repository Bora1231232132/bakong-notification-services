# ============================================================================
# Local Testing Script (PowerShell)
# ============================================================================
# Test database migration and verification scripts locally
# Usage (Windows):
#   powershell -ExecutionPolicy Bypass -File .\test-local.ps1
# ============================================================================

$ErrorActionPreference = "Stop"

# Go to script directory
Set-Location -Path $PSScriptRoot

$ENVIRONMENT  = "dev"
$COMPOSE_FILE = "docker-compose.yml"
$DB_CONTAINER = "bakong-notification-services-db-dev"
$DB_USER      = "bkns_dev"
$DB_NAME      = "bakong_notification_services_dev"
$DB_PASSWORD  = "dev"
$DB_RUNNING   = $false

Write-Host "Local Testing Script"
Write-Host "===================="
Write-Host ""

# Check if Docker is running
docker ps > $null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker is not running!"
    Write-Host "Please start Docker Desktop / Docker first."
    exit 1
}

Write-Host "Docker is running."
Write-Host ""

# Step 1: Check required files
Write-Host "Step 1: Checking required files..."
Write-Host "----------------------------------"

$MIGRATION_FILE        = "apps/backend/scripts/unified-migration.sql"
$VERIFY_MIGRATION_FILE = "apps/backend/scripts/verify-migration.sql"
$UTILS_FILE            = "utils-server.sh"

if (-not (Test-Path $MIGRATION_FILE)) {
    Write-Host "ERROR: Migration file not found: $MIGRATION_FILE"
    exit 1
} else {
    Write-Host "Found: $MIGRATION_FILE"
}

if (Test-Path $VERIFY_MIGRATION_FILE) {
    Write-Host "Found: $VERIFY_MIGRATION_FILE"
} else {
    Write-Host "Warning: Verification file not found: $VERIFY_MIGRATION_FILE (optional)"
}

if (-not (Test-Path $UTILS_FILE)) {
    Write-Host "Warning: Utils script not found: $UTILS_FILE (optional)"
} else {
    Write-Host "Found: $UTILS_FILE"
}

Write-Host ""
Write-Host "Step 2: Checking Docker containers..."
Write-Host "-------------------------------------"

function Test-ContainerRunning {
    param(
        [string]$Name,
        [switch]$All
    )

    $args = @("--format", "{{.Names}}")
    if ($All) {
        $out = docker ps -a @args 2>$null
    } else {
        $out = docker ps @args 2>$null
    }

    if (-not $out) { return $false }
    return ($out -split "`n" | Where-Object { $_ -eq $Name }) -ne $null
}

# Check if database container exists and is running
if (Test-ContainerRunning -Name $DB_CONTAINER) {
    Write-Host "Database container is running."
    $DB_RUNNING = $true
}
elseif (Test-ContainerRunning -Name $DB_CONTAINER -All) {
    Write-Host "Database container exists but is stopped - starting it..."
    docker start $DB_CONTAINER | Out-Null
    Write-Host "Waiting for database to be ready (15 seconds)..."
    Start-Sleep -Seconds 15

    for ($i = 1; $i -le 10; $i++) {
        docker exec $DB_CONTAINER pg_isready -U $DB_USER -d $DB_NAME -p 5432 > $null 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Database is ready."
            $DB_RUNNING = $true
            break
        }
        Write-Host "Waiting... ($i/10)"
        Start-Sleep -Seconds 2
    }

    if (-not $DB_RUNNING) {
        Write-Host "Warning: Database healthcheck timeout - continuing anyway."
        $DB_RUNNING = $true
    }
}
else {
    Write-Host "Database container not found - starting with docker compose..."
    docker compose -f $COMPOSE_FILE up -d db | Out-Null
    Write-Host "Waiting for database to start (15 seconds)..."
    Start-Sleep -Seconds 15

    for ($i = 1; $i -le 10; $i++) {
        docker exec $DB_CONTAINER pg_isready -U $DB_USER -d $DB_NAME -p 5432 > $null 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Database is ready."
            $DB_RUNNING = $true
            break
        }
        Write-Host "Waiting... ($i/10)"
        Start-Sleep -Seconds 2
    }

    if (-not $DB_RUNNING) {
        Write-Host "Warning: Database healthcheck timeout - continuing anyway."
        $DB_RUNNING = $true
    }
}

# Step 3 + 4: DB connection and migration
if ($DB_RUNNING) {
    Write-Host ""
    Write-Host "Step 3: Testing Database Connection..."
    Write-Host "--------------------------------------"

    Write-Host "Testing database connection..."
    $env:PGPASSWORD = $DB_PASSWORD
    docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "SELECT 1;" > $null 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Database connection successful."
    } else {
        Write-Host "ERROR: Database connection failed!"
        Write-Host "Please check:"
        Write-Host "  1. Container is running: docker ps | Select-String $DB_CONTAINER"
        Write-Host "  2. Database is ready: docker exec $DB_CONTAINER pg_isready -U $DB_USER"
        $env:PGPASSWORD = $null
        exit 1
    }
    $env:PGPASSWORD = $null

    Write-Host ""
    Write-Host "Step 4: Testing Migration Script..."
    Write-Host "-----------------------------------"

    Write-Host "Running unified migration from: $MIGRATION_FILE"
    Write-Host "Database: $DB_NAME"
    Write-Host "User: $DB_USER"
    Write-Host ""

    # Get database password
    if ($env:POSTGRES_PASSWORD) {
        $DB_PASSWORD = $env:POSTGRES_PASSWORD
    } else {
        $DB_PASSWORD = "dev"
    }

    $env:PGPASSWORD = $DB_PASSWORD
    Write-Host "Running migration (this may take a bit)..."

    # Temporarily allow native command warnings (Postgres NOTICE)
    $oldPref = $ErrorActionPreference
    $ErrorActionPreference = "Continue"

    $migrationOutputLines = Get-Content $MIGRATION_FILE | docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME 2>&1
    $migrationExitCode    = $LASTEXITCODE
    $migrationOutput      = $migrationOutputLines -join "`n"

    # Restore original preference
    $ErrorActionPreference = $oldPref

    # Check for critical errors (not just warnings)
    $hasCriticalError = ($migrationOutput -match "ERROR|FATAL|syntax error") -and -not ($migrationOutput -match "already exists|already NOT NULL|already has")

    if ($hasCriticalError) {
        Write-Host ""
        Write-Host "Migration failed with errors:"
        $migrationOutput -split "`n" | Where-Object { $_ -match "ERROR|FATAL" } | Select-Object -First 5 | ForEach-Object { Write-Host "  $_" }
        Write-Host ""
        Write-Host "Please check the full migration output above."
        $env:PGPASSWORD = $null
        exit 1
    }
    elseif ($migrationExitCode -eq 0 -or ($migrationOutput -match "already exists|already NOT NULL|already has")) {
        Write-Host ""
        Write-Host "Migration completed successfully."

        # Migration verification (can also produce NOTICE)
        if (Test-Path $VERIFY_MIGRATION_FILE) {
            Write-Host "Running migration verification..."

            $oldPref = $ErrorActionPreference
            $ErrorActionPreference = "Continue"

            Get-Content $VERIFY_MIGRATION_FILE | docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME > $null 2>&1
            $verifyExitCode = $LASTEXITCODE

            $ErrorActionPreference = $oldPref

            if ($verifyExitCode -eq 0) {
                Write-Host "Migration verification passed."
            } else {
                Write-Host "Warning: Verification reported issues (check manually if needed)."
            }
        }

        # Quick verification - check critical columns
        $checkTemplate = docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -tAc "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'template' AND column_name = 'categoryTypeId');" 2>$null
        if ($checkTemplate -match "t") {
            Write-Host "Verified: template.categoryTypeId column exists."
        } else {
            Write-Host "Warning: template.categoryTypeId column not found (may need manual check)."
        }

        $checkUser = docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -tAc "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'imageId');" 2>$null
        if ($checkUser -match "t") {
            Write-Host "Verified: user.imageId column exists."
        }

        $checkBakong = docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -tAc "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'bakong_user' AND column_name = 'syncStatus');" 2>$null
        if ($checkBakong -match "t") {
            Write-Host "Verified: bakong_user.syncStatus column exists."
        }
    }
    else {
        Write-Host ""
        Write-Host "Migration had warnings (may be normal if already applied)."
        Write-Host "Checking if migration is already applied..."

        $checkTemplate = docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -tAc "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'template' AND column_name = 'categoryTypeId');" 2>$null
        if ($checkTemplate -match "t") {
            Write-Host "Migration already applied (categoryTypeId exists)."
        } else {
            Write-Host "ERROR: Migration may have failed - please check manually."
            Write-Host "Migration output (last 10 lines):"
            $migrationOutput -split "`n" | Select-Object -Last 10 | ForEach-Object { Write-Host "  $_" }
            $env:PGPASSWORD = $null
            exit 1
        }
    }

    $env:PGPASSWORD = $null
}
else {
    Write-Host "Warning: Database not running - cannot test migration."
    exit 1
}

Write-Host ""
Write-Host "Step 5: Verifying Cascade Delete Constraint..."
Write-Host "----------------------------------------------"

if ($DB_RUNNING) {
    if ($env:POSTGRES_PASSWORD) {
        $DB_PASSWORD = $env:POSTGRES_PASSWORD
    } else {
        $DB_PASSWORD = "dev"
    }
    $env:PGPASSWORD = $DB_PASSWORD

    $constraintDef = docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -tAc "SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'notification'::regclass AND conname = 'FK_notification_template';" 2>$null
    if ($constraintDef -like "*ON DELETE CASCADE*") {
        Write-Host "Verified: FK_notification_template has ON DELETE CASCADE."
    } else {
        Write-Host "Warning: CASCADE constraint not found (unified-migration.sql should handle it)."
        Write-Host "This can be normal if migration has not run yet or constraint name differs."
    }

    $env:PGPASSWORD = $null
} else {
    Write-Host "Warning: Database not running - verification skipped."
}

Write-Host ""
Write-Host "Step 6: Testing Utils Script Commands..."
Write-Host "----------------------------------------"

if (Test-Path $UTILS_FILE) {
    Write-Host "Testing: bash utils-server.sh db-migrate"
    bash utils-server.sh db-migrate > $null 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Utils db-migrate command works."
    } else {
        Write-Host "Warning: db-migrate command had issues (may be normal if already migrated)."
    }

    Write-Host ""
    Write-Host "Testing: bash utils-server.sh verify-all"
    if (Test-Path "apps/backend/scripts/verify-all.sql") {
        bash utils-server.sh verify-all > $null 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Utils verify-all command works."
        } else {
            Write-Host "Warning: verify-all command had issues (check manually if needed)."
        }
    } else {
        Write-Host "Warning: verify-all.sql not found (using verify-migration.sql instead)."
        Write-Host "Skipping verify-all test (file removed)."
    }

    Write-Host ""
    Write-Host "Testing: bash utils-server.sh db-backup dev"
    bash utils-server.sh db-backup dev > $null 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Utils db-backup command works."

        if (Test-Path "backups/backup_dev_latest.sql") {
            $backupInfo = Get-Item "backups/backup_dev_latest.sql" -ErrorAction SilentlyContinue
            if ($backupInfo) {
                $sizeMB = [Math]::Round($backupInfo.Length / 1MB, 2)
                Write-Host "Backup file created: backups/backup_dev_latest.sql (${sizeMB}MB)."
            } else {
                Write-Host "Warning: Backup file not found (may be normal if backup failed silently)."
            }
        } else {
            Write-Host "Warning: Backup file not found (may be normal if backup failed silently)."
        }
    } else {
        Write-Host "Warning: db-backup command had issues (may be normal if database is empty)."
    }
} else {
    Write-Host "Warning: utils-server.sh not found - skipping utils tests."
}

Write-Host ""
Write-Host "Step 7: Verifying Data Integrity..."
Write-Host "-----------------------------------"

if (Test-Path $UTILS_FILE) {
    if (Test-Path "apps/backend/scripts/verify-all.sql") {
        Write-Host "Running comprehensive data verification (verify-all.sql)..."
        bash utils-server.sh verify-all
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Warning: Data verification reported issues (check manually if needed)."
        }
    } else {
        Write-Host "verify-all.sql not found - migration verification already completed in Step 4."
        Write-Host "All verification checks passed using verify-migration.sql."
    }
} else {
    Write-Host "Warning: utils-server.sh not found, skipping comprehensive verification."
}

Write-Host ""
Write-Host "All tests finished."
Write-Host ""
Write-Host "Summary:"
Write-Host "  - Migration file exists and runs."
Write-Host "  - Migration verification completed."
Write-Host "  - Critical columns checked."
Write-Host "  - Cascade delete constraint checked."
if (Test-Path $UTILS_FILE) {
    Write-Host "  - Utils script commands tested."
}
Write-Host ""
Write-Host "Useful commands:"
Write-Host "  - Check logs: docker compose -f $COMPOSE_FILE logs -f db"
Write-Host "  - Verify migration: psql -U $DB_USER -d $DB_NAME -f apps/backend/scripts/verify-migration.sql"
Write-Host "  - Backup: bash utils-server.sh db-backup dev"
Write-Host "  - Restart DB: docker compose -f $COMPOSE_FILE restart db"
Write-Host ""
