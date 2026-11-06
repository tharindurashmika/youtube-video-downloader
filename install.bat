@echo off
setlocal enabledelayedexpansion
title CineCast TV - Installer
echo ======================================================================
echo    CineCast TV - Automated Environment & Dependency Installer
echo ======================================================================
echo.

cd /d "%~dp0"

:: 1. Check Python
echo [1/6] Checking Python installation...
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH!
    echo Please install Python 3.10+ from https://www.python.org/
    echo Make sure to check "Add Python to PATH" during installation.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('python --version 2^>^&1') do set PY_VER=%%i
echo       Detected: !PY_VER!

:: 2. Check Node.js & npm
echo [2/6] Checking Node.js and npm...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm is not found in PATH!
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo       Detected Node: !NODE_VER!

:: 3. Check FFmpeg
echo [3/6] Checking FFmpeg audio/video engine...
python -c "from backend.media.ffmpeg_manager import check_ffmpeg_health; h = check_ffmpeg_health(); print('      Detected: ' + str(h['path'])) if h['installed'] else print('      [NOTICE] FFmpeg not found in standard PATH. You can configure custom path in Settings.')"

:: 4. Create or verify Python Virtual Environment
echo [4/6] Setting up Python virtual environment (.venv)...
if not exist ".venv" (
    echo       Creating virtual environment...
    python -m venv .venv
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create virtual environment!
        pause
        exit /b 1
    )
) else (
    echo       Virtual environment already exists.
)

echo       Installing/upgrading Python backend packages...
call .venv\Scripts\python.exe -m pip install --quiet --upgrade pip
call .venv\Scripts\pip.exe install --quiet -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install Python dependencies!
    pause
    exit /b 1
)
echo       Python packages installed successfully.

:: 5. Install & Build Frontend
echo [5/6] Building production frontend assets...
cd frontend
if not exist "node_modules" (
    echo       Installing npm dependencies...
    call npm install --silent
)
echo       Running Vite production build...
call npm run build
if %errorlevel% neq 0 (
    echo [WARNING] Frontend build failed. Vite dev server can still be used.
) else (
    echo       Frontend production bundle built successfully in frontend\dist.
)
cd ..

:: 6. Validate Installation
echo [6/6] Running system verification tests...
.venv\Scripts\python.exe -m unittest backend\tests\test_units.py
if %errorlevel% neq 0 (
    echo [WARNING] Some verification tests failed. Check logs above.
) else (
    echo.
    echo ======================================================================
    echo    SUCCESS: CineCast TV installation completed successfully!
    echo ======================================================================
    echo.
    echo To launch the application, run:
    echo     start.bat
    echo.
)

pause

