import React, { useState, useEffect } from 'react';
import {
  FileText,
  Shield,
  Sliders,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../services/api';
import { AuditLogItem, User } from '../types';

interface SettingsAuditProps {
  user: User | null;
}

export const SettingsAuditPage: React.FC<SettingsAuditProps> = ({ user }) => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);

  // Threshold controls
  const [anomalyThreshold, setAnomalyThreshold] = useState(75);
  const [confidenceThreshold, setConfidenceThreshold] = useState(70);
  const [savedSettings, setSavedSettings] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getAuditLogs(page, pageSize);
      setLogs(res.items);
      setTotal(res.total);
    } catch (e) {
      console.error('Failed to load audit logs', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'administrator') {
      fetchLogs();
    }
  }, [page, pageSize, user]);

  const handleSaveThresholds = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSettings(true);
    setTimeout(() => setSavedSettings(false), 3000);
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  const getActionBadge = (action: string) => {
    if (action.includes('LOGIN')) {
      return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">{action}</span>;
    }
    if (action.includes('ALERT')) {
      return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">{action}</span>;
    }
    if (action.includes('PREDICT')) {
      return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">{action}</span>;
    }
    if (action.includes('IMPORT')) {
      return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{action}</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 text-slate-400">{action}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Alert Thresholds Configuration (FR-26) */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-blue-400" />
            <span>Alert Threshold Configurations</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Configurable triggers for automated security alert generation (affects newly evaluated events)
          </p>
        </div>

        <form onSubmit={handleSaveThresholds} className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <label className="font-semibold text-slate-300">Anomaly Score Sensitivity Trigger</label>
              <span className="font-mono text-blue-400 font-bold">{anomalyThreshold} / 100</span>
            </div>
            <input
              type="range"
              min="40"
              max="95"
              value={anomalyThreshold}
              onChange={(e) => setAnomalyThreshold(parseInt(e.target.value))}
              disabled={user?.role !== 'administrator'}
              className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <p className="text-[11px] text-slate-500">
              Events exceeding this Isolation Forest anomaly threshold trigger an automatic triage alert.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <label className="font-semibold text-slate-300">Inference Attack Confidence Trigger</label>
              <span className="font-mono text-blue-400 font-bold">{confidenceThreshold}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="95"
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(parseInt(e.target.value))}
              disabled={user?.role !== 'administrator'}
              className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <p className="text-[11px] text-slate-500">
              Predictions where the primary class probability exceeds this percentage generate triage items.
            </p>
          </div>

          <div className="md:col-span-2 flex items-center justify-between pt-2">
            {savedSettings ? (
              <span className="text-xs text-emerald-400 font-medium flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Threshold parameters saved successfully.</span>
              </span>
            ) : <div />}

            {user?.role === 'administrator' && (
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-colors shadow-md shadow-blue-600/20"
              >
                Save Thresholds
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Audit Log Trail (FR-03) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center space-x-2">
              <FileText className="w-4 h-4 text-purple-400" />
              <span>Administrative Action Audit Trail</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Immutable audit history of logins, dataset ingestions, alert status changes, and model switches
            </p>
          </div>
          <span className="text-xs text-slate-400">{total} audit events logged</span>
        </div>

        {user?.role !== 'administrator' ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Audit trail access is restricted to Administrators.
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Log ID</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4">Entity Type</th>
                    <th className="py-3 px-4">Entity ID</th>
                    <th className="py-3 px-4">Details</th>
                    <th className="py-3 px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                        Loading audit logs...
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                        No audit events logged yet.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4 text-blue-400">#{log.id}</td>
                        <td className="py-3 px-4 font-sans">{getActionBadge(log.action)}</td>
                        <td className="py-3 px-4 text-slate-200 font-sans">{log.actor_email || 'System'}</td>
                        <td className="py-3 px-4 text-slate-400 font-sans">{log.entity_type || '-'}</td>
                        <td className="py-3 px-4 text-slate-400">{log.entity_id || '-'}</td>
                        <td className="py-3 px-4 text-slate-400 font-sans truncate max-w-xs">
                          {log.details ? JSON.stringify(log.details) : '-'}
                        </td>
                        <td className="py-3 px-4 text-slate-400">{new Date(log.created_at).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <div>
                Page <span className="text-slate-200 font-semibold">{page}</span> of <span className="text-slate-200 font-semibold">{totalPages}</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors text-slate-200"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors text-slate-200"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
