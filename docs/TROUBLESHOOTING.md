# Troubleshooting Guide

Common issues, diagnostics, and step-by-step solutions for CineCast TV.

---

## 1. FFmpeg Not Detected

### Symptom:
A yellow badge showing "FFmpeg Missing" appears in the navigation bar or diagnostics tab.

### Solution:
1. If you already have FFmpeg installed somewhere on your disk:
   - Go to the **Settings** tab.
   - Enter the full path in **FFmpeg Executable Binary Path** (e.g., `C:\ffmpeg\bin\ffmpeg.exe` or `C:\Program Files\ffmpeg\bin\ffmpeg.exe`).
   - Click **Save Settings**, then click **Re-check FFmpeg**.
2. If FFmpeg is not installed:
   - Open PowerShell as Administrator and run:
     ```powershell
     winget install Gyan.FFmpeg
     ```
   - Restart the terminal and restart the application using `start.bat`.

---

## 2. Port 8000 Conflict / Already in Use

### Symptom:
`start.bat` reports that another process is occupying port 8000.

### Solution:
1. Double-click `stop.bat` to terminate any previous instance.
2. If another application (e.g. an existing web server) uses port 8000:
   - Edit `.env` or set the port before starting:
     ```powershell
     python -m uvicorn backend.main:app --host 127.0.0.1 --port 8080
     ```

---

## 3. Video Fails with "Private video" or "Video unavailable"

### Causes:
- The video is set to private on YouTube.
- The video is region-restricted or age-restricted (requiring account login).
- The URL contains invalid characters or a playlist reference without a video ID.

### Solution:
- Verify that the video plays in an incognito browser window without requiring user sign-in.
- Ensure the URL format is:
  - `https://www.youtube.com/watch?v=VIDEO_ID`
  - `https://youtu.be/VIDEO_ID`
  - `https://www.youtube.com/shorts/VIDEO_ID`

---

## 4. Video Plays on PC but Gives Black Screen on TV

### Causes:
1. **Pixel format is 10-bit (`yuv420p10le`) or 4:4:4**: Consumer Smart TVs fail on non-standard chroma subsampling.
2. **Codec is VP9/AV1 inside an MKV container**: Older TV USB media players only support AVC (H.264) in MP4.

### Solution:
- In the CineCast TV **TV Library** tab:
  1. Click **Specs** (Info icon) on the video item to inspect stream codecs.
  2. If the TV score is less than 100%, click **Convert to TV MP4**.
  3. CineCast TV will transcode the video stream into standard 8-bit `yuv420p` H.264 and AAC stereo audio with `+faststart`.

---

## 5. TV Says "Audio Format Not Supported"

### Causes:
- Modern YouTube streams frequently encode audio in Google Opus (`opus`) inside WebM containers. Most television hardware decoders only support AAC, MP3, or AC3.

### Solution:
- Always select **Universal TV Compatibility** mode before downloading. CineCast TV automatically detects Opus audio and transcodes only the audio track into standard AAC-LC (`192kbps`) while copying the video stream losslessly.
