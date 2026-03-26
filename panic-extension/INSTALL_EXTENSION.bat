@echo off
echo ========================================
echo   DDS Panic Button Extension Installer
echo ========================================
echo.
echo Step 1: Chrome extensions page khul rahi hai...
start chrome "chrome://extensions/"
echo.
echo Step 2: Yeh karo:
echo   1. "Developer mode" toggle ON karo (top-right)
echo   2. "Load unpacked" button click karo
echo   3. Yeh folder select karo:
echo      %~dp0
echo.
echo Extension folder path:
echo %~dp0
echo.
pause
