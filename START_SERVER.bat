@echo off
echo ========================================
echo Starting DDS Backend Server
echo ========================================
echo.

cd backend

echo Checking if port 5000 is free...
netstat -ano | findstr :5000 > nul
if %errorlevel% equ 0 (
    echo Port 5000 is in use. Killing process...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000') do (
        taskkill /F /PID %%a 2>nul
    )
    timeout /t 2 /nobreak > nul
)

echo.
echo Starting server on port 5000...
echo.
echo ========================================
echo Server is running!
echo Press Ctrl+C to stop
echo ========================================
echo.

node server.js

pause
