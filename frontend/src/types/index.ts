export interface VideoResolutionOption {
  resolution: string;
  height: number;
  fps: number;
  video_format_id: string;
  vcodec: string;
  ext: string;
  estimated_size: number;
  has_audio: boolean;
  tv_direct_play: boolean;
  tv_note: string;
}

export interface AudioOption {
  audio_format_id: string;
  ext: string;
  acodec: string;
  abr: number;
  estimated_size: number;
  note: string;
}

export interface VideoMetadata {
  id: string;
  url: string;
  title: string;
  channel: string;
  duration: number;
  duration_formatted: string;
  thumbnail: string;
  description: string;
  view_count: number;
  resolutions: VideoResolutionOption[];
  audio_options: AudioOption[];
  tv_compatibility_summary: {
    best_tv_ready_resolution: string;
    universal_profile_supported: boolean;
    direct_play_available: boolean;
    guidance: string;
  };
}

export interface DownloadItem {
  id: string;
  url: string;
  title: string;
  channel: string;
  duration: number;
  thumbnail_url: string;
  resolution: string;
  fps: number;
  container: string;
  video_codec: string;
  audio_codec: string;
  file_size: number;
  file_path: string | null;
  status: 'queued' | 'downloading' | 'merging' | 'converting' | 'completed' | 'failed' | 'cancelled' | 'paused';
  progress: number;
  speed: number;
  eta: number;
  error_message: string | null;
  tv_profile: string;
  tv_compatible: boolean;
  media_info_json?: any;
  created_at: string;
  completed_at?: string;
}

export interface DiagnosticsData {
  ffmpeg: {
    installed: boolean;
    path: string;
    version: string;
    features: {
      h264: boolean;
      hevc: boolean;
      aac: boolean;
      nvenc: boolean;
    };
    status_text: string;
  };
  ytdl_version: string;
  download_dir: string;
  storage: {
    total_bytes: number;
    free_bytes: number;
    used_bytes: number;
    used_percentage: number;
  };
}

export interface AppSettings {
  download_dir: string;
  temp_dir: string;
  default_resolution: string;
  default_container: string;
  default_tv_profile: string;
  max_concurrent_downloads: string;
  ffmpeg_path: string;
  theme: string;
  delete_temp_files: string;
  enable_faststart: string;
  strict_yuv420p: string;
}

