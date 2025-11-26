# Port Checker Script
# This script checks all ports in use on the system

param(
    [switch]$ShowAll = $false,
    [int[]]$Ports = @(),
    [string]$Filter = ""
)

# Colors for output
function Write-Success { param([string]$Message) Write-Host $Message -ForegroundColor Green }
function Write-Error { param([string]$Message) Write-Host $Message -ForegroundColor Red }
function Write-Info { param([string]$Message) Write-Host $Message -ForegroundColor Cyan }
function Write-Warning { param([string]$Message) Write-Host $Message -ForegroundColor Yellow }
function Write-Header { param([string]$Message) Write-Host $Message -ForegroundColor Magenta }

# Common development ports to highlight
$commonDevPorts = @{
    3000 = "Frontend (Vite/React/Vue)"
    3001 = "Frontend (Alternative)"
    4001 = "Backend API (Dev)"
    4002 = "Backend API (SIT/Staging)"
    4004 = "Backend API (Dev Alternative)"
    4005 = "Backend API (Dev Alternative)"
    5432 = "PostgreSQL (Default)"
    5433 = "PostgreSQL (Production)"
    5434 = "PostgreSQL (SIT/Staging)"
    5437 = "PostgreSQL (Dev)"
    8080 = "Backend API (Internal)"
    8090 = "Frontend (SIT/Staging)"
    8443 = "HTTPS (Alternative)"
}

function Get-PortInfo {
    param([int]$Port)
    
    try {
        $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | 
            Where-Object { $_.State -eq "Listen" }
        
        if ($connections) {
            $processes = $connections | ForEach-Object {
                $proc = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
                [PSCustomObject]@{
                    Port = $Port
                    ProcessName = if ($proc) { $proc.ProcessName } else { "Unknown" }
                    PID = $_.OwningProcess
                    State = $_.State
                    LocalAddress = $_.LocalAddress
                    Description = if ($commonDevPorts.ContainsKey($Port)) { $commonDevPorts[$Port] } else { "" }
                }
            }
            return $processes
        }
    } catch {
        return $null
    }
}

function Show-AllPorts {
    Write-Header "`n╔════════════════════════════════════════════════════════════════════════╗"
    Write-Header "║                    All Listening Ports                                ║"
    Write-Header "╚════════════════════════════════════════════════════════════════════════╝"
    Write-Host ""
    
    try {
        $allConnections = Get-NetTCPConnection -State Listen -ErrorAction Stop | 
            Where-Object { $_.LocalPort -ne 0 } |
            Sort-Object LocalPort | 
            Select-Object -Unique LocalPort
        
        $portCount = ($allConnections | Measure-Object).Count
        Write-Info "Found $portCount listening ports`n"
        
        $results = @()
        foreach ($port in $allConnections) {
            $portInfo = Get-PortInfo -Port $port
            if ($portInfo) {
                $results += $portInfo
            }
        }
        
        if ($results.Count -gt 0) {
            $results | Format-Table -AutoSize -Property @(
                @{Label="Port"; Expression={$_.Port}},
                @{Label="Process"; Expression={$_.ProcessName}},
                @{Label="PID"; Expression={$_.PID}},
                @{Label="Description"; Expression={if($_.Description) {$_.Description} else {"-"}}}
            )
        } else {
            Write-Warning "No listening ports found"
        }
        
    } catch {
        Write-Error "Error getting port information: $($_.Exception.Message)"
    }
}

function Show-SpecificPorts {
    param([int[]]$PortNumbers)
    
    Write-Header "`n╔════════════════════════════════════════════════════════════════════════╗"
    Write-Header "║                    Checking Specific Ports                              ║"
    Write-Header "╚════════════════════════════════════════════════════════════════════════╝"
    Write-Host ""
    
    $results = @()
    foreach ($port in $PortNumbers) {
        $portInfo = Get-PortInfo -Port $port
        if ($portInfo) {
            $results += $portInfo
            Write-Success "Port $port is IN USE"
        } else {
            Write-Warning "Port $port is AVAILABLE"
            $results += [PSCustomObject]@{
                Port = $port
                ProcessName = "Available"
                PID = "-"
                State = "-"
                LocalAddress = "-"
                Description = if ($commonDevPorts.ContainsKey($port)) { $commonDevPorts[$port] } else { "" }
            }
        }
    }
    
    if ($results.Count -gt 0) {
        $results | Format-Table -AutoSize -Property @(
            @{Label="Port"; Expression={$_.Port}},
            @{Label="Status"; Expression={if($_.ProcessName -eq "Available") {"AVAILABLE"} else {"IN USE"}}},
            @{Label="Process"; Expression={$_.ProcessName}},
            @{Label="PID"; Expression={$_.PID}},
            @{Label="Description"; Expression={if($_.Description) {$_.Description} else {"-"}}}
        )
    }
}

