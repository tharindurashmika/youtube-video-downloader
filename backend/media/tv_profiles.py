"""
TV Compatibility Profiles & Rules.
Smart TVs (Samsung Tizen, LG webOS, Sony Android TV, Roku TV, etc.) have strict codec & container requirements
when playing media via USB ports.
"""
from typing import Dict, Any, Tuple

TV_PROFILES = {
    "universal": {
        "name": "Universal TV Compatibility (Recommended)",
        "description": "Maximum compatibility for 99% of Smart TVs (Samsung, LG, Sony, Roku, TCL). MP4 container with H.264 video, AAC audio, yuv420p pixel format, and fast-start moov atom.",
        "container": "mp4",
        "video_codec": "h264",
        "audio_codec": "aac",
        "pix_fmt": "yuv420p",
        "faststart": True,
        "max_resolution": 1080, # default max 1080 for universal unless source <= 1080
        "crf": 20,
        "preset": "fast"
    },
    "high_quality": {
        "name": "High Quality (Modern 4K/HDR TVs)",
        "description": "Optimized for modern 4K/UHD Smart TVs (2018+) supporting H.265/HEVC or High-Bitrate H.264, preserving up to 4K resolutions.",
        "container": "mp4",
        "video_codec": "hevc",
        "audio_codec": "aac",
        "pix_fmt": "yuv420p",
        "faststart": True,
        "max_resolution": 2160,
        "crf": 22,
        "preset": "medium"
    },
    "original": {
        "name": "Original Quality (Direct Stream)",
        "description": "Preserves original downloaded YouTube codecs (e.g. VP9, Opus, AV1) without any re-encoding. Best for PCs and high-end Android TV boxes (Nvidia Shield, Chromecast with Google TV). Older TV USB players may fail.",
        "container": "preserve",
        "video_codec": "copy",
        "audio_codec": "copy",
        "pix_fmt": "copy",
        "faststart": True,
        "max_resolution": 9999,
        "crf": None,
        "preset": None
    },
    "custom": {
        "name": "Custom Profile",
        "description": "User-defined container, video codec, audio codec, and compression settings.",
        "container": "mp4",
        "video_codec": "h264",
        "audio_codec": "aac",
        "pix_fmt": "yuv420p",
        "faststart": True,
        "max_resolution": 2160,
        "crf": 20,
        "preset": "medium"
    }
}

def analyze_stream_tv_compatibility(
    video_codec: str,
    audio_codec: str,
    container: str,
    resolution_height: int = 1080,
    target_profile: str = "universal"
) -> Dict[str, Any]:
    """
    Evaluates whether streams require conversion and what kind:
    - direct_copy: completely lossless remux (0 re-encoding)
    - audio_transcode_only: copy video losslessly, transcode audio (takes ~2 seconds)
    - video_transcode_only: transcode video to h264, copy audio
    - full_transcode: transcode both video and audio
    """
    v_norm = (video_codec or "").lower()
    a_norm = (audio_codec or "").lower()
    c_norm = (container or "").lower()

    # Identify codecs
    is_h264 = any(c in v_norm for c in ["h264", "avc", "avc1"])
    is_h265 = any(c in v_norm for c in ["hevc", "h265", "hev1", "hvc1"])
    is_vp9 = "vp9" in v_norm or "vp09" in v_norm
    is_av1 = "av01" in v_norm or "av1" in v_norm

    is_aac = "aac" in a_norm or "mp4a" in a_norm
    is_ac3 = "ac3" in a_norm or "eac3" in a_norm
    is_opus = "opus" in a_norm
    is_mp3 = "mp3" in a_norm

    if target_profile == "original":
        return {
            "strategy": "direct_copy",
            "needs_video_transcode": False,
            "needs_audio_transcode": False,
            "needs_remux": c_norm != "mp4" and c_norm != "mkv",
            "badge": "Direct Stream (Original)",
            "tv_compatibility_score": 75 if is_vp9 else 95,
            "summary": "Original codecs preserved. Will play directly on modern players and Android TVs. Older TV USB ports might not support VP9/Opus.",
            "target_container": c_norm or "mp4"
        }

    if target_profile == "universal":
        target_container = "mp4"
        needs_video = not is_h264
        needs_audio = not is_aac

        if not needs_video and not needs_audio:
            strategy = "direct_copy"
            badge = "Direct Play Ready (100% Lossless)"
            score = 99
            summary = "Streams already use TV-native H.264 video and AAC audio! Stream copy will be used with zero loss of quality and near-instant processing."
        elif not needs_video and needs_audio:
            strategy = "audio_transcode_only"
            badge = "Video Direct Copy + Audio Transcode"
            score = 98
            summary = f"Video is already TV-compatible H.264. Only audio ({a_norm or 'audio'}) will be quickly converted to standard AAC. Video is copied losslessly!"
        elif needs_video and not needs_audio:
            strategy = "video_transcode_only"
            badge = "Video Transcode to H.264 (yuv420p)"
            score = 95
            summary = f"Video ({v_norm}) will be encoded to standard H.264/yuv420p for broad TV support. Audio is already AAC and will be copied directly."
        else:
            strategy = "full_transcode"
            badge = "Full TV Optimization (H.264 + AAC)"
            score = 99
            summary = "Video and audio will be converted to standard H.264/AAC MP4 with fast-start enabled for seamless playback on virtually all televisions."

        return {
            "strategy": strategy,
            "needs_video_transcode": needs_video,
            "needs_audio_transcode": needs_audio,
            "needs_remux": c_norm != target_container,
            "badge": badge,
            "tv_compatibility_score": score,
            "summary": summary,
            "target_container": target_container
        }

    if target_profile == "high_quality":
        target_container = "mp4"
        # 4K / Modern TV profile supports both H.264 and H.265
        needs_video = not (is_h264 or is_h265)
        needs_audio = not (is_aac or is_ac3)

        if not needs_video and not needs_audio:
            strategy = "direct_copy"
            badge = "High-Quality Direct Stream"
            score = 95
            summary = "Streams are already modern TV compatible. Lossless direct stream copy will be used."
        elif not needs_video and needs_audio:
            strategy = "audio_transcode_only"
            badge = "Video Lossless Copy + AAC Audio"
            score = 95
            summary = "Video streams preserved directly. Audio converted to standard AAC."
        else:
            strategy = "full_transcode"
            badge = "Modern TV Transcode (H.264/H.265)"
            score = 95
            summary = "Transcoding to high-bitrate H.264/H.265 to ensure smooth playback on 4K televisions."

        return {
            "strategy": strategy,
            "needs_video_transcode": needs_video,
            "needs_audio_transcode": needs_audio,
            "needs_remux": c_norm != target_container,
            "badge": badge,
            "tv_compatibility_score": score,
            "summary": summary,
            "target_container": target_container
        }

    # Custom
    return {
        "strategy": "custom",
        "needs_video_transcode": True,
        "needs_audio_transcode": True,
        "needs_remux": True,
        "badge": "Custom Conversion Profile",
        "tv_compatibility_score": 90,
        "summary": "Custom encoding parameters will be applied as requested.",
        "target_container": container or "mp4"
    }

