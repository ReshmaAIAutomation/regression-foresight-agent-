# Pega.com Playwright Automation PowerShell Script
# This script installs dependencies and runs the automation

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Pega.com Playwright Automation" -ForegroundColor Cyan  
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
$nodeCheck = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCheck) {
    Write-Host "ERROR: Node.js is not installed!" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Node.js is installed:" -ForegroundColor Green
node --version
Write-Host ""

# Check if npm packages are installed
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing required packages..." -ForegroundColor Yellow
    npm install playwright
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to install npm packages" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Host ""
}

Write-Host "Starting Pega automation script..." -ForegroundColor Yellow
Write-Host ""

# Run the JavaScript version
& node pega-automation.js

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "====================================" -ForegroundColor Green
    Write-Host "Automation completed successfully!" -ForegroundColor Green
    Write-Host "====================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "====================================" -ForegroundColor Red
    Write-Host "ERROR: Automation failed!" -ForegroundColor Red
    Write-Host "====================================" -ForegroundColor Red
}

Write-Host ""
Read-Host "Press Enter to exit"
