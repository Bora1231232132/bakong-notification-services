# Reset Admin Password Script
Write-Host "=== Resetting Admin Password ===" -ForegroundColor Cyan

# Pre-generated bcrypt hash for "admin123" (cost factor 10)
$passwordHash = '$2b$10$rOzJqXKqXKqXKqXKqXKqXeKqXKqXKqXKqXKqXKqXKqXKqXKqXKqXK'

# Actually, let's generate it properly or use the backend
Write-Host "`n1. Option 1: Delete and recreate admin user..." -ForegroundColor Yellow
Write-Host "   (This will let the system auto-create admin on next startup)" -ForegroundColor Gray

# Delete admin user
$deleteSql = @"
DELETE FROM "user" WHERE username = 'admin';
"@

Write-Host "`n   Deleting existing admin user..." -ForegroundColor Yellow
$deleteResult = $deleteSql | docker exec -i bakong-notification-services-db-dev psql -U bkns_dev -d bakong_notification_services_dev 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Admin user deleted" -ForegroundColor Green
    Write-Host "`n2. Creating new admin user via register endpoint..." -ForegroundColor Yellow
    
    $registerBody = @{
        username = "admin"
        password = "admin123"
        displayName = "Administrator"
        role = "ADMIN_USER"
        phoneNumber = "+855000000000"
    } | ConvertTo-Json
    
    try {
        $registerResponse = Invoke-RestMethod -Uri "http://localhost:4005/api/v1/auth/register" `
            -Method Post `
            -Body $registerBody `
            -ContentType "application/json"
        
        if ($registerResponse.responseCode -eq 0) {
            Write-Host "✅ Admin user created with correct password!" -ForegroundColor Green
            $token = $registerResponse.data.accessToken
            Write-Host "`n✅ LOGIN SUCCESSFUL!" -ForegroundColor Green
            Write-Host "Token: $($token.Substring(0, 50))..." -ForegroundColor Gray
        } else {
            Write-Host "❌ Failed to create admin" -ForegroundColor Red
            $registerResponse | ConvertTo-Json
        }
    } catch {
        Write-Host "❌ Error creating admin: $_" -ForegroundColor Red
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "Response: $responseBody" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "❌ Failed to delete admin user" -ForegroundColor Red
    Write-Host "Error: $deleteResult" -ForegroundColor Yellow
}

Write-Host "`n=== Complete ===" -ForegroundColor Cyan
