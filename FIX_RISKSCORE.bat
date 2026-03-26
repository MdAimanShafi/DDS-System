@echo off
echo ========================================
echo    DDS - RiskScore Error Fix
echo ========================================
echo.

cd /d "%~dp0backend"

echo [1/3] Cleaning up database...
node cleanup.js

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Cleanup failed!
    echo Make sure MongoDB is running.
    pause
    exit /b 1
)

echo.
echo ========================================
echo    Fix Complete!
echo ========================================
echo.
echo [SUCCESS] Database cleaned successfully!
echo.
echo Next steps:
echo 1. Start server: node server.js
echo 2. Register new user
echo 3. Login and test
echo.
echo ========================================
pause
