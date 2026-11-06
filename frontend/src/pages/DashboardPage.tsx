import React, { useState } from 'react';
import {
  Search,
  Sparkles,
  Link,
  Clipboard,
  Tv,
  CheckCircle,
  Clock,
  Film,
  HardDrive,
  Download,
  AlertCircle
} from 'lucide-react';
import { VideoMetadata, DownloadItem, DiagnosticsData } from '../types';
import { AnalyzeCard } from '../components/AnalyzeCard';
import { StorageCard } from '../components/StorageCard';
import { DownloadItemRow } from '../components/DownloadItemRow';

interface DashboardPageProps {
  onAnalyze: (url: string) => Promise<void>;
  isAnalyzing: boolean;
  metadata: VideoMetadata | null;
  onDownload: (options: any) => Promise<void>;
  isDownloading: boolean;
  downloads: DownloadItem[];
  diagnostics: DiagnosticsData | null;
  onOpenFolder: (id: string) => void;
  onPlay: (id: string) => void;
  onInspect: (id: string) => void;
  onDelete: (id: string) => void;
  setActiveTab: (tab: any) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onAnalyze,
  isAnalyzing,
  metadata,
  onDownload,
  isDownloading,
  downloads,
  diagnostics,
  onOpenFolder,
  onPlay,
  onInspect,
  onDelete,
  setActiveTab
}) => {
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState('');

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        setUrlError('');
      }
    } catch (e) {
      // clipboard access not granted
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setUrlError('Please paste a YouTube URL to analyze.');
      return;
    }
    setUrlError('');
    try {
      await onAnalyze(url.trim());
    } catch (err: any) {
      setUrlError(err.message || 'Failed to inspect media URL.');
    }
  };

  // Stats
  const completedDownloads = downloads.filter((d) => d.status === 'completed');
  const activeDownloads = downloads.filter((d) => ['downloading', 'queued', 'converting', 'merging'].includes(d.status));
  const tvReadyCount = completedDownloads.filter((d) => d.tv_compatible).length;

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Hero Search Section */}
      <div className="relative rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 p-8 border border-slate-800 shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs font-semibold">
            <Tv className="w-3.5 h-3.5" />
            <span>Smart TV Media Preparation Engine</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Download & Optimize Videos for Your Television
          </h1>
          <p className="text-slate-400 text-sm max-w-xl mx-auto leading-relaxed">
            Paste any authorized YouTube video URL. We will inspect available resolutions, codecs, and container formats, then produce TV-compatible MP4 files ready for USB playback.
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSubmit} className="pt-2">
            <div className="relative flex items-center bg-slate-950/90 rounded-2xl border border-slate-700/80 p-2 shadow-xl focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 transition-all">
              <div className="pl-3 text-slate-500">
                <Link className="w-5 h-5 text-sky-400" />
              </div>
              <input
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setUrlError('');
                }}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full bg-transparent px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none"
              />
              
              <div className="flex items-center gap-2 pr-1">
                <button
                  type="button"
                  onClick={handlePaste}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition"
                >
                  <Clipboard className="w-3.5 h-3.5" />
                  <span>Paste</span>
                </button>

                <button
                  type="submit"
                  disabled={isAnalyzing}
                  className="px-6 py-2.5 rounded-xl font-bold text-xs bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-2 shadow-lg shadow-sky-600/20 disabled:opacity-50 transition"
                >
                  {isAnalyzing ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>Inspect & Analyze</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {urlError && (
              <div className="mt-3 text-xs text-rose-400 flex items-center justify-center gap-1.5 animate-shake">
                <AlertCircle className="w-4 h-4" />
                <span>{urlError}</span>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Analysis Result Card */}
      {metadata && (
        <div className="animate-fade-in-up">
          <AnalyzeCard
            metadata={metadata}
            onDownload={onDownload}
            isDownloading={isDownloading}
          />
        </div>
      )}

      {/* Stats Counter Bar & Storage Drive */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center gap-4">
          <div className="p-3 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20">
            <Film className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{completedDownloads.length}</div>
            <div className="text-xs text-slate-400">Total Completed</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{tvReadyCount}</div>
            <div className="text-xs text-slate-400">TV-Compatible USB Files</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <Download className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{activeDownloads.length}</div>
            <div className="text-xs text-slate-400">In Active Queue</div>
          </div>
        </div>

        <StorageCard
          diagnostics={diagnostics}
          totalDownloads={completedDownloads.length}
        />

      </div>

      {/* Recent Downloads Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-400" />
            <h3 className="text-base font-bold text-white">Recent Download Activity</h3>
          </div>
          {downloads.length > 0 && (
            <button
              onClick={() => setActiveTab('library')}
              className="text-xs font-semibold text-sky-400 hover:text-sky-300"
            >
              View Full Library ({downloads.length}) &rarr;
            </button>
          )}
        </div>

        {downloads.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
            <Tv className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">No downloads yet</p>
            <p className="text-xs text-slate-500">
              Paste a YouTube video URL above to download your first TV-ready video file.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {downloads.slice(0, 4).map((item) => (
              <DownloadItemRow
                key={item.id}
                item={item}
                onOpenFolder={onOpenFolder}
                onPlay={onPlay}
                onInspect={onInspect}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

