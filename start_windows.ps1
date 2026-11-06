# Windows 11 PowerShell Launcher for CineCast TV Media Manager
$ErrorActionPreference = "Stop"

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "   CineCast TV - Personal Video Downloader & TV Media Manager" -ForegroundColor White
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# Check Python
try {
    $pyVer = python --version 2>&1
    Write-Host "[1/3] Python detected: $pyVer" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Python was not found in PATH. Please install Python 3.10+." -ForegroundColor Red
    Read-Host "Press Enter to exit..."
    exit 1
}

# Check FFmpeg
Write-Host "[2/3] Checking FFmpeg engine..." -ForegroundColor Yellow
python -c "from backend.media.ffmpeg_manager import check_ffmpeg_health; h = check_ffmpeg_health(); print('FFmpeg detected at: ' + str(h['path'])) if h['installed'] else print('[NOTICE] FFmpeg not found in standard PATH. You can set the path in application Settings.')"

Write-Host ""
Write-Host "[3/3] Launching CineCast TV on http://127.0.0.1:8000..." -ForegroundColor Cyan
Start-Process "http://127.0.0.1:8000"

python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000

