"""
FFmpeg Management & Media Processing Engine.
Handles stream copying, merging separate video/audio streams,
and TV-optimized transcoding.
"""
import os
import sys
import shutil
import subprocess
import re
import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional, Callable
from backend.database.db import get_setting
from backend.media.tv_profiles import analyze_stream_tv_compatibility

logger = logging.getLogger("ffmpeg_manager")

def find_system_ffmpeg() -> Optional[str]:
    # 1. Check database setting
    configured = get_setting("ffmpeg_path")
    if configured and os.path.exists(configured):
        return configured

    # 2. Check PATH
    in_path = shutil.which("ffmpeg")
    if in_path and os.path.exists(in_path):
        return in_path

    # 3. Known locations on Windows
    candidate_paths = [
        r"C:\Program Files (x86)\Airy Team\Airy\tools\ffmpeg.exe",
        r"C:\Program Files\ffmpeg\bin\ffmpeg.exe",
        r"C:\ffmpeg\bin\ffmpeg.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-*\bin\ffmpeg.exe"),
        os.path.expandvars(r"%USERPROFILE%\scoop\shims\ffmpeg.exe"),
        os.path.expandvars(r"%ProgramData%\chocolatey\bin\ffmpeg.exe"),
    ]

    for p in candidate_paths:
        if "*" in p:
            import glob
            matches = glob.glob(p)
            if matches and os.path.exists(matches[0]):
                return matches[0]
        elif os.path.exists(p):
            return p

    return None

def get_ffmpeg_binary() -> str:
    path = find_system_ffmpeg()
    return path if path else "ffmpeg"

_CACHED_HEALTH = None
_CACHED_HEALTH_TIME = 0.0

# H.264 encoders in order of preference. Software libx264 gives the best quality;
# hardware encoders are used when the FFmpeg build has no libx264 (e.g. some Windows builds).
_H264_CANDIDATES = ["libx264", "h264_nvenc", "h264_qsv", "h264_amf", "h264_mf"]
_ENCODER_CACHE: Dict[str, Optional[str]] = {}


def _encoder_works(ffmpeg_bin: str, encoder: str) -> bool:
    """Actually test-encodes a tiny clip, since an encoder can be listed but unusable (no GPU)."""
    try:
        proc = subprocess.run(
            [ffmpeg_bin, "-hide_banner", "-loglevel", "error", "-f", "lavfi",
             "-i", "color=c=black:s=256x256:d=0.2", "-c:v", encoder, "-pix_fmt", "yuv420p",
             "-f", "null", "-"],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=20
        )
        return proc.returncode == 0
    except Exception:
        return False


def detect_h264_encoder(ffmpeg_bin: Optional[str] = None) -> Optional[str]:
    """Returns the first working H.264 encoder name, or None if the FFmpeg build cannot encode H.264."""
    ffmpeg_bin = ffmpeg_bin or get_ffmpeg_binary()
    if ffmpeg_bin in _ENCODER_CACHE:
        return _ENCODER_CACHE[ffmpeg_bin]
    found = None
    for enc in _H264_CANDIDATES:
        if _encoder_works(ffmpeg_bin, enc):
            found = enc
            break
    _ENCODER_CACHE[ffmpeg_bin] = found
    return found


def h264_encode_args(crf: int = 20, preset: str = "fast") -> list:
    """Builds the video encoder arguments for the best available H.264 encoder."""
    enc = detect_h264_encoder()
    if enc is None:
        raise RuntimeError(
            "This FFmpeg build has no usable H.264 encoder (libx264 or GPU encoder). "
            "Install a full FFmpeg build: 'winget install Gyan.FFmpeg', then set its path in Settings."
        )
    if enc == "libx264":
        return ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", preset, "-crf", str(crf)]
    if enc == "h264_qsv":
        return ["-c:v", enc, "-pix_fmt", "nv12", "-global_quality", str(crf + 3)]
    return ["-c:v", enc, "-pix_fmt", "yuv420p", "-b:v", "8M"]


