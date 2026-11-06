@echo off
title CineCast TV - Personal Video Downloader & TV Media Manager
echo ======================================================================
echo    CineCast TV - Personal Video Downloader & TV Media Manager
echo ======================================================================
echo.

cd /d "%~dp0"

echo [1/3] Checking Python runtime...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not found in PATH. Please install Python 3.10+ from python.org.
    pause
    exit /b 1
)

echo [2/3] Checking FFmpeg engine...
python -c "from backend.media.ffmpeg_manager import check_ffmpeg_health; h = check_ffmpeg_health(); print('FFmpeg detected at: ' + str(h['path'])) if h['installed'] else print('[NOTICE] FFmpeg not found in standard PATH. You can set the path in application Settings.')"

echo.
echo [3/3] Starting backend server on http://127.0.0.1:8000...
echo The application will open in your browser automatically.
echo Press Ctrl+C in this console to stop the server anytime.
echo.

start http://127.0.0.1:8000
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
pause

