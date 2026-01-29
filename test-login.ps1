# Diagnostic and Fix Script for Admin Login
Write-Host "=== Admin Login Diagnostic ===" -ForegroundColor Cyan

# Step 1: Reset failed login attempts (using SQL file approach)
Write-Host "`n1. Resetting failed login attempts..." -ForegroundColor Yellow
$resetSql = @"
UPDATE "user" SET "syncStatus" = jsonb_set(
  COALESCE("syncStatus", '{"failLoginAttempt": 0, "login_at": null, "changePassword_count": 0}'::jsonb),
  '{failLoginAttempt}',
  '0'::jsonb
) WHERE username = 'admin';
"@
$resetSql | docker exec -i bakong-notification-services-db-dev psql -U bkns_dev -d bakong_notification_services_dev 2>&1 | Out-Null
Write-Host "✅ Failed attempts reset" -ForegroundColor Green

# Step 2: Try login
Write-Host "`n2. Attempting login..." -ForegroundColor Yellow
$loginBody = "username=admin&password=admin123"

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:4005/api/v1/auth/login" `
        -Method Post `
        -Body $loginBody `
        -ContentType "application/x-www-form-urlencoded"

    if ($loginResponse.responseCode -eq 0) {
        Write-Host "✅ LOGIN SUCCESSFUL!" -ForegroundColor Green
        $token = $loginResponse.data.accessToken
        Write-Host "`nToken (first 50 chars): $($token.Substring(0, [Math]::Min(50, $token.Length)))..." -ForegroundColor Gray
        Write-Host "`nFull response:" -ForegroundColor Cyan
        $loginResponse | ConvertTo-Json -Depth 10

        # Step 3: Test creating a user
        Write-Host "`n3. Testing create user endpoint..." -ForegroundColor Yellow
        $userBody = @{
            username = "test_user_$(Get-Random -Maximum 9999)"
            password = "SecurePass123!"
            displayName = "Test User"
            role = "NORMAL_USER"
            phoneNumber = "+855123456789"
        } | ConvertTo-Json

        $headers = @{
            "Authorization" = "Bearer $token"
            "Content-Type" = "application/json"
        }

        try {
            $createResponse = Invoke-RestMethod -Uri "http://localhost:4005/api/v1/user" `
                -Method Post `
                -Body $userBody `
                -Headers $headers

            if ($createResponse.responseCode -eq 0) {
                Write-Host "✅ User created successfully!" -ForegroundColor Green
                $createResponse | ConvertTo-Json -Depth 10
            } else {
                Write-Host "❌ Failed to create user" -ForegroundColor Red
                $createResponse | ConvertTo-Json
            }
        } catch {
            Write-Host "❌ Error creating user: $_" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ Login failed!" -ForegroundColor Red
        Write-Host "Response Code: $($loginResponse.responseCode)" -ForegroundColor Yellow
        Write-Host "Message: $($loginResponse.responseMessage)" -ForegroundColor Yellow
        Write-Host "Error Code: $($loginResponse.errorCode)" -ForegroundColor Yellow
        $loginResponse | ConvertTo-Json
    }
} catch {
    Write-Host "❌ Login error occurred!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Yellow

    # Try to get response body
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody" -ForegroundColor Yellow
    }
}

Write-Host "`n=== Diagnostic Complete ===" -ForegroundColor Cyan