def check_ffmpeg_health(force_refresh: bool = False) -> Dict[str, Any]:
    global _CACHED_HEALTH, _CACHED_HEALTH_TIME
    import time
    now = time.time()
    if not force_refresh and _CACHED_HEALTH is not None and (now - _CACHED_HEALTH_TIME < 30.0):
        return _CACHED_HEALTH

    ffmpeg_bin = get_ffmpeg_binary()
    try:
        proc = subprocess.Popen([ffmpeg_bin, "-version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        stdout, _ = proc.communicate(timeout=10)
        if proc.returncode == 0:
            first_line = stdout.split("\n")[0] if stdout else "FFmpeg present"
            
            # Check encoder support
            enc_proc = subprocess.Popen([ffmpeg_bin, "-encoders"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            enc_out, _ = enc_proc.communicate(timeout=10)
            h264_encoder = detect_h264_encoder(ffmpeg_bin)
            has_h264 = h264_encoder is not None
            has_hevc = "libx265" in enc_out or "hevc" in enc_out
            has_aac = "aac" in enc_out
            has_nvenc = "nvenc" in enc_out

            result = {
                "installed": True,
                "path": ffmpeg_bin,
                "version": first_line,
                "features": {
                    "h264": has_h264,
                    "hevc": has_hevc,
                    "aac": has_aac,
                    "nvenc": has_nvenc
                },
                "status_text": (
                    f"FFmpeg is ready (H.264 encoder: {h264_encoder})."
                    if has_h264 else
                    "FFmpeg found, but it has NO usable H.264 encoder. Install a full build: winget install Gyan.FFmpeg"
                )
            }
            _CACHED_HEALTH = result
            _CACHED_HEALTH_TIME = now
            return result
    except Exception as e:
        logger.warning(f"FFmpeg check failed: {e}")

    result = {
        "installed": False,
        "path": ffmpeg_bin,
        "version": None,
        "features": {
            "h264": False,
            "hevc": False,
            "aac": False,
            "nvenc": False
        },
        "status_text": "FFmpeg was not detected. Please specify the path in Settings or install FFmpeg."
    }
    _CACHED_HEALTH = result
    _CACHED_HEALTH_TIME = now
    return result

def probe_file(file_path: str) -> Dict[str, Any]:
    """
    Probes media file metadata and TV compatibility using ffmpeg -i.
    Works even without ffprobe.exe!
    """
    if not os.path.exists(file_path):
        return {"error": "File does not exist"}

    ffmpeg_bin = get_ffmpeg_binary()
    try:
        proc = subprocess.run(
            [ffmpeg_bin, "-hide_banner", "-i", file_path],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=10
        )
        output = proc.stderr

        # Parse duration
        duration_match = re.search(r"Duration:\s*(\d+):(\d+):(\d+\.?\d*)", output)
        duration_secs = 0
        if duration_match:
            h, m, s = duration_match.groups()
            duration_secs = int(h) * 3600 + int(m) * 60 + int(float(s))

        # Parse bitrate
        bitrate_match = re.search(r"bitrate:\s*(\d+)\s*kb/s", output)
        bitrate_kbps = int(bitrate_match.group(1)) if bitrate_match else 0

        # Parse Video Stream
        video_streams = []
        audio_streams = []
        
        for line in output.split("\n"):
            line = line.strip()
            if "Stream #" in line:
                if "Video:" in line:
                    # e.g. Stream #0:0(und): Video: h264 (High) (avc1 / 0x31637661), yuv420p(tv, bt709), 1920x1080 [SAR 1:1 DAR 16:9], 2500 kb/s, 30 fps
                    parts = line.split("Video:")[1].split(",")
                    vcodec = parts[0].strip() if len(parts) > 0 else "unknown"
                    pix_fmt = parts[1].strip() if len(parts) > 1 else "unknown"
                    
                    # resolution search
                    res_match = re.search(r"(\d{3,4})x(\d{3,4})", line)
                    fps_match = re.search(r"(\d+(?:\.\d+)?)\s*fps", line)
                    
                    video_streams.append({
                        "codec": vcodec,
                        "pixel_format": pix_fmt,
                        "width": int(res_match.group(1)) if res_match else None,
                        "height": int(res_match.group(2)) if res_match else None,
                        "fps": float(fps_match.group(1)) if fps_match else None,
                        "raw_info": line
                    })
                elif "Audio:" in line:
                    # e.g. Stream #0:1(und): Audio: aac (LC) (mp4a / 0x6134706D), 44100 Hz, stereo, fltp, 128 kb/s
                    parts = line.split("Audio:")[1].split(",")
                    acodec = parts[0].strip() if len(parts) > 0 else "unknown"
                    hz = parts[1].strip() if len(parts) > 1 else "unknown"
                    channels = parts[2].strip() if len(parts) > 2 else "unknown"
                    
                    audio_streams.append({
                        "codec": acodec,
                        "sample_rate": hz,
                        "channels": channels,
                        "raw_info": line
                    })

        # Evaluate TV compatibility
        vcodec_simple = video_streams[0]["codec"].split()[0].lower() if video_streams else ""
        acodec_simple = audio_streams[0]["codec"].split()[0].lower() if audio_streams else ""
        container = Path(file_path).suffix.lstrip(".").lower()
        height = video_streams[0]["height"] if video_streams and video_streams[0]["height"] else 1080
        pix_fmt = video_streams[0]["pixel_format"].split()[0] if video_streams else ""

        tv_report = analyze_stream_tv_compatibility(
            video_codec=vcodec_simple,
            audio_codec=acodec_simple,
            container=container,
            resolution_height=height,
            target_profile="universal"
        )

        is_strictly_tv_ready = (
            ("h264" in vcodec_simple or "avc" in vcodec_simple) and
            ("aac" in acodec_simple or "mp4a" in acodec_simple) and
            ("yuv420p" in pix_fmt) and
            (container == "mp4")
        )

        file_stat = os.stat(file_path)

        return {
            "file_name": os.path.basename(file_path),
            "file_path": file_path,
            "file_size": file_stat.st_size,
            "duration": duration_secs,
            "bitrate_kbps": bitrate_kbps,
            "container": container,
            "video_streams": video_streams,
            "audio_streams": audio_streams,
            "tv_compatibility": {
                "score": 100 if is_strictly_tv_ready else tv_report.get("tv_compatibility_score", 70),
                "is_tv_ready": is_strictly_tv_ready,
                "badge": "TV USB Ready" if is_strictly_tv_ready else "Needs TV Optimization",
                "summary": "File is 100% compliant with standard Smart TV USB playback specs (H.264 / AAC / MP4)." if is_strictly_tv_ready else tv_report.get("summary"),
                "details": {
                    "container_compliant": container == "mp4",
                    "video_codec_compliant": "h264" in vcodec_simple or "avc" in vcodec_simple,
                    "audio_codec_compliant": "aac" in acodec_simple or "mp4a" in acodec_simple,
                    "pixel_format_compliant": "yuv420p" in pix_fmt
                }
            }
        }
    except Exception as e:
        logger.error(f"Probe file failed: {e}")
        return {"error": str(e), "file_path": file_path}

def convert_media_file(
    input_file: str,
    output_file: str,
    target_profile: str = "universal",
    custom_options: Optional[Dict[str, Any]] = None,
    progress_callback: Optional[Callable[[float, str], None]] = None
) -> bool:
    """
    Intelligently converts or remuxes a media file to the target TV profile.
    Checks whether re-encoding is strictly needed to save time & preserve maximum quality!
    """
    if not os.path.exists(input_file):
        raise FileNotFoundError(f"Input file not found: {input_file}")

    ffmpeg_bin = get_ffmpeg_binary()
    probe = probe_file(input_file)
    v_streams = probe.get("video_streams", [])
    a_streams = probe.get("audio_streams", [])
    
    vcodec = v_streams[0]["codec"].split()[0].lower() if v_streams else ""
    acodec = a_streams[0]["codec"].split()[0].lower() if a_streams else ""
    pix_fmt = v_streams[0]["pixel_format"].split()[0] if v_streams else ""
    duration = probe.get("duration", 0)

    is_h264 = "h264" in vcodec or "avc" in vcodec
    is_yuv420p = "yuv420p" in pix_fmt
    is_aac = "aac" in acodec or "mp4a" in acodec

    cmd = [ffmpeg_bin, "-y", "-i", input_file]

    if target_profile == "universal":
        # Video treatment
        if is_h264 and is_yuv420p:
            cmd.extend(["-c:v", "copy"])
        else:
            # Need h264 re-encode
            cmd.extend(h264_encode_args(crf=20, preset="fast"))

        # Audio treatment
        if is_aac:
            cmd.extend(["-c:a", "copy"])
        else:
            cmd.extend(["-c:a", "aac", "-b:a", "192k", "-ac", "2"])

        # Faststart for MP4
        cmd.extend(["-movflags", "+faststart"])

    elif target_profile == "high_quality":
        is_hevc = "hevc" in vcodec or "h265" in vcodec
        if (is_h264 or is_hevc) and is_yuv420p:
            cmd.extend(["-c:v", "copy"])
        else:
            cmd.extend(h264_encode_args(crf=18, preset="medium"))

        if is_aac or "ac3" in acodec:
            cmd.extend(["-c:a", "copy"])
        else:
            cmd.extend(["-c:a", "aac", "-b:a", "256k"])

        cmd.extend(["-movflags", "+faststart"])

    elif target_profile == "original":
        cmd.extend(["-c", "copy"])
        if output_file.lower().endswith(".mp4"):
            cmd.extend(["-movflags", "+faststart"])

    elif target_profile == "custom" and custom_options:
        v_opt = custom_options.get("video_codec", "h264")
        a_opt = custom_options.get("audio_codec", "aac")
        crf_opt = custom_options.get("crf", 20)

        if v_opt == "copy":
            cmd.extend(["-c:v", "copy"])
        elif v_opt == "hevc":
            cmd.extend(["-c:v", "libx265", "-crf", str(crf_opt), "-pix_fmt", "yuv420p"])
        else:
            cmd.extend(h264_encode_args(crf=int(crf_opt)))

        if a_opt == "copy":
            cmd.extend(["-c:a", "copy"])
        elif a_opt == "mp3":
            cmd.extend(["-c:a", "libmp3lame", "-b:a", "192k"])
        else:
            cmd.extend(["-c:a", "aac", "-b:a", "192k"])

        if custom_options.get("faststart", True) and output_file.lower().endswith(".mp4"):
            cmd.extend(["-movflags", "+faststart"])

    cmd.append(output_file)

    logger.info(f"Running conversion: {' '.join(cmd)}")
    if progress_callback:
        progress_callback(10.0, "Starting conversion / remuxing...")

    proc = subprocess.Popen(
        cmd,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        errors="replace",
    )

    # Track progress by reading stderr time=00:00:15.30
    time_regex = re.compile(r"time=(\d+):(\d+):(\d+\.?\d*)")
    stderr_tail = []
    for line in proc.stderr:
        stderr_tail.append(line.rstrip())
        stderr_tail = stderr_tail[-12:]
        m = time_regex.search(line)
        if m and duration > 0 and progress_callback:
            h, m_mins, s = m.groups()
            current_sec = int(h) * 3600 + int(m_mins) * 60 + float(s)
            percent = min(99.0, max(10.0, (current_sec / duration) * 90.0 + 10.0))
            progress_callback(percent, f"Converting for TV: {percent:.1f}%")

    proc.wait()
    if proc.returncode != 0:
        logger.error("FFmpeg failed: %s", "\n".join(stderr_tail))
        raise RuntimeError(
            f"FFmpeg conversion failed (code {proc.returncode}): " + " | ".join(stderr_tail[-3:])
        )

    if progress_callback:
        progress_callback(100.0, "Conversion complete.")
    return True

def merge_separate_streams(
    video_path: str,
    audio_path: str,
    output_path: str,
    tv_profile: str = "universal",
    progress_callback: Optional[Callable[[float, str], None]] = None
) -> bool:
    """
    Merges downloaded separate video and audio streams using FFmpeg.
    Optimizes for TV compatibility if profile is universal or high_quality.
    """
    ffmpeg_bin = get_ffmpeg_binary()
    
    probe_v = probe_file(video_path)
    probe_a = probe_file(audio_path)
    duration = max(probe_v.get("duration", 0), probe_a.get("duration", 0))

    v_streams = probe_v.get("video_streams", [])
    a_streams = probe_a.get("audio_streams", [])
    vcodec = v_streams[0]["codec"].split()[0].lower() if v_streams else ""
    acodec = a_streams[0]["codec"].split()[0].lower() if a_streams else ""
    pix_fmt = v_streams[0]["pixel_format"].split()[0] if v_streams else ""

    is_h264 = "h264" in vcodec or "avc" in vcodec
    is_yuv420p = "yuv420p" in pix_fmt
    is_aac = "aac" in acodec or "mp4a" in acodec

    cmd = [ffmpeg_bin, "-y", "-i", video_path, "-i", audio_path]

    if tv_profile == "universal":
        # Video: copy if h264/yuv420p, otherwise transcode
        if is_h264 and is_yuv420p:
            cmd.extend(["-c:v", "copy"])
        else:
            cmd.extend(h264_encode_args(crf=20, preset="fast"))

        # Audio: copy if aac, else transcode
        if is_aac:
            cmd.extend(["-c:a", "copy"])
        else:
            cmd.extend(["-c:a", "aac", "-b:a", "192k", "-ac", "2"])

        cmd.extend(["-movflags", "+faststart"])

    elif tv_profile == "original":
        cmd.extend(["-c", "copy"])
        if output_path.lower().endswith(".mp4"):
            cmd.extend(["-movflags", "+faststart"])

    else:
        # Default merge
        if is_h264:
            cmd.extend(["-c:v", "copy"])
        else:
            cmd.extend(h264_encode_args())

        if is_aac:
            cmd.extend(["-c:a", "copy"])
        else:
            cmd.extend(["-c:a", "aac", "-b:a", "192k"])

        if output_path.lower().endswith(".mp4"):
            cmd.extend(["-movflags", "+faststart"])

    cmd.append(output_path)
    logger.info(f"Merging streams: {' '.join(cmd)}")

    if progress_callback:
        progress_callback(5.0, "Merging video and audio streams...")

    proc = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        universal_newlines=True
    )

    time_regex = re.compile(r"time=(\d+):(\d+):(\d+\.?\d*)")
    for line in proc.stderr:
        m = time_regex.search(line)
        if m and duration > 0 and progress_callback:
            h, m_mins, s = m.groups()
            current_sec = int(h) * 3600 + int(m_mins) * 60 + float(s)
            percent = min(99.0, max(5.0, (current_sec / duration) * 90.0 + 5.0))
            progress_callback(percent, f"Merging for TV: {percent:.1f}%")

    proc.wait()
    if proc.returncode != 0:
        raise RuntimeError(f"FFmpeg stream merging failed with exit code {proc.returncode}")

    if progress_callback:
        progress_callback(100.0, "Stream merging complete.")
    return True
