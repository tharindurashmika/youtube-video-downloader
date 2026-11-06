# CineCast TV — System Architecture

This document describes the architectural design, component interactions, and data flows of **CineCast TV** (Personal Video Downloader & TV Media Manager).

---

## 1. Architectural Overview

CineCast TV is architected as an offline-friendly, modular full-stack application designed specifically for local execution on Windows 11 with optional containerized deployment.

```
+-----------------------------------------------------------------------------------+
|                                  USER BROWSER                                     |
|  +-----------------------------------------------------------------------------+  |
|  |                 React 18 + TypeScript + Tailwind CSS UI                     |  |
|  |   - URL Analyzer Component           - Quality & Format Matrix              |  |
|  |   - TV Compatibility Calculator      - Live Queue & WebSocket Stream        |  |
|  |   - Media Library & Player Modal     - System & Diagnostic Settings         |  |
|  +---------------------------------------+-------------------------------------+  |
+------------------------------------------|----------------------------------------+
                                           | HTTP REST / WebSocket (/ws/progress)
                                           v
+-----------------------------------------------------------------------------------+
|                             FASTAPI BACKEND SERVICE                               |
|                                                                                   |
|  +---------------------+   +---------------------+   +-------------------------+  |
|  |  URL Analyzer Svc   |   | Download Manager    |   |  FFmpeg Media Engine    |  |
|  |  (yt-dlp metadata)  |   | (Asyncio Semaphore) |   |  - Media Probe          |  |
|  +---------------------+   +----------+----------+   |  - Lossless Remuxer     |  |
|                                       |              |  - H.264/AAC Transcoder |  |
|                                       v              +------------+------------+  |
|                            +---------------------+                |               |
|                            | Background Worker   |<---------------+               |
|                            +----------+----------+                                |
|                                       |                                           |
|                                       v                                           |
|                            +---------------------+                                |
|                            | SQLite Database     | (Settings & Download History)  |
|                            +---------------------+                                |
+-----------------------------------------------------------------------------------+
                                        |
                                        v
                 +-----------------------------------------------+
                 |              LOCAL DISK STORAGE               |
                 |  - downloads/     (Final TV-compatible MP4)   |
                 |  - temp_downloads/ (Staging chunks)           |
                 +-----------------------------------------------+
```

---

## 2. Core Subsystems

### A. URL Analysis & Resolution Synthesizer (`backend/services/analyzer.py`)
- Employs `yt_dlp.YoutubeDL({'extract_flat': False, 'skip_download': True})` to extract complete format arrays without initiating downloads.
- Separates video-only streams, audio-only streams, and progressive streams.
- Dynamically maps extracted streams into standard television tiers:
  - 4K UHD (`2160p`)
  - 2K QHD (`1440p`)
  - Full HD (`1080p`)
  - HD (`720p`)
  - SD (`480p`, `360p`)
- Calculates file size estimates by summing matching video and high-bitrate audio streams.
- Performs pre-flight evaluation of TV compatibility for each stream.

### B. TV Compatibility Engine (`backend/media/tv_profiles.py` & `ffmpeg_manager.py`)
Consumer Smart TVs have strict hardware decoder specifications when playing files from USB drives:
- **Container**: MP4
- **Video Codec**: H.264 / AVC (Profile High/Main, Level <= 4.2)
- **Pixel Format**: Strict `yuv420p` (10-bit or 4:4:4 formats cause black screen errors on TVs)
- **Audio Codec**: AAC-LC (Stereo, 192kbps)
- **Fast-Start**: `-movflags +faststart` places the `moov` atom at the file beginning for instantaneous seek and playback.

#### Smart Decision Matrix:
1. **Case A (Direct Stream Copy)**: If the video is already H.264/yuv420p and audio is AAC, it runs `ffmpeg -c copy -movflags +faststart`. Processing completes in ~2 seconds with zero generational quality loss.
2. **Case B (Video Copy + Audio Transcode)**: If video is H.264 but audio is Opus/WebM, it runs `ffmpeg -c:v copy -c:a aac -b:a 192k -movflags +faststart`. Video is preserved 100% losslessly.
3. **Case C (Full TV Transcode)**: If video is VP9 or AV1, it encodes via `libx264 -pix_fmt yuv420p -crf 20 -preset fast -c:a aac -b:a 192k -movflags +faststart`.

### C. Download Queue & Concurrency Controller (`backend/downloader/download_manager.py`)
- Background queue driven by `asyncio.Queue` and throttled via `asyncio.Semaphore(max_concurrent)`.
- yt-dlp download hooks report byte progression, speed, and ETA.
- Broadcasts real-time events over WebSocket to all connected browser clients.
- Clean cancellation and pause/resume logic: preserves `.part` files so paused downloads resume without re-downloading existing chunks.

### D. Persistent Storage (`backend/database/db.py`)
- SQLite database storing:
  - `downloads` table: IDs, URLs, titles, resolutions, codecs, file paths, TV compatibility scores, completion timestamps.
  - `settings` table: directories, default profiles, concurrency settings, and FFmpeg binary paths.
