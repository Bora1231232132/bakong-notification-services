# Password Change Feature Test Script
# This script tests the password change functionality

param(
    [string]$BaseUrl = "http://localhost:3000",
    [string]$Username = "admin",
    [string]$CurrentPassword = "admin1234",
    [string]$NewPassword = "newpass1234",
    [string]$TestPassword = "testpass1234"
)

# Colors for output
function Write-Success { param([string]$Message) Write-Host $Message -ForegroundColor Green }
function Write-Error { param([string]$Message) Write-Host $Message -ForegroundColor Red }
function Write-Info { param([string]$Message) Write-Host $Message -ForegroundColor Cyan }
function Write-Warning { param([string]$Message) Write-Host $Message -ForegroundColor Yellow }

# Test counter
$script:TestsPassed = 0
$script:TestsFailed = 0

function Test-PasswordChange {
    param(
        [string]$TestName,
        [string]$CurrentPwd,
        [string]$NewPwd,
        [string]$ExpectedStatus,
        [bool]$ShouldSucceed = $true
    )

    Write-Info "`n========================================="
    Write-Info "Test: $TestName"
    Write-Info "========================================="

    try {
        # Step 1: Login to get JWT token
        Write-Info "Step 1: Logging in as $Username..."
        $loginBody = @{
            username = $Username
            password = $CurrentPwd
        } | ConvertTo-Json

        $loginHeaders = @{
            "Content-Type" = "application/x-www-form-urlencoded"
            "x-api-key" = "BAKONG"
        }

        $loginFormData = "username=$Username&password=$CurrentPwd"
        $loginResponse = Invoke-RestMethod -Uri "$BaseUrl/api/v1/auth/login" `
            -Method Post `
            -Headers @{"Content-Type"="application/x-www-form-urlencoded"; "x-api-key"="BAKONG"} `
            -Body $loginFormData `
            -ErrorAction Stop

        if ($loginResponse.responseCode -ne 0) {
            Write-Error "  ❌ Login failed: $($loginResponse.responseMessage)"
            $script:TestsFailed++
            return $false
        }

        $accessToken = $loginResponse.data.accessToken
        Write-Success "  ✅ Login successful"
        Write-Info "  Token: $($accessToken.Substring(0, 20))..."

        # Step 2: Change password
        Write-Info "Step 2: Changing password..."
        $changePasswordBody = @{
            currentPassword = $CurrentPwd
            newPassword = $NewPwd
        } | ConvertTo-Json

        $changePasswordHeaders = @{
            "Content-Type" = "application/json"
            "Authorization" = "Bearer $accessToken"
        }

        try {
            $changePasswordResponse = Invoke-RestMethod -Uri "$BaseUrl/api/v1/auth/change-password" `
                -Method Put `
                -Headers $changePasswordHeaders `
                -Body $changePasswordBody `
                -ErrorAction Stop

            if ($ShouldSucceed) {
                if ($changePasswordResponse.responseCode -eq 0) {
                    Write-Success "  ✅ Password changed successfully"
                    Write-Info "  Message: $($changePasswordResponse.responseMessage)"
                    $script:TestsPassed++
                    return $true
                } else {
                    Write-Error "  ❌ Password change failed: $($changePasswordResponse.responseMessage)"
                    $script:TestsFailed++
                    return $false
                }
            } else {
                # Expected to fail
                if ($changePasswordResponse.responseCode -ne 0) {
                    Write-Success "  ✅ Correctly rejected: $($changePasswordResponse.responseMessage)"
                    $script:TestsPassed++
                    return $true
                } else {
                    Write-Error "  ❌ Should have failed but succeeded"
                    $script:TestsFailed++
                    return $false
                }
            }
        } catch {
            $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
            if ($errorResponse) {
                if ($ShouldSucceed) {
                    Write-Error "  ❌ Password change failed: $($errorResponse.responseMessage)"
                    $script:TestsFailed++
                    return $false
                } else {
                    Write-Success "  ✅ Correctly rejected: $($errorResponse.responseMessage)"
                    $script:TestsPassed++
                    return $true
                }
            } else {
                Write-Error "  ❌ Unexpected error: $($_.Exception.Message)"
                $script:TestsFailed++
                return $false
            }
        }

    } catch {
        Write-Error "  ❌ Test error: $($_.Exception.Message)"
        $script:TestsFailed++
        return $false
    }
}

