# CineCast TV — Personal Video Downloader & TV Media Manager

A desktop-friendly web application designed to analyze, download authorized YouTube videos, select verified formats, and automatically prepare media files for seamless USB playback on Smart TVs.

Built for **Windows 11** with a clean dark-themed UI, real-time WebSocket progress, persistent SQLite download library, and an FFmpeg TV compatibility engine.

---

## 1. Key Features

- **Video URL Analysis**:
  - Deep inspection of video streams, codecs (H.264 / VP9 / AV1), and audio formats (AAC / Opus).
  - Shows actual stream availability (never fakes resolutions).
  - Calculates file size estimates and frame rates (30fps / 60fps).
- **Dynamic Quality & Format Selection**:
  - Dynamically lists true available resolutions: 4K (2160p), 2K (1440p), 1080p Full HD, 720p HD, 480p, 360p.
  - Multi-container support: MP4, MKV, WebM.
  - Optional audio-only extraction (`.mp3`, `.aac`, `.m4a`).
- **Dedicated TV Compatibility Mode**:
  - **Universal TV Compatibility (Recommended)**: MP4 container, H.264 / AVC video, AAC-LC stereo audio, strict `yuv420p` pixel format, and `+faststart` moov atom. Guaranteed compatibility with Samsung (Tizen), LG (webOS), Sony (Android TV), Roku, Hisense, and TCL.
  - **High Quality 4K**: Preserves up to 4K resolutions with H.264/HEVC encoding for modern HDR screens.
  - **Original Quality (Direct Stream)**: Retains raw downloaded YouTube streams without any re-encoding.
  - **Smart Lossless Remuxing**: If the video is already H.264, it copies the video losslessly (`-c:v copy`) and only converts audio if needed, taking mere seconds and preserving 100% video quality.
- **Download Queue Manager**:
  - Asynchronous background worker queue with concurrency controls.
  - Pause, Resume (using partial `.part` download recovery), Cancel, and Retry failed downloads.
  - Real-time progress updates via WebSockets: download percentage, speed (MB/s), ETA, and transferred bytes.
  - Duplicate download detection.
- **TV Media Library**:
  - Searchable catalog of downloaded videos with thumbnails, duration, resolutions, and file sizes.
  - "Open containing folder" (highlights file directly in Windows File Explorer).
  - "Play locally" (launches default Windows media player).
  - "Technical Media Inspection" (deep FFmpeg stream audit with TV compatibility checklist).
  - "Convert to TV Format" (one-click transcode/remux existing file to TV MP4).
- **Application Settings & Diagnostics**:
  - Auto-detection of system FFmpeg and yt-dlp engines.
  - Configurable download and temporary staging directories.
  - Real-time disk storage gauge and concurrency slider.

---

## 2. Architecture & Technology Stack

```
Local-Development/
├── backend/
│   ├── api/
│   │   └── routes.py              # REST API & WebSocket endpoints
│   ├── database/
│   │   └── db.py                  # SQLite schema & persistent queries
│   ├── downloader/
│   │   └── download_manager.py    # Async queue worker & yt-dlp hooks
│   ├── media/
│   │   ├── ffmpeg_manager.py      # Stream merging, probe & TV transcoding
│   │   └── tv_profiles.py         # TV compatibility rules & profiles
│   ├── models/
│   │   └── schemas.py             # Pydantic data validation schemas
│   ├── services/
│   │   └── analyzer.py            # Stream extraction & resolution matrix
│   ├── utils/
│   │   ├── sanitizer.py           # Filename & path security
│   │   └── url_validator.py       # YouTube endpoint validation
│   ├── tests/
│   │   └── test_units.py          # Automated test suite
│   ├── requirements.txt           # Python dependencies
│   └── main.py                    # FastAPI application entry point
├── frontend/
│   ├── src/
│   │   ├── components/            # UI Components (AnalyzeCard, MediaInfoModal, etc.)
│   │   ├── layouts/               # Main layout & navigation
│   │   ├── pages/                 # Dashboard, Downloads, Library, Settings
│   │   ├── services/              # API and WebSocket client
│   │   └── types/                 # TypeScript interfaces
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── downloads/                     # Completed media destination
├── temp_downloads/                # Staging chunks for merging/transcoding
├── run.bat                        # One-click Windows 11 launcher
├── start_windows.ps1              # PowerShell startup script
└── README.md
```

