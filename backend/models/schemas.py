from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class AnalyzeRequest(BaseModel):
    url: str = Field(..., description="YouTube video URL")

class StreamFormat(BaseModel):
    format_id: str
    ext: str
    resolution: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    fps: Optional[int] = None
    vcodec: Optional[str] = None
    acodec: Optional[str] = None
    filesize: Optional[int] = None
    filesize_approx: Optional[int] = None
    tbr: Optional[float] = None
    abr: Optional[float] = None
    vbr: Optional[float] = None
    note: Optional[str] = None
    is_video_only: bool = False
    is_audio_only: bool = False
    is_progressive: bool = False
    tv_compatible: bool = False
    tv_compatibility_reason: Optional[str] = None

class VideoResolutionOption(BaseModel):
    resolution: str
    height: int
    fps: int
    video_format_id: str
    vcodec: str
    ext: str
    estimated_size: int
    has_audio: bool
    tv_direct_play: bool
    tv_note: str

class AudioOption(BaseModel):
    audio_format_id: str
    ext: str
    acodec: str
    abr: float
    estimated_size: int
    note: str

class AnalyzeResponse(BaseModel):
    id: str
    url: str
    title: str
    channel: str
    duration: int
    duration_formatted: str
    thumbnail: str
    description: Optional[str] = None
    view_count: Optional[int] = None
    resolutions: List[VideoResolutionOption]
    audio_options: List[AudioOption]
    tv_compatibility_summary: Dict[str, Any]

class DownloadRequest(BaseModel):
    url: str
    title: Optional[str] = None
    thumbnail_url: Optional[str] = None
    channel: Optional[str] = None
    duration: Optional[int] = 0
    video_format_id: Optional[str] = None
    audio_format_id: Optional[str] = None
    resolution: str = "1080p"
    fps: Optional[int] = 30
    container: str = "mp4"
    audio_only: bool = False
    audio_target_format: Optional[str] = "mp3"
    tv_profile: str = "universal" # 'universal', 'high_quality', 'original', 'custom'
    custom_video_codec: Optional[str] = "h264"
    custom_audio_codec: Optional[str] = "aac"
    custom_crf: Optional[int] = 20
    enable_faststart: bool = True

class DownloadItem(BaseModel):
    id: str
    url: str
    title: Optional[str] = None
    channel: Optional[str] = None
    duration: int = 0
    thumbnail_url: Optional[str] = None
    resolution: Optional[str] = None
    fps: int = 30
    container: str = "mp4"
    video_codec: Optional[str] = None
    audio_codec: Optional[str] = None
    file_size: int = 0
    file_path: Optional[str] = None
    status: str = "queued"
    progress: float = 0.0
    speed: float = 0.0
    eta: int = 0
    error_message: Optional[str] = None
    tv_profile: str = "universal"
    tv_compatible: bool = True
    media_info_json: Optional[Dict[str, Any]] = None
    created_at: Optional[str] = None
    completed_at: Optional[str] = None

class ConvertRequest(BaseModel):
    target_tv_profile: str = "universal"
    target_container: str = "mp4"
    custom_crf: Optional[int] = 20

class SettingsModel(BaseModel):
    download_dir: str
    temp_dir: str
    default_resolution: str
    default_container: str
    default_tv_profile: str
    max_concurrent_downloads: int
    ffmpeg_path: str
    theme: str
    delete_temp_files: bool
    enable_faststart: bool
    strict_yuv420p: bool

