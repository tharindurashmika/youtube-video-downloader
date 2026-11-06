import React, { useState } from 'react';
import { DownloadItem } from '../types';
import {
  Film,
  Search,
  Folder,
  Play,
  Trash2,
  Tv,
  CheckCircle,
  Copy,
  Info,
  RefreshCw,
  Clock,
  HardDrive
} from 'lucide-react';

interface LibraryPageProps {
  downloads: DownloadItem[];
  onPlay: (id: string) => void;
  onOpenFolder: (id: string) => void;
  onInspect: (id: string) => void;
  onConvert: (id: string) => void;
  onDelete: (id: string, deleteFile?: boolean) => void;
}

export const LibraryPage: React.FC<LibraryPageProps> = ({
  downloads,
  onPlay,
  onOpenFolder,
  onInspect,
  onConvert,
  onDelete
}) => {
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const completedItems = downloads.filter((d) => d.status === 'completed');

  const filteredItems = completedItems.filter((item) => {
    const q = search.toLowerCase();
    return (
      (item.title && item.title.toLowerCase().includes(q)) ||
      (item.channel && item.channel.toLowerCase().includes(q)) ||
      (item.resolution && item.resolution.toLowerCase().includes(q)) ||
      (item.container && item.container.toLowerCase().includes(q))
    );
  });

  const handleCopyPath = (id: string, path: string | null) => {
    if (!path) return;
    navigator.clipboard.writeText(path);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return 'Unknown size';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Film className="w-5 h-5 text-sky-400" />
            <span>TV Media Library</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Browse, inspect, play, or transfer your TV-ready video files directly onto USB storage.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search saved videos..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
      </div>

      {/* Grid of Cards */}
      {filteredItems.length === 0 ? (
        <div className="p-16 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-3">
          <Film className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-300">No completed videos in library</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Videos downloaded from the Dashboard will automatically appear here once merged and optimized for your TV.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl hover:border-slate-700 transition flex flex-col justify-between group"
            >
              <div>
                {/* Media Thumbnail */}
                <div className="relative aspect-video bg-slate-950 overflow-hidden">
                  {item.thumbnail_url ? (
                    <img
                      src={item.thumbnail_url}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600">
                      <Tv className="w-10 h-10" />
                    </div>
                  )}

                  <div className="absolute top-2 left-2 flex gap-1.5">
                    <span className="px-2 py-0.5 rounded bg-black/80 backdrop-blur-md text-[11px] font-bold text-sky-400 border border-sky-500/20">
                      {item.resolution}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-black/80 backdrop-blur-md text-[11px] font-bold text-slate-300 uppercase">
                      {item.container}
                    </span>
                  </div>

                  {item.tv_compatible && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-emerald-950/90 backdrop-blur-md text-[10px] font-bold text-emerald-300 border border-emerald-500/30 flex items-center gap-1 shadow">
                      <CheckCircle className="w-3 h-3 text-emerald-400" />
                      <span>Smart TV Ready</span>
                    </div>
                  )}

                  {/* Play Overlay */}
                  <button
                    onClick={() => onPlay(item.id)}
                    className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-sky-600/90 text-white flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 hover:scale-110 transition duration-200"
                    title="Play Video"
                  >
                    <Play className="w-5 h-5 ml-0.5" />
                  </button>
                </div>

                {/* Info */}
                <div className="p-4 space-y-2">
                  <h4 className="text-sm font-bold text-white line-clamp-2 leading-snug" title={item.title}>
                    {item.title}
                  </h4>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="truncate max-w-[150px]">{item.channel}</span>
                    <span className="font-semibold text-slate-300">{formatFileSize(item.file_size)}</span>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="px-4 py-3 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between text-xs">
                
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onPlay(item.id)}
                    className="p-1.5 rounded-lg bg-sky-600/20 text-sky-400 hover:bg-sky-600 hover:text-white transition"
                    title="Play in system default player"
                  >
                    <Play className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onOpenFolder(item.id)}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-amber-400 hover:bg-slate-700 transition"
                    title="Highlight file in Windows Explorer"
                  >
                    <Folder className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onInspect(item.id)}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-sky-400 hover:bg-slate-700 transition"
                    title="View Technical Media Info & TV Audit"
                  >
                    <Info className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleCopyPath(item.id, item.file_path)}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
                    title={copiedId === item.id ? 'Copied!' : 'Copy full file path'}
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  {!item.tv_compatible && (
                    <button
                      onClick={() => onConvert(item.id)}
                      className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-slate-950 transition font-bold"
                      title="Convert to TV-compatible MP4"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Delete button */}
                <button
                  onClick={() => setDeleteConfirmId(item.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Delete Confirmation Overlay */}
              {deleteConfirmId === item.id && (
                <div className="p-3 bg-rose-950/90 border-t border-rose-500/40 text-xs space-y-2">
                  <div className="font-semibold text-rose-200">Delete this video?</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        onDelete(item.id, false);
                        setDeleteConfirmId(null);
                      }}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px]"
                    >
                      Remove from DB only
                    </button>
                    <button
                      onClick={() => {
                        onDelete(item.id, true);
                        setDeleteConfirmId(null);
                      }}
                      className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[11px] font-bold"
                    >
                      Delete File from Disk
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="px-2 py-1 text-slate-400 hover:text-white text-[11px]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

            </div>
          ))}
        </div>
      )}

    </div>
  );
};

