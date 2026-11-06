import React from 'react';
import { HardDrive, Folder, CheckCircle } from 'lucide-react';
import { DiagnosticsData } from '../types';

interface StorageCardProps {
  diagnostics: DiagnosticsData | null;
  totalDownloads: number;
}

export const StorageCard: React.FC<StorageCardProps> = ({
  diagnostics,
  totalDownloads
}) => {
  const storage = diagnostics?.storage;

  const formatGb = (bytes: number) => {
    if (!bytes) return '0 GB';
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const pct = storage?.used_percentage || 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
            <HardDrive className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Target Storage Drive</h3>
            <p className="text-[11px] text-slate-400 font-mono truncate max-w-[220px]">
              {diagnostics?.download_dir || 'Loading...'}
            </p>
          </div>
        </div>

        <span className="text-xs font-bold text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-full border border-sky-500/20">
          {totalDownloads} Videos
        </span>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-slate-300">
          <span>Used: {formatGb(storage?.used_bytes || 0)}</span>
          <span className="font-semibold text-white">Free: {formatGb(storage?.free_bytes || 0)}</span>
        </div>
        <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800 p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              pct > 90 ? 'bg-rose-500' : pct > 75 ? 'bg-amber-500' : 'bg-gradient-to-r from-sky-500 to-indigo-500'
            }`}
            style={{ width: `${Math.min(100, Math.max(2, pct))}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] text-slate-500">
          <span>Total Drive: {formatGb(storage?.total_bytes || 0)}</span>
          <span>{pct}% allocated</span>
        </div>
      </div>
    </div>
  );
};

