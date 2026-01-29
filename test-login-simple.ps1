# Simple Login API Test Script
# Tests the login endpoint after the password field fix

Write-Host "=== Testing Login API ===" -ForegroundColor Cyan

# Configuration
$apiUrl = "http://localhost:4005/api/v1/auth/login"

# Test credentials (adjust these to match your test user)
$username = "admin"
$password = "admin1234"

Write-Host "`nTesting login with:" -ForegroundColor Yellow
Write-Host "  Username: $username" -ForegroundColor Gray
Write-Host "  Endpoint: $apiUrl" -ForegroundColor Gray

# Prepare request body (form-urlencoded format)
$body = @{
    username = $username
    password = $password
}

Write-Host "`nSending login request..." -ForegroundColor Yellow

# Use Invoke-WebRequest and catch WebException to read error response body
try {
    $webResponse = Invoke-WebRequest -Uri $apiUrl `
        -Method Post `
        -Body $body `
        -ContentType "application/x-www-form-urlencoded" `
        -ErrorAction Stop

    # Parse the response body
    $response = $webResponse.Content | ConvertFrom-Json

    # Check response
    if ($response.responseCode -eq 0) {
        Write-Host "`n✅ LOGIN SUCCESSFUL!" -ForegroundColor Green
        Write-Host "`nResponse Details:" -ForegroundColor Cyan
        Write-Host "  Response Code: $($response.responseCode)" -ForegroundColor Gray
        Write-Host "  Message: $($response.responseMessage)" -ForegroundColor Gray
        Write-Host "  Error Code: $($response.errorCode)" -ForegroundColor Gray

        if ($response.data) {
            Write-Host "`nUser Info:" -ForegroundColor Cyan
            Write-Host "  ID: $($response.data.user.id)" -ForegroundColor Gray
            Write-Host "  Username: $($response.data.user.username)" -ForegroundColor Gray
            Write-Host "  Role: $($response.data.user.role)" -ForegroundColor Gray
            Write-Host "  Display Name: $($response.data.user.displayName)" -ForegroundColor Gray

            if ($response.data.accessToken) {
                $token = $response.data.accessToken
                Write-Host "`nToken (first 50 chars): $($token.Substring(0, [Math]::Min(50, $token.Length)))..." -ForegroundColor Gray
                Write-Host "  Expires At: $($response.data.expireAt)" -ForegroundColor Gray
            }
        }

        Write-Host "`nFull Response (JSON):" -ForegroundColor Cyan
        $response | ConvertTo-Json -Depth 10

    } else {
        Write-Host "`n❌ LOGIN FAILED!" -ForegroundColor Red
        Write-Host "`nError Details:" -ForegroundColor Yellow
        Write-Host "  Response Code: $($response.responseCode)" -ForegroundColor Gray
        Write-Host "  Error Code: $($response.errorCode)" -ForegroundColor Gray
        Write-Host "  Message: $($response.responseMessage)" -ForegroundColor Gray
        Write-Host "`nFull Response:" -ForegroundColor Yellow
        $response | ConvertTo-Json -Depth 5
    }

} catch {
    Write-Host "`n❌ REQUEST FAILED!" -ForegroundColor Red
    Write-Host "`nError: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "`nError Type: $($_.Exception.GetType().FullName)" -ForegroundColor Yellow

    # If it's a WebException, read the error response body
    if ($_.Exception -is [System.Net.WebException]) {
        $webException = $_.Exception
        $statusCode = [int]$webException.Response.StatusCode

        Write-Host "`nHTTP Status Code: $statusCode" -ForegroundColor Yellow

        if ($webException.Response) {
            try {
                # Read the response stream
                $responseStream = $webException.Response.GetResponseStream()

                # Set stream position to beginning (important!)
                $responseStream.Position = 0

                $streamReader = New-Object System.IO.StreamReader($responseStream, [System.Text.Encoding]::UTF8)
                $responseBody = $streamReader.ReadToEnd()
                $streamReader.Close()
                $responseStream.Close()

                Write-Host "`nResponse Body:" -ForegroundColor Yellow
                Write-Host $responseBody -ForegroundColor Gray

                if ($responseBody -and $responseBody.Trim().Length -gt 0) {
                    try {
                        $errorResponse = $responseBody | ConvertFrom-Json
                        Write-Host "`n✅ Parsed Error Response:" -ForegroundColor Cyan
                        Write-Host "  Response Code: $($errorResponse.responseCode)" -ForegroundColor Gray
                        Write-Host "  Error Code: $($errorResponse.errorCode)" -ForegroundColor Gray
                        Write-Host "  Message: $($errorResponse.responseMessage)" -ForegroundColor Gray

                        # Explain error codes
                        Write-Host "`nError Code Meaning:" -ForegroundColor Cyan
                        switch ($errorResponse.errorCode) {
                            4 { Write-Host "  → INVALID_USERNAME_OR_PASSWORD: Wrong username or password" -ForegroundColor Yellow }
                            5 { Write-Host "  → FAILED_AUTHENTICATION: Authentication failed" -ForegroundColor Yellow }
                            8 { Write-Host "  → ACCOUNT_TIMEOUT: Account locked (too many failed attempts)" -ForegroundColor Yellow }
                            15 { Write-Host "  → USER_NOT_FOUND: Username does not exist" -ForegroundColor Yellow }
                            default { Write-Host "  → Error Code $($errorResponse.errorCode): See error.enums.ts" -ForegroundColor Yellow }
                        }
                    } catch {
                        Write-Host "  (Could not parse as JSON: $_)" -ForegroundColor Gray
                    }
                } else {
                    Write-Host "`n⚠️ Response body is empty!" -ForegroundColor Yellow
                    Write-Host "This might mean the backend isn't returning an error body." -ForegroundColor Gray
                }
            } catch {
                Write-Host "`nCould not read response stream: $_" -ForegroundColor Red
            }
        } else {
            Write-Host "`n⚠️ No response object in exception" -ForegroundColor Yellow
        }
    } else {
        Write-Host "`n⚠️ Exception is not a WebException" -ForegroundColor Yellow
        Write-Host "Exception type: $($_.Exception.GetType().FullName)" -ForegroundColor Gray
    }
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan
