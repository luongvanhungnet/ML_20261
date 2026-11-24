import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Shield,
  Filter,
  FileEdit,
  X,
  UserCheck,
} from 'lucide-react';
import { api } from '../services/api';
import { AlertItem, User } from '../types';

interface AlertsPageProps {
  user: User | null;
  onAlertUpdated?: () => void;
}

export const AlertsPage: React.FC<AlertsPageProps> = ({ user, onAlertUpdated }) => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [loading, setLoading] = useState(false);

  // Edit modal state
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const [editStatus, setEditStatus] = useState<string>('investigating');
  const [editNotes, setEditNotes] = useState<string>('');
  const [updating, setUpdating] = useState(false);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await api.getAlerts({
        page,
        page_size: pageSize,
        status: statusFilter || undefined,
        severity: severityFilter || undefined,
      });
      setAlerts(res.items);
      setTotal(res.total);
    } catch (e) {
      console.error('Failed to load alerts', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [page, pageSize, statusFilter, severityFilter]);

  const handleOpenEdit = (alert: AlertItem) => {
    setSelectedAlert(alert);
    setEditStatus(alert.status);
    setEditNotes(alert.review_notes || '');
  };

  const handleSaveAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlert) return;
    setUpdating(true);
    try {
      await api.updateAlert(selectedAlert.id, {
        status: editStatus,
        review_notes: editNotes,
      });
      setSelectedAlert(null);
      fetchAlerts();
      if (onAlertUpdated) onAlertUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to update alert');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">New</span>;
      case 'investigating':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">Investigating</span>;
      case 'resolved':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Resolved</span>;
      case 'dismissed':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-800 text-slate-400 border border-slate-700">Dismissed</span>;
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Triage Stats & Filters */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Alert Triage Queue</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Total of <span className="text-slate-200 font-semibold">{total}</span> generated alerts in database
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-semibold uppercase">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="new">New</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
          >
            <option value="">All Severities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {/* Alert Cards Grid / List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent mb-2" />
            <div>Loading security alerts...</div>
          </div>
        ) : alerts.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-xl">
            No alerts found matching the active filter criteria.
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 p-5 rounded-xl transition-all shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center space-x-2.5">
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${
                      alert.severity === 'High'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {alert.severity}
                  </span>
                  {getStatusBadge(alert.status)}
                  <span className="text-xs text-slate-400">
                    Alert #{alert.id} &bull; {new Date(alert.created_at).toLocaleString()}
                  </span>
                </div>

                <p className="text-sm font-semibold text-slate-100">{alert.reason}</p>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                  {alert.source_ip && <span>Source: <strong className="text-slate-200 font-mono">{alert.source_ip}</strong></span>}
                  {alert.destination_ip && <span>Destination: <strong className="text-slate-200 font-mono">{alert.destination_ip}</strong></span>}
                  {alert.attack_type && <span>Category: <strong className="text-rose-300">{alert.attack_type}</strong></span>}
                </div>

                {alert.review_notes && (
                  <div className="mt-2 text-xs bg-slate-950/80 border border-slate-800/80 p-2.5 rounded-lg text-slate-300">
                    <strong className="text-blue-400">Analyst Review Note:</strong> {alert.review_notes}
                    {alert.reviewed_by && (
                      <span className="text-slate-500 ml-2">
                        &bull; By {alert.reviewed_by} on {alert.reviewed_at ? new Date(alert.reviewed_at).toLocaleDateString() : ''}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleOpenEdit(alert)}
                  disabled={user?.role === 'analyst'}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors border border-slate-700 flex items-center space-x-1.5 disabled:opacity-40"
                  title={user?.role === 'analyst' ? 'Analysts have read-only access' : 'Update Alert Status'}
                >
                  <FileEdit className="w-3.5 h-3.5" />
                  <span>Update Status</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Alert Status Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-100 text-base">Triage Security Alert #{selectedAlert.id}</h3>
                <p className="text-xs text-slate-400">Update status and record review findings</p>
              </div>
              <button onClick={() => setSelectedAlert(null)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAlert} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Workflow Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="new">New (Unassigned)</option>
                  <option value="investigating">Investigating (In Progress)</option>
                  <option value="resolved">Resolved (Threat Mitigated)</option>
                  <option value="dismissed">Dismissed (False Positive / Accepted Risk)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Investigative Findings / Review Notes
                </label>
                <textarea
                  rows={4}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Document telemetry verification, remediation steps, or reasons for triage decision..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setSelectedAlert(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
                >
                  {updating ? 'Saving...' : 'Confirm Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
