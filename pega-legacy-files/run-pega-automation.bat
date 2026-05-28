@echo off
REM Pega.com Playwright Automation Batch Script
REM This script will install dependencies and run the automation

echo ====================================
echo Pega.com Playwright Automation
echo ====================================
echo.

REM Check if Node.js is installed
node --version > nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo Node.js is installed: 
node --version
echo.

REM Check if npm packages are installed
if not exist "node_modules" (
    echo Installing required packages...
    call npm install playwright
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install npm packages
        pause
        exit /b 1
    )
    echo.
)

echo Starting Pega automation script...
echo.

REM Run the JavaScript version
node pega-automation.js

if %errorlevel% equ 0 (
    echo.
    echo ====================================
    echo Automation completed successfully!
    echo ====================================
) else (
    echo.
    echo ====================================
    echo ERROR: Automation failed!
    echo ====================================
)

pause
