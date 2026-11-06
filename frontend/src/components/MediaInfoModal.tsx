import React from 'react';
import {
  X,
  Tv,
  CheckCircle,
  AlertTriangle,
  FileCode,
  Layers,
  Volume2,
  HardDrive,
  Cpu,
  RefreshCw
} from 'lucide-react';

interface MediaInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  info: any;
  onConvert?: () => void;
}

export const MediaInfoModal: React.FC<MediaInfoModalProps> = ({
  isOpen,
  onClose,
  info,
  onConvert
}) => {
  if (!isOpen || !info) return null;

  const vStream = info.video_streams?.[0];
  const aStream = info.audio_streams?.[0];
  const tvComp = info.tv_compatibility || {};
  const isTvReady = tvComp.is_tv_ready;
  const details = tvComp.details || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg border border-sky-500/20">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Media Technical Inspection</h3>
              <p className="text-xs text-slate-400 font-mono truncate max-w-sm sm:max-w-md">
                {info.file_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* TV Compatibility Audit Banner */}
          <div
            className={`p-4 rounded-xl border flex items-start justify-between gap-4 ${
              isTvReady
                ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
            }`}
          >
            <div className="flex items-start gap-3">
              {isTvReady ? (
                <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-bold text-sm">
                  {isTvReady ? 'TV USB Playback: 100% Ready' : 'TV USB Playback: Needs Optimization'}
                </div>
                <div className="text-xs mt-1 opacity-90 leading-relaxed">
                  {tvComp.summary || 'Verified using FFmpeg stream analysis.'}
                </div>
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              <span
                className={`text-2xl font-black ${
                  isTvReady ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {tvComp.score || 0}%
              </span>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Score
              </div>
            </div>
          </div>

          {/* Checklist Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <span className="text-[11px] font-medium text-slate-400">Container</span>
              <div className="flex items-center justify-between mt-2">
                <span className="font-bold text-sm text-white uppercase">{info.container}</span>
                {details.container_compliant ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                )}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <span className="text-[11px] font-medium text-slate-400">Video Codec</span>
              <div className="flex items-center justify-between mt-2">
                <span className="font-bold text-sm text-white truncate max-w-[80px]">
                  {vStream?.codec?.split(' ')[0] || 'N/A'}
                </span>
                {details.video_codec_compliant ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                )}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <span className="text-[11px] font-medium text-slate-400">Audio Codec</span>
              <div className="flex items-center justify-between mt-2">
                <span className="font-bold text-sm text-white truncate max-w-[80px]">
                  {aStream?.codec?.split(' ')[0] || 'N/A'}
                </span>
                {details.audio_codec_compliant ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                )}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <span className="text-[11px] font-medium text-slate-400">Pixel Format</span>
              <div className="flex items-center justify-between mt-2">
                <span className="font-bold text-sm text-white truncate max-w-[80px]">
                  {vStream?.pixel_format?.split('(')[0] || 'N/A'}
                </span>
                {details.pixel_format_compliant ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                )}
              </div>
            </div>
          </div>

          {/* Detailed Stream Technical Metadata */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-sky-400" />
              Stream Stream Details
            </h4>

            {vStream && (
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-2">
                <div className="flex items-center justify-between text-slate-300 font-semibold border-b border-slate-800/80 pb-2">
                  <span className="flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-sky-400" />
                    Video Stream
                  </span>
                  <span className="text-sky-400">{vStream.width}x{vStream.height} @ {vStream.fps}fps</span>
                </div>
                <div className="font-mono text-slate-400 text-[11px] break-all">
                  {vStream.raw_info}
                </div>
              </div>
            )}

            {aStream && (
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-2">
                <div className="flex items-center justify-between text-slate-300 font-semibold border-b border-slate-800/80 pb-2">
                  <span className="flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-sky-400" />
                    Audio Stream
                  </span>
                  <span className="text-sky-400">{aStream.sample_rate} • {aStream.channels}</span>
                </div>
                <div className="font-mono text-slate-400 text-[11px] break-all">
                  {aStream.raw_info}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-mono">
            {info.duration}s duration • {info.bitrate_kbps} kbps bitrate
          </div>
          <div className="flex items-center gap-3">
            {!isTvReady && onConvert && (
              <button
                onClick={onConvert}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 transition shadow"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Convert to TV MP4
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

