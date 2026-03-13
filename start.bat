@echo off
echo ========================================
echo DDS - Digital Defence System
echo Quick Setup Script
echo ========================================
echo.

echo [1/3] Installing backend dependencies...
cd backend
call npm install
echo.

echo [2/3] Backend setup complete!
echo.

echo [3/3] Starting backend server...
echo.
echo ========================================
echo Server will start on http://localhost:5000
echo Open frontend/index.html in your browser
echo ========================================
echo.
call npm run dev
echo ========================================
echo.

call npm run dev
