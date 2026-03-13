@echo off
title DDS - Digital Defence System Launcher
color 0A

echo.
echo ========================================
echo   DDS - DIGITAL DEFENCE SYSTEM
echo   Complete Cybersecurity Platform
echo ========================================
echo.

echo [1/3] Checking MongoDB...
sc query MongoDB | find "RUNNING" >nul
if %errorlevel% neq 0 (
    echo MongoDB is not running. Starting MongoDB...
    net start MongoDB
    timeout /t 3 >nul
) else (
    echo MongoDB is already running!
)

echo.
echo [2/3] Starting Backend Server...
cd backend
start "DDS Backend Server" cmd /k "npm start"
timeout /t 5 >nul

echo.
echo [3/3] Starting Frontend Server...
cd ../frontend
start "DDS Frontend Server" cmd /k "python -m http.server 8080"
timeout /t 3 >nul

echo.
echo ========================================
echo   DDS SYSTEM STARTED SUCCESSFULLY!
echo ========================================
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://127.0.0.1:8080
echo.
echo Opening browser...
timeout /t 2 >nul
start http://127.0.0.1:8080

echo.
echo Press any key to exit this window...
echo (Backend and Frontend will continue running)
pause >nul
