@echo off
setlocal enabledelayedexpansion
title CineCast TV - Updater
echo ======================================================================
echo    CineCast TV - Repository & Dependency Updater
echo ======================================================================
echo.

cd /d "%~dp0"

echo [WARNING]
echo This script pulls the latest version of CineCast TV from GitHub
echo and updates both Python and Frontend dependencies.
echo.
echo Preserved Data:
echo   - Your local downloaded videos in "downloads/" are NOT modified.
echo   - Your personal download history and SQLite settings are preserved.
echo.
set /p CONFIRM="Are you sure you want to proceed with update? (Y/N): "
if /i not "%CONFIRM%"=="Y" (
    echo Update aborted by user.
    pause
    exit /b 0
)

echo.
echo [1/4] Checking Git repository status...
where git >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Git is not installed or not in PATH. Please update manually.
    pause
    exit /b 1
)

:: Pull latest changes
echo [2/4] Pulling latest code changes from origin main...
git pull origin main
if %errorlevel% neq 0 (
    echo [WARNING] Git pull reported conflicts or failed. Check git status.
)

:: Update Python packages
echo [3/4] Updating Python dependencies...
if exist ".venv\Scripts\python.exe" (
    call .venv\Scripts\pip.exe install --quiet --upgrade -r requirements.txt
) else (
    call pip install --quiet --upgrade -r requirements.txt
)
echo       Python packages updated.

:: Update Frontend packages and rebuild dist
echo [4/4] Updating and rebuilding Frontend bundle...
if exist "frontend" (
    cd frontend
    call npm install --silent
    call npm run build
    cd ..
    echo       Frontend bundle updated successfully in frontend\dist.
)

echo.
echo ======================================================================
echo    SUCCESS: CineCast TV has been updated to the latest version!
echo ======================================================================
echo.
echo Run start.bat to start the updated application.
echo.
pause
