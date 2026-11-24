import React from 'react';
import {
  LayoutDashboard,
  Activity,
  BarChart3,
  Sparkles,
  AlertTriangle,
  Target,
  Database,
  FileText,
  Shield,
} from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  user: User | null;
  openAlertsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  user,
  openAlertsCount = 0,
}) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'traffic', label: 'Traffic Explorer', icon: Activity },
    { id: 'analytics', label: 'Threat Analytics', icon: BarChart3 },
    { id: 'prediction', label: 'Prediction Lab', icon: Sparkles },
    { id: 'alerts', label: 'Security Alerts', icon: AlertTriangle, badge: openAlertsCount },
    { id: 'models', label: 'Model Evaluation', icon: Target },
    { id: 'datasets', label: 'Dataset Management', icon: Database },
    { id: 'audit', label: 'Audit & Settings', icon: FileText },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen fixed left-0 top-0 z-30 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center space-x-3">
        <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
          <Shield className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-bold text-slate-100 text-lg leading-tight tracking-wide">CyberSecurity</h1>
          <p className="text-xs text-slate-400 font-medium">Threat Intelligence</p>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    isActive ? 'bg-blue-800 text-blue-200' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User profile footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center justify-between">
          <div className="truncate pr-2">
            <p className="text-xs text-slate-400 font-medium">Signed in as</p>
            <p className="text-xs font-semibold text-slate-200 truncate">{user?.email || 'Guest'}</p>
          </div>
          <span
            className={`text-[10px] px-2 py-0.5 uppercase tracking-wider font-bold rounded ${
              user?.role === 'administrator'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            {user?.role || 'user'}
          </span>
        </div>
      </div>
    </aside>
  );
};
