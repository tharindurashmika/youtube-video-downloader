import React from 'react';
import { Navbar } from '../components/Navbar';
import { Tv, ShieldCheck, Heart } from 'lucide-react';

interface MainLayoutProps {
  children: React.ReactNode;
  activeTab: 'dashboard' | 'downloads' | 'library' | 'settings';
  setActiveTab: (tab: 'dashboard' | 'downloads' | 'library' | 'settings') => void;
  activeCount: number;
  ffmpegReady: boolean;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  activeTab,
  setActiveTab,
  activeCount,
  ffmpegReady
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      
      {/* Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeCount={activeCount}
        ffmpegReady={ffmpegReady}
      />

      {/* Main Page Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/90 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Local & Offline Friendly • No Cloud Telemetry • Personal Use Only</span>
          </div>

          <div className="flex items-center gap-1 text-[11px]">
            <span>Optimized for Smart TVs: Samsung Tizen, LG webOS, Sony Android TV, Roku</span>
          </div>
        </div>
      </footer>

    </div>
  );
};

