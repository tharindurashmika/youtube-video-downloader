import React, { useState } from 'react';
import { DownloadItem } from '../types';
import { DownloadItemRow } from '../components/DownloadItemRow';
import {
  Download,
  Filter,
  CheckCircle,
  PauseCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Inbox
} from 'lucide-react';

interface DownloadsPageProps {
  downloads: DownloadItem[];
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenFolder: (id: string) => void;
  onPlay: (id: string) => void;
  onInspect: (id: string) => void;
  onConvert: (id: string) => void;
}

export const DownloadsPage: React.FC<DownloadsPageProps> = ({
  downloads,
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
  const [filter, setFilter] = useState<string>('all');

  const filteredItems = downloads.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'active') return ['downloading', 'queued', 'converting', 'merging'].includes(item.status);
    if (filter === 'completed') return item.status === 'completed';
    if (filter === 'paused') return item.status === 'paused';
    if (filter === 'failed') return item.status === 'failed' || item.status === 'cancelled';
    return true;
  });

  const activeCount = downloads.filter((d) => ['downloading', 'queued', 'converting', 'merging'].includes(d.status)).length;

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Download className="w-5 h-5 text-sky-400" />
            <span>Download Queue & Tasks</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time multi-stream background queue with automatic FFmpeg post-processing.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
          {[
            { id: 'all', label: 'All Tasks', count: downloads.length },
            { id: 'active', label: 'Active', count: activeCount },
            { id: 'completed', label: 'Done', count: downloads.filter((d) => d.status === 'completed').length },
            { id: 'failed', label: 'Failed', count: downloads.filter((d) => d.status === 'failed').length }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                filter === tab.id
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${filter === tab.id ? 'bg-sky-700 text-white' : 'bg-slate-800 text-slate-400'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {filteredItems.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-3">
          <Inbox className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-300">No items found</h3>
          <p className="text-xs text-slate-500">
            {filter === 'active'
              ? 'No active downloads in the queue at the moment.'
              : 'There are no items matching the selected filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <DownloadItemRow
              key={item.id}
              item={item}
              onPause={onPause}
              onResume={onResume}
              onCancel={onCancel}
              onRetry={onRetry}
              onDelete={onDelete}
              onOpenFolder={onOpenFolder}
              onPlay={onPlay}
              onInspect={onInspect}
              onConvert={onConvert}
            />
          ))}
        </div>
      )}

    </div>
  );
};

