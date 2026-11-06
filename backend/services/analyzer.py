"""
Video URL Analysis Service.
Uses yt-dlp to inspect available media formats without downloading.
Calculates stream compatibility, file size estimates, and TV compatibility advice.
"""
import yt_dlp
import logging
from typing import Dict, Any, List, Optional
from backend.utils.url_validator import is_valid_youtube_url
from backend.utils.sanitizer import format_duration
from backend.media.tv_profiles import analyze_stream_tv_compatibility

logger = logging.getLogger("analyzer")

def extract_video_info(url: str) -> Dict[str, Any]:
    url = url.strip()
    if not is_valid_youtube_url(url):
        raise ValueError("Invalid YouTube URL. Please provide a standard watch or share link.")

    ydl_opts = {
        'skip_download': True,
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
        'socket_timeout': 15,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if not info:
                raise ValueError("Could not retrieve video information. The video may be private or removed.")
    except yt_dlp.utils.DownloadError as e:
        msg = str(e)
        if "Private video" in msg:
            raise ValueError("This video is private and inaccessible.")
        elif "Video unavailable" in msg:
            raise ValueError("This video is unavailable or has been removed.")
        elif "Sign in to confirm your age" in msg:
            raise ValueError("This video requires age confirmation or authentication.")
        else:
            raise ValueError(f"Failed to access media stream: {msg.split(':')[-1].strip()}")
    except Exception as e:
        logger.error(f"Error extracting metadata: {e}")
        raise ValueError(f"Media extraction failed: {str(e)}")

    duration = info.get("duration", 0) or 0
    formats = info.get("formats", []) or []

    # Separate video-only, audio-only, and progressive streams
    video_formats = []
    audio_formats = []
    
    for f in formats:
        vcodec = f.get("vcodec")
        acodec = f.get("acodec")
        
        has_video = vcodec and vcodec != "none"
        has_audio = acodec and acodec != "none"
        
        # Estimate size if missing
        filesize = f.get("filesize") or f.get("filesize_approx")
        if not filesize and duration > 0:
            tbr = f.get("tbr") or f.get("vbr") or f.get("abr")
            if tbr:
                filesize = int((tbr * 1024 / 8) * duration)

        fmt_data = {
            "format_id": str(f.get("format_id")),
            "ext": f.get("ext", "mp4"),
            "width": f.get("width"),
            "height": f.get("height"),
            "fps": f.get("fps") or 30,
            "vcodec": vcodec if has_video else None,
            "acodec": acodec if has_audio else None,
            "filesize": filesize or 0,
            "tbr": f.get("tbr") or 0.0,
            "abr": f.get("abr") or 0.0,
            "vbr": f.get("vbr") or 0.0,
            "note": f.get("format_note") or "",
            "is_progressive": bool(has_video and has_audio),
            "is_video_only": bool(has_video and not has_audio),
            "is_audio_only": bool(has_audio and not has_video)
        }

        if has_video:
            video_formats.append(fmt_data)
        if has_audio and not has_video:
            audio_formats.append(fmt_data)

    # Sort audio by bitrate descending to find best audio stream
    audio_formats.sort(key=lambda x: (x.get("abr") or x.get("tbr") or 0), reverse=True)
    best_audio = audio_formats[0] if audio_formats else None
    best_audio_size = best_audio["filesize"] if best_audio else 0

    # Build available audio options
    audio_options = []
    seen_audio_codecs = set()
    for af in audio_formats:
        acodec = af["acodec"] or "audio"
        clean_codec = "AAC" if "mp4a" in acodec or "aac" in acodec else ("Opus" if "opus" in acodec else acodec)
        abr = int(af.get("abr") or af.get("tbr") or 128)
        key = f"{clean_codec}_{abr}"
        if key not in seen_audio_codecs:
            seen_audio_codecs.add(key)
            audio_options.append({
                "audio_format_id": af["format_id"],
                "ext": af["ext"],
                "acodec": clean_codec,
                "abr": abr,
                "estimated_size": af["filesize"],
                "note": f"{clean_codec} ~{abr}kbps"
            })

    # Group video formats by standard resolution tiers
    # Standard heights: 2160 (4K), 1440 (2K), 1080 (FHD), 720 (HD), 480 (SD), 360 (SD)
    resolution_buckets: Dict[int, List[Dict[str, Any]]] = {}
    for vf in video_formats:
        h = vf.get("height")
        if not h:
            continue
        # Map close heights to standard (e.g. 1080p widescreen might be 1920x800)
        bucket = h
        if 1050 <= h <= 1088:
            bucket = 1080
        elif 700 <= h <= 728:
            bucket = 720
        elif 1400 <= h <= 1448:
            bucket = 1440
        elif 2100 <= h <= 2168:
            bucket = 2160
        elif 460 <= h <= 488:
            bucket = 480
        elif 340 <= h <= 368:
            bucket = 360

        if bucket not in resolution_buckets:
            resolution_buckets[bucket] = []
        resolution_buckets[bucket].append(vf)

    resolutions_result = []
    # Process descending height
    for height in sorted(resolution_buckets.keys(), reverse=True):
        tier_formats = resolution_buckets[height]
        
        # Priority for TV compatibility: prefer H.264 (avc1) first, then VP9, then AV1
        # Because H.264 plays natively on TVs without re-encoding!
        def tv_codec_priority(fmt):
            v = (fmt.get("vcodec") or "").lower()
            if "avc" in v or "h264" in v:
                return 3
            if "vp9" in v:
                return 2
            return 1

        tier_formats.sort(key=lambda x: (tv_codec_priority(x), x.get("fps", 30), x.get("filesize", 0)), reverse=True)
        chosen = tier_formats[0]

        res_label = f"{height}p"
        if height >= 2160:
            res_label = "2160p (4K UHD)"
        elif height >= 1440:
            res_label = "1440p (2K QHD)"
        elif height >= 1080:
            res_label = "1080p (Full HD)"
        elif height >= 720:
            res_label = "720p (HD)"
        elif height >= 480:
            res_label = "480p (SD)"
        elif height >= 360:
            res_label = "360p (SD)"

        total_size = chosen["filesize"]
        if chosen["is_video_only"]:
            total_size += best_audio_size

        vcodec_simple = chosen["vcodec"].split(".")[0] if chosen["vcodec"] else "unknown"
        is_h264 = "avc" in vcodec_simple.lower() or "h264" in vcodec_simple.lower()

        resolutions_result.append({
            "resolution": res_label,
            "height": height,
            "fps": chosen["fps"] or 30,
            "video_format_id": chosen["format_id"],
            "vcodec": vcodec_simple,
            "ext": chosen["ext"],
            "estimated_size": total_size,
            "has_audio": chosen["is_progressive"],
            "tv_direct_play": is_h264,
            "tv_note": "Direct Play on Smart TVs (H.264 native)" if is_h264 else "Will auto-optimize to H.264 for TV playback"
        })

    # TV Compatibility overview
    has_h264_fhd = any(r["height"] == 1080 and r["tv_direct_play"] for r in resolutions_result)
    
    tv_summary = {
        "best_tv_ready_resolution": "1080p (Full HD)" if has_h264_fhd else (resolutions_result[0]["resolution"] if resolutions_result else "720p"),
        "universal_profile_supported": True,
        "direct_play_available": any(r["tv_direct_play"] for r in resolutions_result),
        "guidance": "Smart TVs from Samsung (Tizen), LG (webOS), Sony, and Roku require MP4 with H.264 video and AAC audio for flawless USB playback."
    }

    return {
        "id": info.get("id", ""),
        "url": url,
        "title": info.get("title", "Untitled Video"),
        "channel": info.get("uploader") or info.get("channel", "Unknown Channel"),
        "duration": duration,
        "duration_formatted": format_duration(duration),
        "thumbnail": info.get("thumbnail", ""),
        "description": (info.get("description") or "")[:500],
        "view_count": info.get("view_count", 0),
        "resolutions": resolutions_result,
        "audio_options": audio_options,
        "tv_compatibility_summary": tv_summary
    }

