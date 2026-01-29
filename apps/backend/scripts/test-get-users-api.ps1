# Test script for GET /user API (PowerShell)
# Usage: .\test-get-users-api.ps1 -JwtToken "YOUR_TOKEN" -BaseUrl "http://localhost:4004"

param(
    [Parameter(Mandatory=$true)]
    [string]$JwtToken,
    
    [Parameter(Mandatory=$false)]
    [string]$BaseUrl = "http://localhost:4004"
)

Write-Host "🧪 Testing GET /user API" -ForegroundColor Cyan
Write-Host "Base URL: $BaseUrl" -ForegroundColor Gray
Write-Host ""

$headers = @{
    "Authorization" = "Bearer $JwtToken"
    "Content-Type" = "application/json"
}

# Test 1: Basic request
Write-Host "Test 1: Basic request (default pagination)" -ForegroundColor Green
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/user" -Method Get -Headers $headers
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: With pagination
Write-Host "Test 2: With pagination (page=1, size=5)" -ForegroundColor Green
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/user?page=1&size=5" -Method Get -Headers $headers
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 3: With sorting
Write-Host "Test 3: Sort by name (ASC)" -ForegroundColor Green
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/user?sortBy=name&sortOrder=ASC" -Method Get -Headers $headers
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 4: With search
Write-Host "Test 4: Search for 'admin'" -ForegroundColor Green
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/user?search=admin" -Method Get -Headers $headers
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 5: Filter by status
Write-Host "Test 5: Filter by status (ACTIVE)" -ForegroundColor Green
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/user?status=ACTIVE" -Method Get -Headers $headers
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 6: Filter by role
Write-Host "Test 6: Filter by role (EDITOR)" -ForegroundColor Green
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/user?role=EDITOR" -Method Get -Headers $headers
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 7: Combined parameters
Write-Host "Test 7: Combined (search + filter + sort + pagination)" -ForegroundColor Green
try {
    $params = @{
        search = "admin"
        status = "ACTIVE"
        role = "EDITOR"
        sortBy = "name"
        sortOrder = "ASC"
        page = 1
        size = 10
    }
    $queryString = ($params.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join "&"
    $response = Invoke-RestMethod -Uri "$BaseUrl/user?$queryString" -Method Get -Headers $headers
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

Write-Host "✅ All tests completed!" -ForegroundColor Cyan
