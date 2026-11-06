@echo off
setlocal enabledelayedexpansion
title CineCast TV - Personal Media Downloader
echo ======================================================================
echo    CineCast TV - Personal Video Downloader & TV Media Manager
echo ======================================================================
echo.

cd /d "%~dp0"

:: Check if port 8000 is already occupied
for /f "tokens=5" %%a in ('netstat -aon ^| findstr /r ":8000.*LISTENING"') do (
    set OCCUPIED_PID=%%a
)
if defined OCCUPIED_PID (
    echo [NOTICE] An application is already running on port 8000 (PID: !OCCUPIED_PID!).
    echo Opening browser to http://127.0.0.1:8000 ...
    start http://127.0.0.1:8000
    echo If you wish to restart it, run stop.bat first.
    echo.
    pause
    exit /b 0
)

:: Select Python interpreter (.venv preferred)
set "PY_CMD=python"
if exist ".venv\Scripts\python.exe" (
    set "PY_CMD=.venv\Scripts\python.exe"
    echo Using isolated virtual environment: .venv
)

echo Starting CineCast TV Application on http://127.0.0.1:8000 ...
echo Mode: Production SPA + FastAPI Media Server + WebSocket Engine
echo.

:: Launch the server using PowerShell to capture PID reliably
for /f %%p in ('powershell -Command "(Start-Process -FilePath '!PY_CMD!' -ArgumentList '-m uvicorn backend.main:app --host 127.0.0.1 --port 8000' -PassThru).Id"') do (
    set "SERVER_PID=%%p"
)

if not defined SERVER_PID (
    echo [ERROR] Failed to start server process!
    pause
    exit /b 1
)

echo !SERVER_PID! > .server.pid
echo Server started successfully with Process ID: !SERVER_PID!
echo Application URL: http://127.0.0.1:8000
echo.
echo Launching your web browser...
timeout /t 2 /nobreak >nul
start http://127.0.0.1:8000

echo ======================================================================
echo    CineCast TV is running in the background.
echo    - Open http://127.0.0.1:8000 in your browser anytime.
echo    - To cleanly stop the server, run: stop.bat
echo ======================================================================
echo.
pause