function Show-CommonDevPorts {
    Write-Header "`n╔════════════════════════════════════════════════════════════════════════╗"
    Write-Header "║              Common Development Ports Status                           ║"
    Write-Header "╚════════════════════════════════════════════════════════════════════════╝"
    Write-Host ""
    
    $results = @()
    foreach ($port in $commonDevPorts.Keys | Sort-Object) {
        $portInfo = Get-PortInfo -Port $port
        if ($portInfo) {
            $results += $portInfo
        } else {
            $results += [PSCustomObject]@{
                Port = $port
                ProcessName = "Available"
                PID = "-"
                State = "-"
                LocalAddress = "-"
                Description = $commonDevPorts[$port]
            }
        }
    }
    
    if ($results.Count -gt 0) {
        $results | Format-Table -AutoSize -Property @(
            @{Label="Port"; Expression={$_.Port}},
            @{Label="Status"; Expression={if($_.ProcessName -eq "Available") {"AVAILABLE"} else {"IN USE"}}},
            @{Label="Process"; Expression={$_.ProcessName}},
            @{Label="PID"; Expression={$_.PID}},
            @{Label="Description"; Expression={$_.Description}}
        )
    }
}

function Show-FilteredPorts {
    param([string]$SearchFilter)
    
    Write-Header "`n╔════════════════════════════════════════════════════════════════════════╗"
    Write-Header "║              Filtered Ports (Search: '$SearchFilter')                  ║"
    Write-Header "╚════════════════════════════════════════════════════════════════════════╝"
    Write-Host ""
    
    try {
        $allConnections = Get-NetTCPConnection -State Listen -ErrorAction Stop | 
            Where-Object { $_.LocalPort -ne 0 } |
            Sort-Object LocalPort | 
            Select-Object -Unique LocalPort
        
        $results = @()
        foreach ($port in $allConnections) {
            $portInfo = Get-PortInfo -Port $port
            if ($portInfo) {
                $match = $false
                foreach ($info in $portInfo) {
                    if ($info.ProcessName -like "*$SearchFilter*" -or 
                        $info.Description -like "*$SearchFilter*" -or
                        $info.Port -eq $SearchFilter) {
                        $match = $true
                        break
                    }
                }
                if ($match) {
                    $results += $portInfo
                }
            }
        }
        
        if ($results.Count -gt 0) {
            $results | Format-Table -AutoSize -Property @(
                @{Label="Port"; Expression={$_.Port}},
                @{Label="Process"; Expression={$_.ProcessName}},
                @{Label="PID"; Expression={$_.PID}},
                @{Label="Description"; Expression={if($_.Description) {$_.Description} else {"-"}}}
            )
        } else {
            Write-Warning "No ports found matching filter: $SearchFilter"
        }
        
    } catch {
        Write-Error "Error filtering ports: $($_.Exception.Message)"
    }
}

# Main execution
Write-Host "`n" -NoNewline
Write-Host "╔════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                    Port Checker Tool                                  ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if running as administrator (optional, for better results)
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Warning "Note: Running without administrator privileges. Some ports may not be visible."
    Write-Host ""
}

# Execute based on parameters
if ($Ports.Count -gt 0) {
    Show-SpecificPorts -PortNumbers $Ports
} elseif ($Filter -ne "") {
    Show-FilteredPorts -SearchFilter $Filter
} elseif ($ShowAll) {
    Show-AllPorts
} else {
    # Default: Show common development ports
    Show-CommonDevPorts
    
    Write-Host ""
    Write-Info "Usage Examples:"
    Write-Info "  .\check-ports.ps1                    # Show common dev ports (default)"
    Write-Info "  .\check-ports.ps1 -ShowAll          # Show all listening ports"
    Write-Info "  .\check-ports.ps1 -Ports 3000,4001  # Check specific ports"
    Write-Info "  .\check-ports.ps1 -Filter node      # Filter by process name"
    Write-Host ""
}

# Summary
Write-Host ""
Write-Info "Quick Commands:"
Write-Info "  Get-NetTCPConnection -State Listen | Select-Object LocalPort, OwningProcess | Sort-Object LocalPort"
Write-Info "  netstat -ano | findstr LISTENING"
Write-Host ""

