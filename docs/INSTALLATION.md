# Installation Guide

This guide covers installing and setting up **CineCast TV** on Windows 11.

---

## 1. Prerequisites

Before installing, ensure your system has:
1. **Python 3.10, 3.11, or 3.12**: Download from [python.org](https://www.python.org/downloads/).
   > **Important**: Check the box **"Add python.exe to PATH"** during setup.
2. **Node.js 18+ (LTS)**: Download from [nodejs.org](https://nodejs.org/).
3. **FFmpeg Engine**: Required for merging audio/video streams and encoding files for TV compatibility.

---

## 2. Installing FFmpeg on Windows 11

Choose any of the following methods:

### Method A: Via Windows Package Manager (Winget — Recommended)
Open PowerShell and run:
```powershell
winget install Gyan.FFmpeg
```
Restart your terminal after installation so `ffmpeg` is loaded into PATH.

### Method B: Via Scoop
```powershell
scoop install ffmpeg
```

### Method C: Manual ZIP Download
1. Download the release build from [gyan.dev](https://www.gyan.dev/ffmpeg/builds/).
2. Extract to `C:\ffmpeg`.
3. Add `C:\ffmpeg\bin` to your Windows System Environment Variables `PATH`.
4. Alternatively, paste `C:\ffmpeg\bin\ffmpeg.exe` directly into CineCast TV's **Settings** tab.

---

## 3. Automated Installation (One-Click)

1. Clone or download the repository:
   ```cmd
   git clone https://github.com/<your-username>/personal-video-downloader.git
   cd personal-video-downloader
   ```
2. Double-click **`install.bat`**.

The automated script will:
- Validate Python and Node.js.
- Create an isolated `.venv` virtual environment.
- Install all backend dependencies from `requirements.txt`.
- Install frontend dependencies and build production assets into `frontend/dist`.
- Run automated tests to verify your environment.

---

## 4. Manual Installation

If you prefer to configure manually:

### Step 1: Create Virtual Environment
```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

### Step 2: Install Python Packages
```powershell
pip install -r requirements.txt
```

### Step 3: Install & Build Frontend
```powershell
cd frontend
npm install
npm run build
cd ..
```

### Step 4: Run Verification Tests
```powershell
python -m unittest backend/tests/test_units.py
```

---

## 5. Starting the Application

Run:
```cmd
start.bat
```
Or with PowerShell:
```powershell
.\start_windows.ps1
```
The application will open automatically at **`http://127.0.0.1:8000`**.
