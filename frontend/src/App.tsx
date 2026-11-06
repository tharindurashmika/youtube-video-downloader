import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import { wsClient } from './services/websocket';
import { VideoMetadata, DownloadItem, DiagnosticsData, AppSettings } from './types';
import { MainLayout } from './layouts/MainLayout';
import { DashboardPage } from './pages/DashboardPage';
import { DownloadsPage } from './pages/DownloadsPage';
import { LibraryPage } from './pages/LibraryPage';
import { SettingsPage } from './pages/SettingsPage';
import { MediaInfoModal } from './components/MediaInfoModal';

export function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'downloads' | 'library' | 'settings'>('dashboard');
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [inspectedMediaInfo, setInspectedMediaInfo] = useState<any>(null);
  const [inspectedDownloadId, setInspectedDownloadId] = useState<string | null>(null);

  // Load initial data
  const loadInitialData = async () => {
    try {
      const [downloadsList, diag, sett] = await Promise.all([
        api.getDownloads(),
        api.getDiagnostics(),
        api.getSettings()
      ]);
      setDownloads(downloadsList);
      setDiagnostics(diag);
      setSettings(sett);
    } catch (e) {
      console.error('Error loading initial data:', e);
    }
  };

  useEffect(() => {
    loadInitialData();

    // Connect WebSocket
    wsClient.connect();
    const unsubscribe = wsClient.subscribe((event) => {
      const { type, payload } = event;

      if (type === 'download_queued') {
        setDownloads((prev) => {
          const exists = prev.some((d) => d.id === payload.id);
          if (exists) return prev.map((d) => (d.id === payload.id ? { ...d, ...payload } : d));
          return [payload, ...prev];
        });
      } else if (type === 'download_progress') {
        setDownloads((prev) =>
          prev.map((d) =>
            d.id === payload.id
              ? {
                  ...d,
                  progress: payload.progress,
                  speed: payload.speed,
                  eta: payload.eta,
                  status: payload.status || d.status
                }
              : d
          )
        );
      } else if (type === 'download_status') {
        setDownloads((prev) =>
          prev.map((d) => (d.id === payload.id ? { ...d, status: payload.status } : d))
        );
      } else if (type === 'download_completed') {
        setDownloads((prev) =>
          prev.map((d) => (d.id === payload.id ? { ...d, ...payload, status: 'completed' } : d))
        );
        api.getDiagnostics().then(setDiagnostics).catch(console.error);
      } else if (type === 'download_failed') {
        setDownloads((prev) =>
          prev.map((d) =>
            d.id === payload.id
              ? { ...d, status: 'failed', error_message: payload.error }
              : d
          )
        );
      } else if (type === 'download_cancelled') {
        setDownloads((prev) =>
          prev.map((d) =>
            d.id === payload.id ? { ...d, status: 'cancelled' } : d
          )
        );
      } else if (type === 'download_deleted') {
        setDownloads((prev) => prev.filter((d) => d.id !== payload.id));
      }
    });

    return () => {
      unsubscribe();
      wsClient.disconnect();
    };
  }, []);

  // Fallback sync: if a WebSocket event is missed, poll while tasks are active
  useEffect(() => {
    const hasActive = downloads.some((d) =>
      ['downloading', 'queued', 'converting', 'merging'].includes(d.status)
    );
    if (!hasActive) return;
    const timer = setInterval(() => {
      api.getDownloads().then(setDownloads).catch(() => {});
    }, 3000);
    return () => clearInterval(timer);
  }, [downloads]);

  // Handlers
  const handleAnalyze = async (url: string) => {
    setIsAnalyzing(true);
    setMetadata(null);
    try {
      const res = await api.analyzeUrl(url);
      setMetadata(res);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDownload = async (options: any) => {
    setIsDownloading(true);
    try {
      await api.startDownload(options);
      setActiveTab('downloads');
      setMetadata(null); // reset analysis after queueing
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePause = async (id: string) => {
    await api.pauseDownload(id);
    setDownloads((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: 'paused' } : d))
    );
  };

  const handleResume = async (id: string) => {
    await api.resumeDownload(id);
    setDownloads((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: 'queued' } : d))
    );
  };

  const handleCancel = async (id: string) => {
    await api.cancelDownload(id);
    setDownloads((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: 'cancelled' } : d))
    );
  };

  const handleRetry = async (id: string) => {
    await api.retryDownload(id);
    setDownloads((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: 'queued', error_message: null } : d))
    );
  };

  const handleDelete = async (id: string, deleteFile = false) => {
    await api.deleteDownload(id, deleteFile);
    setDownloads((prev) => prev.filter((d) => d.id !== id));
  };

  const handleOpenFolder = async (id: string) => {
    try {
      await api.openFolder(id);
    } catch (e: any) {
      alert(e.message || 'Could not open folder.');
    }
  };

  const handlePlay = async (id: string) => {
    try {
      await api.playLocally(id);
    } catch (e: any) {
      alert(e.message || 'Could not open local player.');
    }
  };

  const handleInspect = async (id: string) => {
    try {
      setInspectedDownloadId(id);
      const info = await api.getMediaInfo(id);
      setInspectedMediaInfo(info);
      setInspectModalOpen(true);
    } catch (e: any) {
      alert(e.message || 'Failed to inspect media file.');
    }
  };

  const handleConvert = async (id: string) => {
    try {
      setInspectModalOpen(false);
      setActiveTab('downloads');
      await api.convertDownload(id, 'universal', 'mp4');
      const updatedList = await api.getDownloads();
      setDownloads(updatedList);
    } catch (e: any) {
      alert(e.message || 'Conversion failed.');
    }
  };

  const handleSaveSettings = async (updated: Partial<AppSettings>) => {
    const res = await api.updateSettings(updated);
    setSettings(res);
  };

  const handleRefreshDiagnostics = async () => {
    const diag = await api.getDiagnostics();
    setDiagnostics(diag);
  };

  const activeCount = downloads.filter((d) =>
    ['downloading', 'queued', 'converting', 'merging'].includes(d.status)
  ).length;

  return (
    <MainLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      activeCount={activeCount}
      ffmpegReady={Boolean(diagnostics?.ffmpeg?.installed)}
    >
      {activeTab === 'dashboard' && (
        <DashboardPage
          onAnalyze={handleAnalyze}
          isAnalyzing={isAnalyzing}
          metadata={metadata}
          onDownload={handleDownload}
          isDownloading={isDownloading}
          downloads={downloads}
          diagnostics={diagnostics}
          onOpenFolder={handleOpenFolder}
          onPlay={handlePlay}
          onInspect={handleInspect}
          onDelete={handleDelete}
          setActiveTab={setActiveTab}
        />
      )}

      {activeTab === 'downloads' && (
        <DownloadsPage
          downloads={downloads}
          onPause={handlePause}
          onResume={handleResume}
          onCancel={handleCancel}
          onRetry={handleRetry}
          onDelete={handleDelete}
          onOpenFolder={handleOpenFolder}
          onPlay={handlePlay}
          onInspect={handleInspect}
          onConvert={handleConvert}
        />
      )}

      {activeTab === 'library' && (
        <LibraryPage
          downloads={downloads}
          onPlay={handlePlay}
          onOpenFolder={handleOpenFolder}
          onInspect={handleInspect}
          onConvert={handleConvert}
          onDelete={handleDelete}
        />
      )}

      {activeTab === 'settings' && (
        <SettingsPage
          settings={settings}
          diagnostics={diagnostics}
          onSaveSettings={handleSaveSettings}
          onRefreshDiagnostics={handleRefreshDiagnostics}
        />
      )}

      {/* Media Inspection Modal */}
      <MediaInfoModal
        isOpen={inspectModalOpen}
        onClose={() => setInspectModalOpen(false)}
        info={inspectedMediaInfo}
        onConvert={
          inspectedDownloadId
            ? () => handleConvert(inspectedDownloadId)
            : undefined
        }
      />
    </MainLayout>
  );
}

export default App;

