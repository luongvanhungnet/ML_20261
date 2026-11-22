import React from 'react';
import { LogOut, RefreshCw } from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
  currentTab: string;
  user: User | null;
  onLogout: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const TAB_TITLES: Record<string, string> = {
  overview: 'Executive Threat Analytics Overview',
  traffic: 'Network Traffic Explorer',
  analytics: 'Threat Distribution & Network Patterns',
  prediction: 'Prediction Lab (Attack-Type Classification)',
  alerts: 'Security Alert Triage Queue',
  models: 'Model Evaluation & Experiment Comparison',
  datasets: 'Dataset Ingestion & Data Quality Profiling',
  audit: 'System Configuration & Audit Trail',
};

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  user,
  onLogout,
  onRefresh,
  isRefreshing = false,
}) => {
  return (
    <header className="h-16 bg-slate-900/80 backdrop-blur border-b border-slate-800 px-8 flex items-center justify-between sticky top-0 z-20">
      <div>
        <h2 className="text-base font-semibold text-slate-100">
          {TAB_TITLES[currentTab] || 'Cyber Threat Platform'}
        </h2>
      </div>

      <div className="flex items-center space-x-4">
        {/* Status indicator */}
        <div className="flex items-center space-x-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>System Live</span>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            title="Refresh current view"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        )}

        <div className="h-4 w-px bg-slate-800" />

        <div className="flex items-center space-x-3">
          <span className="text-xs text-slate-300 font-medium">{user?.email}</span>
          <button
            onClick={onLogout}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors border border-transparent hover:border-red-500/20"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
};
