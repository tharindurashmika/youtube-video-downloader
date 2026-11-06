import React from 'react';
import { DownloadItem } from '../types';
import {
  Play,
  Folder,
  Pause,
  RotateCcw,
  Trash2,
  Tv,
  CheckCircle,
  AlertCircle,
  Clock,
  Sparkles,
  Info,
  RefreshCw,
  X
} from 'lucide-react';

interface DownloadItemRowProps {
  item: DownloadItem;
  onPause?: (id: string) => void;
  onResume?: (id: string) => void;
  onCancel?: (id: string) => void;
  onRetry?: (id: string) => void;
  onDelete?: (id: string) => void;
  onOpenFolder?: (id: string) => void;
  onPlay?: (id: string) => void;
  onInspect?: (id: string) => void;
  onConvert?: (id: string) => void;
}

export const DownloadItemRow: React.FC<DownloadItemRowProps> = ({
  item,
  onPause,
  onResume,
  onCancel,
  onRetry,
  onDelete,
  onOpenFolder,
  onPlay,
  onInspect,
  onConvert
}) => {
  const formatSpeed = (bytesPerSec: number) => {
    if (!bytesPerSec || bytesPerSec <= 0) return '0 KB/s';
    const mb = bytesPerSec / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(1)} MB/s`;
    return `${(bytesPerSec / 1024).toFixed(0)} KB/s`;
  };

  const formatEta = (seconds: number) => {
    if (!seconds || seconds <= 0) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s left`;
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes <= 0) return 'Unknown size';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
    return `${mb.toFixed(1)} MB`;
  };

  const isCompleted = item.status === 'completed';
  const isFailed = item.status === 'failed';
  const isDownloading = item.status === 'downloading';
  const isConverting = item.status === 'converting' || item.status === 'merging';
  const isPaused = item.status === 'paused';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 transition-all hover:border-slate-700/80 space-y-3">
      
      {/* Top row */}
      <div className="flex items-start justify-between gap-4">
        
        {/* Left: Thumbnail & Details */}
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-16 h-12 rounded-lg bg-slate-950 flex-shrink-0 overflow-hidden border border-slate-800 relative">
            {item.thumbnail_url ? (
              <img src={item.thumbnail_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-600">
                <Tv className="w-6 h-6" />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-white truncate max-w-sm sm:max-w-md md:max-w-xl" title={item.title}>
              {item.title || 'Untitled Video'}
            </h4>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-400">
              <span className="font-medium text-slate-300">{item.channel || 'YouTube'}</span>
              <span>•</span>
              <span className="font-mono text-sky-400">{item.resolution}</span>
              <span>•</span>
              <span className="uppercase text-slate-400">{item.container}</span>
              <span>•</span>
              <span>{formatFileSize(item.file_size)}</span>

              {item.tv_compatible && isCompleted && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle className="w-3 h-3" />
                  Smart TV Ready
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Status badge */}
        <div className="flex-shrink-0 text-right">
          {isDownloading && (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20 animate-pulse">
              Downloading {item.progress.toFixed(0)}%
            </span>
          )}
          {isConverting && (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
              <Sparkles className="w-3 h-3 animate-spin" />
              TV Optimization
            </span>
          )}
          {isCompleted && (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Completed
            </span>
          )}
          {isPaused && (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Paused
            </span>
          )}
          {isFailed && (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Failed
            </span>
          )}
          {item.status === 'queued' && (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300">
              Queued
            </span>
          )}
        </div>

      </div>

      {/* Progress Bar (active tasks) */}
      {(isDownloading || isConverting) && (
        <div className="space-y-1.5">
          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-300 ${
                isConverting ? 'bg-indigo-500' : 'bg-sky-500'
              }`}
              style={{ width: `${Math.max(2, item.progress)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>
              {isConverting
                ? 'Applying H.264/AAC TV parameters & fast-start moov atom...'
                : `${formatSpeed(item.speed)} • ${formatEta(item.eta)}`}
            </span>
            <span className="font-bold text-slate-300">{item.progress.toFixed(1)}%</span>
          </div>
        </div>
      )}

      {/* Error message if failed */}
      {isFailed && item.error_message && (
        <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/20 text-xs text-rose-300">
          {item.error_message}
        </div>
      )}

      {/* Action Buttons Row */}
      <div className="flex items-center justify-between pt-1 text-xs">
        <div className="text-[11px] text-slate-500">
          {new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>

        <div className="flex items-center gap-1.5">
          {isDownloading && onPause && (
            <button
              onClick={() => onPause(item.id)}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1"
              title="Pause download"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Pause</span>
            </button>
          )}

          {isPaused && onResume && (
            <button
              onClick={() => onResume(item.id)}
              className="px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-1"
              title="Resume download"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Resume</span>
            </button>
          )}

          {(isDownloading || item.status === 'queued') && onCancel && (
            <button
              onClick={() => onCancel(item.id)}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-300 flex items-center gap-1"
              title="Cancel download"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
          )}

          {(isFailed || item.status === 'cancelled') && onRetry && (
            <button
              onClick={() => onRetry(item.id)}
              className="px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-1"
              title="Retry download"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          )}

          {isCompleted && (
            <>
              {onPlay && (
                <button
                  onClick={() => onPlay(item.id)}
                  className="px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-1 font-medium shadow-sm"
                  title="Play in system default player"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Play</span>
                </button>
              )}

              {onOpenFolder && (
                <button
                  onClick={() => onOpenFolder(item.id)}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1"
                  title="Highlight file in Windows Explorer"
                >
                  <Folder className="w-3.5 h-3.5 text-amber-400" />
                  <span>Folder</span>
                </button>
              )}

              {onInspect && (
                <button
                  onClick={() => onInspect(item.id)}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1"
                  title="Inspect technical specs & TV checklist"
                >
                  <Info className="w-3.5 h-3.5 text-sky-400" />
                  <span>Specs</span>
                </button>
              )}

              {onConvert && !item.tv_compatible && (
                <button
                  onClick={() => onConvert(item.id)}
                  className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1"
                  title="Convert to TV-compatible MP4"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>To TV</span>
                </button>
              )}
            </>
          )}

          {onDelete && (
            <button
              onClick={() => onDelete(item.id)}
              className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
              title="Delete record"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

    </div>
  );
};

