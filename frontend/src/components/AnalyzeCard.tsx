import React, { useState } from 'react';
import { VideoMetadata } from '../types';
import {
  Tv,
  CheckCircle,
  Clock,
  User,
  Eye,
  Sparkles,
  Zap,
  Volume2,
  FileVideo,
  ShieldCheck,
  Download,
  Sliders,
  Info
} from 'lucide-react';

interface AnalyzeCardProps {
  metadata: VideoMetadata;
  onDownload: (options: any) => Promise<void>;
  isDownloading: boolean;
}

export const AnalyzeCard: React.FC<AnalyzeCardProps> = ({
  metadata,
  onDownload,
  isDownloading
}) => {
  const [selectedResolution, setSelectedResolution] = useState<string>(
    metadata.resolutions.length > 0 ? metadata.resolutions[0].resolution : '1080p'
  );
  const [container, setContainer] = useState<string>('mp4');
  const [audioOnly, setAudioOnly] = useState<boolean>(false);
  const [audioFormat, setAudioFormat] = useState<string>('mp3');
  const [tvProfile, setTvProfile] = useState<string>('universal');
  const [customCrf, setCustomCrf] = useState<number>(20);

  const activeResObj = metadata.resolutions.find((r) => r.resolution === selectedResolution) || metadata.resolutions[0];

  const formatFileSize = (bytes: number) => {
    if (!bytes) return 'Estimating...';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
    return `${mb.toFixed(1)} MB`;
  };

  const handleStartDownload = async () => {
    const payload = {
      url: metadata.url,
      title: metadata.title,
      channel: metadata.channel,
      duration: metadata.duration,
      thumbnail_url: metadata.thumbnail,
      video_format_id: activeResObj?.video_format_id,
      resolution: activeResObj?.resolution || '1080p',
      fps: activeResObj?.fps || 30,
      container: audioOnly ? 'mp3' : container,
      audio_only: audioOnly,
      audio_target_format: audioFormat,
      tv_profile: tvProfile,
      custom_crf: customCrf,
      enable_faststart: true
    };
    await onDownload(payload);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      
      {/* Media Header */}
      <div className="flex flex-col md:flex-row gap-6">
        <div className="relative w-full md:w-80 h-48 rounded-xl overflow-hidden bg-slate-950 flex-shrink-0 group border border-slate-800">
          <img
            src={metadata.thumbnail}
            alt={metadata.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 backdrop-blur-md rounded text-xs font-semibold text-white flex items-center gap-1">
            <Clock className="w-3 h-3 text-sky-400" />
            <span>{metadata.duration_formatted}</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                YouTube Verified
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Authorized Personal Download
              </span>
            </div>
            <h2 className="text-xl font-bold text-white leading-snug line-clamp-2">
              {metadata.title}
            </h2>
            <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
              <div className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-medium text-slate-300">{metadata.channel}</span>
              </div>
              {metadata.view_count > 0 && (
                <div className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                  <span>{metadata.view_count.toLocaleString()} views</span>
                </div>
              )}
            </div>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs text-slate-300 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-sky-400 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-semibold text-sky-300">TV USB Optimization: </span>
              {metadata.tv_compatibility_summary.guidance}
            </div>
          </div>
        </div>
      </div>

      <hr className="border-slate-800" />

      {/* Mode Switcher: Video vs Audio Only */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <FileVideo className="w-4 h-4 text-sky-400" />
          <span>Output Mode</span>
        </label>
        <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex gap-1">
          <button
            onClick={() => setAudioOnly(false)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              !audioOnly ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Video + Audio (Smart TV)
          </button>
          <button
            onClick={() => setAudioOnly(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              audioOnly ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Audio Only (.mp3 / .aac)
          </button>
        </div>
      </div>

      {!audioOnly ? (
        <>
          {/* Resolution Selection Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-300">
                1. Select Available Video Quality
              </span>
              <span className="text-xs text-slate-500">
                Showing actual streams extracted from source
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
              {metadata.resolutions.map((res) => {
                const isSelected = selectedResolution === res.resolution;
                return (
                  <div
                    key={res.resolution}
                    onClick={() => setSelectedResolution(res.resolution)}
                    className={`cursor-pointer rounded-xl p-3 border transition-all text-left relative flex flex-col justify-between ${
                      isSelected
                        ? 'bg-sky-950/40 border-sky-500 text-white ring-1 ring-sky-500/50 shadow-md shadow-sky-500/10'
                        : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm tracking-tight text-white">
                          {res.resolution}
                        </span>
                        {res.fps >= 50 && (
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1 rounded">
                            {res.fps}fps
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-1">
                        {res.vcodec.toUpperCase()}
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-xs font-semibold text-sky-400">
                        {formatFileSize(res.estimated_size)}
                      </span>
                      {res.tv_direct_play ? (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-400/20" title="Direct TV Playable (H.264)" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-sky-400 ring-2 ring-sky-400/20" title="Auto-converts to H.264 for TV" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Container & TV Compatibility Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Container Format */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <FileVideo className="w-4 h-4 text-sky-400" />
                Container Format
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['mp4', 'mkv', 'webm'].map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setContainer(fmt)}
                    className={`py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
                      container === fmt
                        ? 'bg-sky-600 border-sky-400 text-white shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {fmt} {fmt === 'mp4' && '★ TV'}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400">
                {container === 'mp4'
                  ? 'MP4 has universal USB playback support across Samsung, LG, Sony, and Roku.'
                  : container === 'mkv'
                  ? 'MKV is great for modern TVs but some older sets may reject MKV containers.'
                  : 'WebM is primarily for PC/browsers; not recommended for TV USB ports.'}
              </p>
            </div>

            {/* Dedicated TV Compatibility Profile */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Tv className="w-4 h-4 text-sky-400" />
                TV Compatibility Mode
              </label>
              
              <select
                value={tvProfile}
                onChange={(e) => setTvProfile(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs font-medium text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="universal">Universal TV Compatibility (H.264 / AAC / yuv420p)</option>
                <option value="high_quality">High Quality 4K (H.264 / HEVC / 256k AAC)</option>
                <option value="original">Original Quality (Direct Stream - No Transcode)</option>
                <option value="custom">Custom Quality Profile</option>
              </select>

              {/* Dynamic TV advice banner */}
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-sky-950/40 border border-sky-500/20 text-xs">
                <Sparkles className="w-4 h-4 text-sky-400 flex-shrink-0" />
                <span className="text-slate-300">
                  {tvProfile === 'universal' && 'Guarantees H.264 video, AAC stereo, yuv420p, and fast-start moov atom for USB TVs.'}
                  {tvProfile === 'high_quality' && 'Preserves up to 4K resolution with high-bitrate encoding for modern HDR displays.'}
                  {tvProfile === 'original' && 'Retains exact YouTube VP9/Opus streams. Fast download, best for PC or Apple/Android TV box.'}
                  {tvProfile === 'custom' && 'Apply custom CRF rate controls.'}
                </span>
              </div>
            </div>

          </div>
        </>
      ) : (
        /* Audio Only Settings */
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-4">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Volume2 className="w-4 h-4 text-sky-400" />
            Audio Format Extraction
          </label>
          <div className="grid grid-cols-3 gap-3">
            {['mp3', 'aac', 'm4a'].map((fmt) => (
              <button
                key={fmt}
                onClick={() => setAudioFormat(fmt)}
                className={`py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all ${
                  audioFormat === fmt
                    ? 'bg-sky-600 border-sky-400 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400">
            Extracts high-bitrate audio stream using FFmpeg without re-encoding video.
          </p>
        </div>
      )}

      {/* Action Bar */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Local safe download. No external upload or DRM circumvention.</span>
        </div>

        <button
          onClick={handleStartDownload}
          disabled={isDownloading}
          className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
            isDownloading
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-sky-500/25'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>{isDownloading ? 'Adding to Queue...' : 'Download & Prepare for TV'}</span>
        </button>
      </div>

    </div>
  );
};

