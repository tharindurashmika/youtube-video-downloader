# Windows 11 Complete Setup & USB Media Workflow

This document provides a guide for using CineCast TV on Windows 11 and transferring downloaded media to your Smart TV via USB.

---

## 1. Quick Setup Workflow

```
[1. Double-click install.bat] ────> [2. Double-click start.bat] ────> [3. Paste URL & Download] ────> [4. Copy to USB Drive]
```

### Script Reference:
| Script | Purpose |
|---|---|
| `install.bat` | Installs `.venv` Python packages, installs npm dependencies, builds frontend assets, runs tests. |
| `start.bat` | Launches backend server, binds to port 8000, opens your default browser. |
| `stop.bat` | Targets only CineCast TV (PID from `.server.pid` or port 8000) and cleanly shuts it down. |
| `update.bat` | Performs non-destructive git pull, re-compiles dependencies while preserving downloads and database. |

---

## 2. Preparing a USB Drive for Smart TV Playback

To ensure your television reads your USB storage drive properly:

### Step 1: Format the USB Drive
1. Insert your USB flash drive into your Windows 11 PC.
2. Open **File Explorer**, right-click the USB drive &rarr; **Format...**
3. Select the file system based on your TV model:
   - **exFAT (Recommended)**: Supported by modern Samsung (2017+), LG (webOS 3.5+), and Sony Android TVs. Supports video files larger than 4GB.
   - **FAT32**: Universal compatibility across almost all older televisions; however, single files cannot exceed 4GB.
   - **NTFS**: Supported by most Samsung and LG TVs; partial or read-only on some Android TVs.
4. Set Allocation Unit Size to **Default** and click **Start**.

### Step 2: Download Videos Using "Universal TV Mode"
1. In CineCast TV, paste your authorized video link.
2. Under TV Compatibility Mode, keep **Universal TV Compatibility** selected.
3. Click **Download & Prepare for TV**.
4. Once completed, navigate to the **TV Library** tab and click **Folder** (or "Open containing folder").
5. Copy the `.mp4` file directly into your USB flash drive root or a `Videos/` folder.

### Step 3: Connect to Television
1. Safely eject the USB drive from Windows (*Right-click tray icon &rarr; Safely Remove Hardware*).
2. Insert into the USB port of your TV (prefer ports labeled `USB HDD` or `5V 1A` if using an external hard drive).
3. Use your TV remote to open the media player app (e.g. *Source &rarr; USB* on Samsung, *Photo & Video* on LG).
4. Enjoy instant playback with stereo sound and smooth seeking.