function Test-LoginWithPassword {
    param(
        [string]$TestName,
        [string]$Password,
        [bool]$ShouldSucceed = $true
    )

    Write-Info "`n========================================="
    Write-Info "Test: $TestName"
    Write-Info "========================================="

    try {
        $loginFormData = "username=$Username&password=$Password"
        $loginResponse = Invoke-RestMethod -Uri "$BaseUrl/api/v1/auth/login" `
            -Method Post `
            -Headers @{"Content-Type"="application/x-www-form-urlencoded"; "x-api-key"="BAKONG"} `
            -Body $loginFormData `
            -ErrorAction Stop

        if ($ShouldSucceed) {
            if ($loginResponse.responseCode -eq 0) {
                Write-Success "  ✅ Login successful with password"
                $script:TestsPassed++
                return $true
            } else {
                Write-Error "  ❌ Login failed: $($loginResponse.responseMessage)"
                $script:TestsFailed++
                return $false
            }
        } else {
            if ($loginResponse.responseCode -ne 0) {
                Write-Success "  ✅ Correctly rejected login: $($loginResponse.responseMessage)"
                $script:TestsPassed++
                return $true
            } else {
                Write-Error "  ❌ Should have failed but succeeded"
                $script:TestsFailed++
                return $false
            }
        }
    } catch {
        $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
        if ($errorResponse) {
            if ($ShouldSucceed) {
                Write-Error "  ❌ Login failed: $($errorResponse.responseMessage)"
                $script:TestsFailed++
                return $false
            } else {
                Write-Success "  ✅ Correctly rejected: $($errorResponse.responseMessage)"
                $script:TestsPassed++
                return $true
            }
        } else {
            if ($ShouldSucceed) {
                Write-Error "  ❌ Unexpected error: $($_.Exception.Message)"
                $script:TestsFailed++
                return $false
            } else {
                Write-Success "  ✅ Correctly rejected (connection error)"
                $script:TestsPassed++
                return $true
            }
        }
    }
}

# Main test execution
Write-Host "`n" -NoNewline
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     Password Change Feature Test Suite                   ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Info "Configuration:"
Write-Info "  Base URL: $BaseUrl"
Write-Info "  Username: $Username"
Write-Info "  Current Password: $CurrentPassword"
Write-Info "  New Password: $NewPassword"
Write-Host ""

# Test 1: Successful password change
Write-Info "Starting Test Suite...`n"
Test-PasswordChange `
    -TestName "Successful Password Change" `
    -CurrentPwd $CurrentPassword `
    -NewPwd $NewPassword `
    -ShouldSucceed $true

Start-Sleep -Seconds 1

# Test 2: Verify old password no longer works
Test-LoginWithPassword `
    -TestName "Verify Old Password Rejected" `
    -Password $CurrentPassword `
    -ShouldSucceed $false

Start-Sleep -Seconds 1

# Test 3: Verify new password works
Test-LoginWithPassword `
    -TestName "Verify New Password Works" `
    -Password $NewPassword `
    -ShouldSucceed $true

Start-Sleep -Seconds 1

# Test 4: Try to change password with wrong current password
Test-PasswordChange `
    -TestName "Change Password with Wrong Current Password" `
    -CurrentPwd "wrongpassword" `
    -NewPwd $TestPassword `
    -ShouldSucceed $false

Start-Sleep -Seconds 1

# Test 5: Try to change password to same password
Test-PasswordChange `
    -TestName "Change Password to Same Password" `
    -CurrentPwd $NewPassword `
    -NewPwd $NewPassword `
    -ShouldSucceed $false

Start-Sleep -Seconds 1

# Test 6: Try password that's too short
Test-PasswordChange `
    -TestName "Change Password with Too Short Password" `
    -CurrentPwd $NewPassword `
    -NewPwd "123" `
    -ShouldSucceed $false

Start-Sleep -Seconds 1

# Test 7: Restore original password
Write-Info "`n========================================="
Write-Info "Restoring Original Password"
Write-Info "========================================="
$restoreResult = Test-PasswordChange `
    -TestName "Restore Original Password" `
    -CurrentPwd $NewPassword `
    -NewPwd $CurrentPassword `
    -ShouldSucceed $true

if ($restoreResult) {
    Write-Success "`n✅ Original password restored"
} else {
    Write-Warning "`n⚠️  Could not restore original password. You may need to reset it manually."
}

# Final Summary
Write-Host "`n"
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                    Test Summary                            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Success "Tests Passed: $script:TestsPassed"
Write-Error "Tests Failed: $script:TestsFailed"
Write-Host ""

$totalTests = $script:TestsPassed + $script:TestsFailed
if ($totalTests -gt 0) {
    $successRate = [math]::Round(($script:TestsPassed / $totalTests) * 100, 2)
    Write-Info "Success Rate: $successRate%"
}

if ($script:TestsFailed -eq 0) {
    Write-Success "`n🎉 All tests passed!"
} else {
    Write-Error "`n❌ Some tests failed. Please review the output above."
}

Write-Host ""

