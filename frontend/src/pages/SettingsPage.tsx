import React, { useState, useEffect } from 'react';
import { AppSettings, DiagnosticsData } from '../types';
import {
  Settings,
  Folder,
  Tv,
  Cpu,
  HardDrive,
  Save,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Sliders,
  HelpCircle,
  ExternalLink
} from 'lucide-react';

interface SettingsPageProps {
  settings: AppSettings | null;
  diagnostics: DiagnosticsData | null;
  onSaveSettings: (updated: Partial<AppSettings>) => Promise<void>;
  onRefreshDiagnostics: () => Promise<void>;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  diagnostics,
  onSaveSettings,
  onRefreshDiagnostics
}) => {
  const [formData, setFormData] = useState<AppSettings>({
    download_dir: '',
    temp_dir: '',
    default_resolution: '1080p',
    default_container: 'mp4',
    default_tv_profile: 'universal',
    max_concurrent_downloads: '2',
    ffmpeg_path: '',
    theme: 'dark',
    delete_temp_files: 'true',
    enable_faststart: 'true',
    strict_yuv420p: 'true'
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleChange = (field: keyof AppSettings, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSaveSuccess(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveSettings(formData);
      await onRefreshDiagnostics();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      // error handled in parent
    } finally {
      setIsSaving(false);
    }
  };

  const ffmpeg = diagnostics?.ffmpeg;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
      
      {/* Page Header */}
      <div className="border-b border-slate-800 pb-5">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-sky-400" />
          <span>System & Playback Settings</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Configure directories, FFmpeg engines, default TV profiles, and background queue limits.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Directories Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Folder className="w-4 h-4 text-sky-400" />
            <span>Storage Locations</span>
          </h3>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Default Download Directory
              </label>
              <input
                type="text"
                value={formData.download_dir}
                onChange={(e) => handleChange('download_dir', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none"
                placeholder="E:\Development\Widgets\Local-Development\downloads"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Completed TV-ready files will be merged and organized into this folder.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Temporary Processing Directory
              </label>
              <input
                type="text"
                value={formData.temp_dir}
                onChange={(e) => handleChange('temp_dir', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none"
                placeholder="E:\Development\Widgets\Local-Development\temp_downloads"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Raw streams are staged here before being remuxed or transcoded to MP4.
              </p>
            </div>
          </div>
        </div>

        {/* TV Playback Preferences */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Tv className="w-4 h-4 text-sky-400" />
            <span>TV Playback Defaults</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Default Target Resolution
              </label>
              <select
                value={formData.default_resolution}
                onChange={(e) => handleChange('default_resolution', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="2160p">2160p (4K UHD)</option>
                <option value="1440p">1440p (2K QHD)</option>
                <option value="1080p">1080p (Full HD - Recommended)</option>
                <option value="720p">720p (HD)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Default Container
              </label>
              <select
                value={formData.default_container}
                onChange={(e) => handleChange('default_container', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="mp4">MP4 (Universal Smart TV Standard)</option>
                <option value="mkv">MKV (Modern Media Players)</option>
                <option value="webm">WebM (PC Browser)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                TV Compatibility Profile
              </label>
              <select
                value={formData.default_tv_profile}
                onChange={(e) => handleChange('default_tv_profile', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="universal">Universal TV (H.264 + AAC + yuv420p)</option>
                <option value="high_quality">High Quality (4K HDR / HEVC)</option>
                <option value="original">Original Stream Copy</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-slate-800/80 text-xs">
            <div>
              <span className="font-semibold text-slate-200">Enable MP4 Fast-Start (+faststart)</span>
              <p className="text-[11px] text-slate-500">
                Relocates moov atom header to the beginning of the MP4 file for instant seeking on Smart TVs.
              </p>
            </div>
            <input
              type="checkbox"
              checked={formData.enable_faststart === 'true'}
              onChange={(e) => handleChange('enable_faststart', e.target.checked ? 'true' : 'false')}
              className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 bg-slate-950 border-slate-800"
            />
          </div>
        </div>

        {/* FFmpeg Engine & Diagnostics */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-sky-400" />
              <span>FFmpeg Transcoding Engine</span>
            </h3>
            <button
              type="button"
              onClick={onRefreshDiagnostics}
              className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 font-semibold"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Re-check FFmpeg</span>
            </button>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                FFmpeg Executable Binary Path
              </label>
              <input
                type="text"
                value={formData.ffmpeg_path}
                onChange={(e) => handleChange('ffmpeg_path', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none"
                placeholder="C:\ffmpeg\bin\ffmpeg.exe"
              />
            </div>

            {/* Status card */}
            <div
              className={`p-4 rounded-xl border flex items-start gap-3.5 ${
                ffmpeg?.installed
                  ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-300'
                  : 'bg-amber-950/20 border-amber-500/20 text-amber-300'
              }`}
            >
              {ffmpeg?.installed ? (
                <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="font-bold text-white text-xs">
                  {ffmpeg?.installed ? 'FFmpeg Engine Active' : 'FFmpeg Not Detected'}
                </div>
                <div className="text-[11px] text-slate-400 leading-relaxed">
                  {ffmpeg?.status_text || 'Checking status...'}
                </div>
                {ffmpeg?.version && (
                  <div className="font-mono text-[10px] text-slate-500">
                    {ffmpeg.version}
                  </div>
                )}
                {ffmpeg?.features && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${ffmpeg.features.h264 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                      H.264 Encoder: {ffmpeg.features.h264 ? 'Ready' : 'No'}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${ffmpeg.features.hevc ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                      HEVC 4K: {ffmpeg.features.hevc ? 'Ready' : 'No'}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${ffmpeg.features.aac ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                      AAC Stereo: {ffmpeg.features.aac ? 'Ready' : 'No'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {!ffmpeg?.installed && (
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="font-semibold text-slate-200">How to install FFmpeg on Windows 11:</div>
                <ol className="list-decimal list-inside text-[11px] text-slate-400 space-y-1">
                  <li>Open PowerShell as Administrator.</li>
                  <li>Run: <code className="bg-slate-900 px-1 py-0.5 rounded text-sky-400">winget install Gyan.FFmpeg</code></li>
                  <li>Restart the application or paste the binary path above.</li>
                </ol>
              </div>
            )}
          </div>
        </div>

        {/* Queue Concurrency Limit */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-sky-400" />
            <span>Concurrency Controls</span>
          </h3>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between font-semibold text-slate-300">
              <span>Maximum Simultaneous Downloads:</span>
              <span className="font-mono text-sky-400 font-bold">{formData.max_concurrent_downloads}</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={formData.max_concurrent_downloads}
              onChange={(e) => handleChange('max_concurrent_downloads', e.target.value)}
              className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>1 (Bandwidth Saver)</span>
              <span>2 (Recommended)</span>
              <span>5 (High Speed)</span>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between pt-2">
          {saveSuccess ? (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold animate-fade-in">
              <CheckCircle className="w-4 h-4" />
              <span>Settings successfully saved & applied!</span>
            </div>
          ) : <div />}

          <button
            type="submit"
            disabled={isSaving}
            className="px-8 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-sky-600/20 transition"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>

      </form>
    </div>
  );
};

