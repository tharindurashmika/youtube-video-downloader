@echo off
setlocal enabledelayedexpansion
title CineCast TV - Process Terminator
echo ======================================================================
echo    CineCast TV - Safe Process Shutdown
echo ======================================================================
echo.

cd /d "%~dp0"
set "STOPPED=0"

:: 1. Try stopping via saved PID
if exist ".server.pid" (
    set /p SAVED_PID=<.server.pid
    set "SAVED_PID=!SAVED_PID: =!"
    if defined SAVED_PID (
        echo Checking saved Process ID: !SAVED_PID! ...
        tasklist /fi "PID eq !SAVED_PID!" 2>nul | findstr /i "!SAVED_PID!" >nul
        if %errorlevel% equ 0 (
            echo Stopping CineCast TV process (PID: !SAVED_PID!)...
            taskkill /f /pid !SAVED_PID! /t >nul 2>&1
            set "STOPPED=1"
        )
    )
    del /f /q ".server.pid" >nul 2>&1
)

:: 2. Check if port 8000 is still listening by any leftover instance
for /f "tokens=5" %%a in ('netstat -aon ^| findstr /r ":8000.*LISTENING"') do (
    set "PORT_PID=%%a"
    if defined PORT_PID (
        echo Detected instance listening on port 8000 (PID: !PORT_PID!).
        echo Stopping process !PORT_PID!...
        taskkill /f /pid !PORT_PID! /t >nul 2>&1
        set "STOPPED=1"
    )
)

echo.
if "!STOPPED!"=="1" (
    echo [SUCCESS] CineCast TV server has been stopped safely.
    echo Unrelated Python and Node.js processes were preserved.
) else (
    echo [INFO] No active CineCast TV server instances were found running.
)

echo.
pause