---

## 3. Quick Start (Windows 11)

### Option A: One-Click Launch (Recommended)
Double click **`run.bat`** (or right-click `start_windows.ps1` -> *Run with PowerShell*).

The script will:
1. Validate Python 3.10+ installation.
2. Auto-detect FFmpeg.
3. Start the FastAPI backend on `http://127.0.0.1:8000`.
4. Automatically open your default browser to the web app.

### Option B: Manual Startup

**1. Install Python Dependencies:**
```powershell
pip install -r requirements.txt
```

**2. Run the Application:**
```powershell
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```
Open **`http://127.0.0.1:8000`** in your web browser.

---

## 4. Development Mode (Hot Reloading)

If you wish to modify the React frontend with Vite hot-module replacement:

```powershell
# In terminal 1 (Backend)
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload

# In terminal 2 (Frontend)
cd frontend
npm run dev
```
Vite dev server will run on `http://localhost:5173` with automatic API and WebSocket proxying to port 8000.

To re-build the production assets served by FastAPI:
```powershell
cd frontend
npm run build
```

---

## 5. TV Compatibility Reference Guide

Smart TVs have strict hardware decoder limitations when reading media from USB storage drives:

| TV Platform | Recommended Container | Video Codec | Pixel Format | Audio Codec | Fast-Start (+faststart) |
|---|---|---|---|---|---|
| **Samsung Tizen** | MP4 | H.264 (AVC) / Level 4.2 | `yuv420p` (8-bit) | AAC-LC / 192k | Required |
| **LG webOS** | MP4 / MKV | H.264 / HEVC | `yuv420p` | AAC / AC3 | Recommended |
| **Sony Android TV** | MP4 / MKV | H.264 / HEVC | `yuv420p` | AAC / AC3 | Recommended |
| **Roku TV** | MP4 | H.264 | `yuv420p` | AAC-LC | Required |

> **Note on Pixel Format (`yuv420p`)**: Standard consumer Smart TVs only support 8-bit 4:2:0 chroma subsampling. Videos recorded with 10-bit color (`yuv420p10le`) or 4:4:4 color (`yuv444p`) will produce a black screen or "unsupported codec" error on TV USB ports. CineCast TV automatically forces `yuv420p` when Universal TV Mode is enabled.

---

## 6. Running Automated Tests

Run the backend unit test suite:
```powershell
python -m unittest backend\tests\test_units.py
```

Tests cover:
- URL validation and malicious link protection
- Windows filename sanitization and path traversal guards
- Smart TV compatibility analysis and decision matrix (lossless remux vs transcode)
- SQLite database CRUD operations and history tracking
- FFmpeg engine and codec capability detection

---

## 7. Troubleshooting

### 1. "FFmpeg Missing" in Settings or Header
- CineCast TV auto-scans standard Windows installation directories and PATH.
- If FFmpeg is not found, you can install it using Windows Package Manager:
  ```powershell
  winget install Gyan.FFmpeg
  ```
- Alternatively, paste the exact path to your `ffmpeg.exe` in the **Settings** page and click **Save Settings**.

### 2. Video Analysis Fails / "Video Unavailable"
- Verify the video is publicly accessible and does not require age confirmation or login credentials.
- Ensure the URL begins with `https://www.youtube.com/watch?v=...` or `https://youtu.be/...`.

### 3. Disk Space Warning
- 1080p and 4K video streams with high bitrates can range from several hundred megabytes to multiple gigabytes. Check the storage gauge on the Dashboard or change the download folder in Settings.

