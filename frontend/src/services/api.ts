import { VideoMetadata, DownloadItem, DiagnosticsData, AppSettings } from '../types';

const API_BASE = '/api';

export const api = {
  async analyzeUrl(url: string): Promise<VideoMetadata> {
    const res = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to analyze URL' }));
      throw new Error(err.detail || 'Failed to analyze video');
    }
    return res.json();
  },

  async getDownloads(status?: string): Promise<DownloadItem[]> {
    const url = status ? `${API_BASE}/downloads?status=${status}` : `${API_BASE}/downloads`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch downloads');
    return res.json();
  },

  async startDownload(data: {
    url: string;
    title?: string;
    channel?: string;
    duration?: number;
    thumbnail_url?: string;
    video_format_id?: string;
    audio_format_id?: string;
    resolution: string;
    fps?: number;
    container: string;
    audio_only?: boolean;
    audio_target_format?: string;
    tv_profile: string;
    custom_video_codec?: string;
    custom_audio_codec?: string;
    custom_crf?: number;
    enable_faststart?: boolean;
    force_duplicate?: boolean;
  }): Promise<{ id: string; status: string; message: string }> {
    const res = await fetch(`${API_BASE}/downloads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to start download' }));
      throw new Error(err.detail || 'Download failed to queue');
    }
    return res.json();
  },

  async pauseDownload(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/downloads/${id}/pause`, { method: 'POST' });
    if (!res.ok) throw new Error('Could not pause download');
  },

  async resumeDownload(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/downloads/${id}/resume`, { method: 'POST' });
    if (!res.ok) throw new Error('Could not resume download');
  },

  async cancelDownload(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/downloads/${id}/cancel`, { method: 'POST' });
    if (!res.ok) throw new Error('Could not cancel download');
  },

  async retryDownload(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/downloads/${id}/retry`, { method: 'POST' });
    if (!res.ok) throw new Error('Could not retry download');
  },

  async deleteDownload(id: string, deleteFile = false): Promise<void> {
    const res = await fetch(`${API_BASE}/downloads/${id}?delete_file=${deleteFile}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Could not delete record');
  },

  async openFolder(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/downloads/${id}/open-folder`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to open directory' }));
      throw new Error(err.detail);
    }
  },

  async playLocally(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/downloads/${id}/play`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to open player' }));
      throw new Error(err.detail);
    }
  },

  async getMediaInfo(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/downloads/${id}/mediainfo`);
    if (!res.ok) throw new Error('Failed to retrieve media technical specs');
    return res.json();
  },

  async convertDownload(id: string, target_tv_profile: string, target_container = 'mp4'): Promise<any> {
    const res = await fetch(`${API_BASE}/downloads/${id}/convert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_tv_profile, target_container })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Conversion failed' }));
      throw new Error(err.detail);
    }
    return res.json();
  },

  async getSettings(): Promise<AppSettings> {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  async updateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    if (!res.ok) throw new Error('Failed to save settings');
    return res.json();
  },

  async getDiagnostics(): Promise<DiagnosticsData> {
    const res = await fetch(`${API_BASE}/system/diagnostics`);
    if (!res.ok) throw new Error('Failed to fetch diagnostics');
    return res.json();
  }
};

