# Deployment Guide & Architecture

CineCast TV supports two deployment architectures:
1. **Mode A: Local Windows Deployment (Primary Mode)**
2. **Mode B: Optional Self-Hosted Docker Deployment**

---

## 1. Mode A: Local Windows Deployment (Primary)

Local execution is the recommended mode for personal media management.

### Characteristics:
- Runs natively on Windows 11.
- Operates entirely on `127.0.0.1` (localhost).
- Files are saved directly to local storage disks or mapped USB flash drives.
- Zero network exposure, zero telemetry, and zero third-party cloud uploads.
- Hardware-accelerated encoding via NVENC / Intel QSV where supported by local FFmpeg.

### Management Scripts:
- `install.bat`: One-time setup of Python `.venv`, npm modules, and Vite build.
- `start.bat`: Starts the FastAPI server and opens browser.
- `stop.bat`: Safely shuts down only the CineCast TV server without touching other Python processes.
- `update.bat`: Pulls latest code, preserves user data, and updates dependencies.

---

## 2. Mode B: Self-Hosted Docker Deployment

For users operating a private home server (e.g. Unraid, TrueNAS SCALE, Synology NAS, or an Ubuntu media server).

### Running with Docker Compose:
```bash
docker compose up -d --build
```

### Volumes & Data Persistence:
- `./downloads:/app/downloads`: Storage mount where completed TV-ready MP4 files are stored.
- `./backend_data:/app/backend_data`: Persistent storage for application settings and download history.

### Verifying Container Health:
```bash
docker compose ps
docker compose logs -f
```

---

## 3. Remote Hosting Limitations & Security Constraints

### Important Hosting Limitations:
1. **GitHub Pages Cannot Host the Downloader**:
   - GitHub Pages only serves static client assets (HTML/CSS/JS).
   - Media stream analysis, YouTube format extraction, and FFmpeg transcoding require a persistent server backend.
2. **Serverless Functions Are Unsuitable**:
   - Platforms like Vercel or Netlify enforce strict execution timeouts (10-60s) and read-only filesystems.
   - Downloading large 1080p/4K video streams and running FFmpeg transcoding requires sustained compute and disk I/O.

### Security Best Practices for Remote Deployment:
If you expose the container outside your local network (e.g., via Tailscale, Cloudflare Tunnels, or reverse proxy):
- **Authentication**: Place the instance behind a reverse proxy (e.g. Nginx, Caddy, Traefik) with HTTP Basic Auth, Authelia, or OAuth.
- **SSRF Prevention**: The backend strictly validates URLs against permitted YouTube watch/share patterns and rejects non-HTTP schemes or private IP ranges.
- **Path Traversal Guards**: The backend sanitizes all filenames and checks output destinations using `Path.resolve()` boundaries.
- **Storage Quotas**: Configure storage drive limits in Settings to avoid filling host volumes.
- **Bandwidth**: YouTube limits download rates; set maximum concurrent tasks to 2-3 to avoid IP throttling.
