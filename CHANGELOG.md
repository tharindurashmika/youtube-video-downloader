# Changelog

All notable changes to **CineCast TV (Personal Video Downloader & TV Media Manager)** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-11-06

### Initial Production Release

#### Added
- **Dynamic Stream Extraction & URL Analysis**:
  - Full inspection of video and audio formats via yt-dlp.
  - Dynamically synthesizes resolution tiers: 4K UHD (`2160p`), 2K QHD (`1440p`), 1080p, 720p, 480p, 360p.
  - Precise file size estimation and frame rate detection (30fps / 60fps).
- **Dedicated Smart TV Compatibility Profiles**:
  - Universal TV Compatibility profile (MP4, H.264 / AVC, AAC stereo, strict `yuv420p`, and `+faststart` moov atom).
  - High Quality 4K profile (H.264 / HEVC) for modern HDR televisions.
  - Original Quality direct stream copy profile.
  - Smart lossless remuxing decision matrix: zero re-encoding when streams already match target TV profiles.
- **Asynchronous Background Queue Manager**:
  - Async queue worker with concurrency limits (`asyncio.Semaphore`).
  - Real-time download progress broadcasting over WebSockets (speed in MB/s, ETA, transferred/total bytes).
  - Task state control: Pause, Resume (via partial chunk preservation), Cancel, and Retry.
- **TV Media Library**:
  - Persistent catalog stored in local SQLite database.
  - One-click "Open Containing Folder" via Windows Explorer selection.
  - "Play Locally" launching the default system media player.
  - "Technical Media Inspection" modal detailing stream parameters with an interactive TV USB Compatibility Checklist.
  - Post-download TV format converter.
- **Settings & Environment Diagnostics**:
  - Automatic detection of FFmpeg and yt-dlp installations.
  - Configurable download and temporary staging directories.
  - Live storage disk allocation gauge.
- **Windows 11 Automation**:
  - `install.bat`: One-click environment bootstrap (.venv, dependencies, build, tests).
  - `start.bat`: Starts server, tracks PID in `.server.pid`, opens browser automatically.
  - `stop.bat`: Safely stops only CineCast TV without killing unrelated Python/Node processes.
  - `update.bat`: Non-destructive repository and dependency updater.
- **Deployment & CI/CD**:
  - Multi-stage `Dockerfile` and `docker-compose.yml`.
  - GitHub Actions workflows for Python backend testing/linting and Node frontend build verification.
