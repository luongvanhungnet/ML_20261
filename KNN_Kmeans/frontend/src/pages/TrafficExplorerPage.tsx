import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  Eye,
  Sparkles,
  X,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../services/api';
import { NetworkTrafficItem } from '../types';

interface TrafficExplorerProps {
  onSendToPrediction?: (record: NetworkTrafficItem) => void;
}

export const TrafficExplorerPage: React.FC<TrafficExplorerProps> = ({ onSendToPrediction }) => {
  const [traffic, setTraffic] = useState<NetworkTrafficItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [protocol, setProtocol] = useState('');
  const [attackType, setAttackType] = useState('');
  const [severityLevel, setSeverityLevel] = useState('');
  const [sortBy, setSortBy] = useState('event_timestamp');
  const [sortOrder, setSortOrder] = useState('desc');
  const [loading, setLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<NetworkTrafficItem | null>(null);

  const fetchTraffic = async () => {
    setLoading(true);
    try {
      const res = await api.getTraffic({
        page,
        page_size: pageSize,
        search: search.trim() || undefined,
        protocol: protocol || undefined,
        attack_type: attackType || undefined,
        severity_level: severityLevel || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      setTraffic(res.items);
      setTotal(res.total);
    } catch (e) {
      console.error('Failed to fetch traffic', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTraffic();
  }, [page, pageSize, protocol, attackType, severityLevel, sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTraffic();
  };

  const handleResetFilters = () => {
    setSearch('');
    setProtocol('');
    setAttackType('');
    setSeverityLevel('');
    setPage(1);
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  const getSeverityBadge = (level?: string | null) => {
    switch (level) {
      case 'High':
        return <span className="px-2 py-0.5 text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30 rounded">High</span>;
      case 'Medium':
        return <span className="px-2 py-0.5 text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded">Medium</span>;
      case 'Low':
        return <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">Low</span>;
      default:
        return <span className="px-2 py-0.5 text-xs bg-slate-800 text-slate-400 rounded">N/A</span>;
    }
  };

  const getAttackBadge = (type?: string | null) => {
    switch (type) {
      case 'DDoS':
        return <span className="px-2 py-0.5 text-xs font-bold bg-rose-500/10 text-rose-300 border border-rose-500/20 rounded">DDoS</span>;
      case 'Malware':
        return <span className="px-2 py-0.5 text-xs font-bold bg-orange-500/10 text-orange-300 border border-orange-500/20 rounded">Malware</span>;
      case 'Intrusion':
        return <span className="px-2 py-0.5 text-xs font-bold bg-purple-500/10 text-purple-300 border border-purple-500/20 rounded">Intrusion</span>;
      default:
        return <span className="px-2 py-0.5 text-xs bg-slate-800 text-slate-400 rounded">Normal</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search by IP address, Attack Signature, or User..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-colors shadow-md shadow-blue-600/20"
          >
            Search
          </button>
          <a
            href={api.getExportUrl({ search, protocol, attack_type: attackType, severity_level: severityLevel })}
            download="traffic_export.csv"
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-xl transition-colors flex items-center justify-center space-x-2 border border-slate-700"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </a>
        </form>

        {/* Filter dropdowns */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/80">
          <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-semibold uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          <select
            value={protocol}
            onChange={(e) => { setProtocol(e.target.value); setPage(1); }}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
          >
            <option value="">All Protocols</option>
            <option value="TCP">TCP</option>
            <option value="UDP">UDP</option>
            <option value="ICMP">ICMP</option>
          </select>

          <select
            value={attackType}
            onChange={(e) => { setAttackType(e.target.value); setPage(1); }}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
          >
            <option value="">All Attack Types</option>
            <option value="DDoS">DDoS</option>
            <option value="Malware">Malware</option>
            <option value="Intrusion">Intrusion</option>
          </select>

          <select
            value={severityLevel}
            onChange={(e) => { setSeverityLevel(e.target.value); setPage(1); }}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
          >
            <option value="">All Severities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
          >
            <option value="event_timestamp">Sort: Timestamp</option>
            <option value="packet_length">Sort: Packet Length</option>
            <option value="anomaly_scores">Sort: Anomaly Score</option>
            <option value="destination_port">Sort: Dest Port</option>
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg hover:border-slate-700"
          >
            {sortOrder === 'desc' ? '↓ Descending' : '↑ Ascending'}
          </button>

          {(protocol || attackType || severityLevel || search) && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-blue-400 hover:text-blue-300 underline ml-auto font-medium"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Traffic Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Destination</th>
                <th className="py-3 px-4">Protocol</th>
                <th className="py-3 px-4">Length</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Attack Type</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Anomaly</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 font-sans">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent mb-2" />
                    <div>Loading traffic telemetry records...</div>
                  </td>
                </tr>
              ) : traffic.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 font-sans">
                    No traffic records matched the selected query filters.
                  </td>
                </tr>
              ) : (
                traffic.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-400">
                      {row.event_timestamp ? new Date(row.event_timestamp).toLocaleString() : 'N/A'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-200">
                      {row.source_ip}:{row.source_port}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-200">
                      {row.destination_ip}:{row.destination_port}
                    </td>
                    <td className="py-3 px-4 font-sans font-semibold text-slate-300">
                      {row.protocol}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {row.packet_length?.toLocaleString() || '-'} B
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-400">
                      {row.packet_type} / {row.traffic_type}
                    </td>
                    <td className="py-3 px-4 font-sans">
                      {getAttackBadge(row.attack_type)}
                    </td>
                    <td className="py-3 px-4 font-sans">
                      {getSeverityBadge(row.severity_level)}
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-sans">
                      {row.anomaly_scores ? (
                        <span className={`font-semibold ${row.anomaly_scores > 70 ? 'text-red-400' : 'text-slate-400'}`}>
                          {row.anomaly_scores.toFixed(1)}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2 font-sans whitespace-nowrap">
                      <button
                        onClick={() => setSelectedRecord(row)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors inline-flex items-center"
                        title="View Full Record Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {onSendToPrediction && (
                        <button
                          onClick={() => onSendToPrediction(row)}
                          className="p-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded transition-colors inline-flex items-center"
                          title="Simulate in Prediction Lab"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing <span className="text-slate-200 font-semibold">{total === 0 ? 0 : (page - 1) * pageSize + 1}</span> to{' '}
            <span className="text-slate-200 font-semibold">{Math.min(page * pageSize, total)}</span> of{' '}
            <span className="text-slate-200 font-semibold">{total.toLocaleString()}</span> records
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors text-slate-200"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-medium">
              Page {page} of {totalPages}
            </span>
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

      {/* Record Inspector Drawer / Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-base">Traffic Record Inspector #{selectedRecord.id}</h3>
                  <p className="text-xs text-slate-400">Detailed raw schema attributes (all 25 fields)</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              {/* Network Core */}
              <div>
                <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">Network Layer</h4>
                <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div><span className="text-slate-400">Source IP & Port:</span> <span className="font-mono text-slate-200 font-semibold">{selectedRecord.source_ip}:{selectedRecord.source_port}</span></div>
                  <div><span className="text-slate-400">Destination IP & Port:</span> <span className="font-mono text-slate-200 font-semibold">{selectedRecord.destination_ip}:{selectedRecord.destination_port}</span></div>
                  <div><span className="text-slate-400">Protocol:</span> <span className="text-slate-200 font-semibold">{selectedRecord.protocol}</span></div>
                  <div><span className="text-slate-400">Packet Length:</span> <span className="text-slate-200 font-semibold">{selectedRecord.packet_length} bytes</span></div>
                  <div><span className="text-slate-400">Packet Type:</span> <span className="text-slate-200">{selectedRecord.packet_type}</span></div>
                  <div><span className="text-slate-400">Traffic Type:</span> <span className="text-slate-200">{selectedRecord.traffic_type}</span></div>
                </div>
              </div>

              {/* Threat & Security Indicators */}
              <div>
                <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2">Threat & Security Signals</h4>
                <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div><span className="text-slate-400">Ground-truth Attack Type:</span> <span className="font-semibold text-rose-300">{selectedRecord.attack_type || 'None'}</span></div>
                  <div><span className="text-slate-400">Severity Level:</span> <span className="font-semibold text-amber-300">{selectedRecord.severity_level || 'None'}</span></div>
                  <div><span className="text-slate-400">Attack Signature:</span> <span className="text-slate-200">{selectedRecord.attack_signature || 'N/A'}</span></div>
                  <div><span className="text-slate-400">Anomaly Score:</span> <span className="text-slate-200">{selectedRecord.anomaly_scores || 'N/A'}</span></div>
                  <div><span className="text-slate-400">Malware Indicators:</span> <span className="text-slate-200">{selectedRecord.malware_indicators || 'None'}</span></div>
                  <div><span className="text-slate-400">Action Taken:</span> <span className="text-slate-200">{selectedRecord.action_taken || 'Logged'}</span></div>
                </div>
              </div>

              {/* Contextual & System Signals */}
              <div>
                <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-2">Host & Environmental Context</h4>
                <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div><span className="text-slate-400">Network Segment:</span> <span className="text-slate-200">{selectedRecord.network_segment || 'N/A'}</span></div>
                  <div><span className="text-slate-400">Geolocation:</span> <span className="text-slate-200">{selectedRecord.geo_location_data || 'N/A'}</span></div>
                  <div><span className="text-slate-400">User Identity:</span> <span className="text-slate-200">{selectedRecord.user_information || 'N/A'}</span></div>
                  <div><span className="text-slate-400">Log Source:</span> <span className="text-slate-200">{selectedRecord.log_source || 'N/A'}</span></div>
                  <div className="col-span-2 truncate"><span className="text-slate-400">Device Agent:</span> <span className="text-slate-200">{selectedRecord.device_information || 'N/A'}</span></div>
                </div>
              </div>

              {/* Payload Data snippet */}
              {selectedRecord.payload_data && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Payload Data (Masked)</h4>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 break-all">
                    {selectedRecord.payload_data}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <span className="text-slate-400 text-xs">Event Timestamp: {selectedRecord.event_timestamp}</span>
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
