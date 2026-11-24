import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Cpu,
  History,
  AlertTriangle,
  Info,
  CheckCircle,
  Play,
  RotateCcw,
} from 'lucide-react';
import { api } from '../services/api';
import { PredictionRequest, PredictionResponse, PredictionHistoryItem, NetworkTrafficItem } from '../types';

interface PredictionLabProps {
  initialRecord?: NetworkTrafficItem | null;
}

export const PredictionLabPage: React.FC<PredictionLabProps> = ({ initialRecord }) => {
  const [formData, setFormData] = useState<PredictionRequest>({
    source_ip: initialRecord?.source_ip || '192.168.1.100',
    destination_ip: initialRecord?.destination_ip || '10.0.0.1',
    source_port: initialRecord?.source_port || 52124,
    destination_port: initialRecord?.destination_port || 443,
    protocol: initialRecord?.protocol || 'TCP',
    packet_length: initialRecord?.packet_length || 840,
    packet_type: initialRecord?.packet_type || 'Data',
    traffic_type: initialRecord?.traffic_type || 'HTTP',
    network_segment: initialRecord?.network_segment || 'Segment A',
    traffic_id: initialRecord?.id,
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [history, setHistory] = useState<PredictionHistoryItem[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);

  const loadHistory = async () => {
    try {
      const res = await api.getPredictionHistory(1, 10);
      setHistory(res.items);
      setHistoryTotal(res.total);
    } catch (e) {
      console.error('Failed to load prediction history', e);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.predictThreat(formData);
      setResult(res);
      loadHistory();
    } catch (e) {
      console.error('Prediction failed', e);
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (preset: 'ddos' | 'intrusion' | 'malware') => {
    if (preset === 'ddos') {
      setFormData({
        source_ip: '198.51.100.45',
        destination_ip: '203.0.113.10',
        source_port: 54321,
        destination_port: 53,
        protocol: 'UDP',
        packet_length: 1480,
        packet_type: 'Data',
        traffic_type: 'DNS',
        network_segment: 'Segment B',
      });
    } else if (preset === 'intrusion') {
      setFormData({
        source_ip: '198.18.0.55',
        destination_ip: '10.0.4.22',
        source_port: 41200,
        destination_port: 22, // SSH
        protocol: 'TCP',
        packet_length: 450,
        packet_type: 'Control',
        traffic_type: 'HTTP',
        network_segment: 'Segment A',
      });
    } else {
      setFormData({
        source_ip: '172.16.5.99',
        destination_ip: '192.0.2.88',
        source_port: 38200,
        destination_port: 8080,
        protocol: 'TCP',
        packet_length: 620,
        packet_type: 'Data',
        traffic_type: 'HTTP',
        network_segment: 'Segment C',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Interpretation & Ethics Banner */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-start space-x-3 text-xs text-slate-300">
        <Info className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-100">Conditional Probability Disclaimer: </span>
          Inference outputs represent probability distributed strictly across the 3 trained candidate attack classes:
          <span className="text-red-400 font-semibold"> DDoS</span>,
          <span className="text-amber-400 font-semibold"> Malware</span>, and
          <span className="text-purple-400 font-semibold"> Intrusion</span>.
          High class probability does not equal absolute probability of future attack risk.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Form Column (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-blue-400" />
                <span>Model Inference Parameters</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Pre-decision network telemetry features</p>
            </div>

            {/* Simulation Presets */}
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={() => applyPreset('ddos')}
                className="px-2.5 py-1 text-[11px] bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded font-semibold transition-colors"
              >
                + DDoS Preset
              </button>
              <button
                type="button"
                onClick={() => applyPreset('intrusion')}
                className="px-2.5 py-1 text-[11px] bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded font-semibold transition-colors"
              >
                + Intrusion Preset
              </button>
              <button
                type="button"
                onClick={() => applyPreset('malware')}
                className="px-2.5 py-1 text-[11px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded font-semibold transition-colors"
              >
                + Malware Preset
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Source IP</label>
                <input
                  type="text"
                  value={formData.source_ip}
                  onChange={(e) => setFormData({ ...formData, source_ip: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Destination IP</label>
                <input
                  type="text"
                  value={formData.destination_ip}
                  onChange={(e) => setFormData({ ...formData, destination_ip: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Source Port (1 - 65535)</label>
                <input
                  type="number"
                  min="1"
                  max="65535"
                  value={formData.source_port}
                  onChange={(e) => setFormData({ ...formData, source_port: parseInt(e.target.value) || 1 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Destination Port (1 - 65535)</label>
                <input
                  type="number"
                  min="1"
                  max="65535"
                  value={formData.destination_port}
                  onChange={(e) => setFormData({ ...formData, destination_port: parseInt(e.target.value) || 1 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Protocol</label>
                <select
                  value={formData.protocol}
                  onChange={(e) => setFormData({ ...formData, protocol: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="TCP">TCP</option>
                  <option value="UDP">UDP</option>
                  <option value="ICMP">ICMP</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Packet Length (bytes)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.packet_length}
                  onChange={(e) => setFormData({ ...formData, packet_length: parseInt(e.target.value) || 0 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Packet Type</label>
                <select
                  value={formData.packet_type}
                  onChange={(e) => setFormData({ ...formData, packet_type: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="Data">Data</option>
                  <option value="Control">Control</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Traffic Type</label>
                <select
                  value={formData.traffic_type}
                  onChange={(e) => setFormData({ ...formData, traffic_type: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="HTTP">HTTP</option>
                  <option value="DNS">DNS</option>
                  <option value="FTP">FTP</option>
                </select>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end space-x-3">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs flex items-center space-x-2 transition-all shadow-lg shadow-blue-600/25 disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{loading ? 'Evaluating Model...' : 'Execute Classification'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Prediction Results Column (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider mb-1 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Inference Classification Output</span>
            </h3>
            <p className="text-xs text-slate-400 mb-5">Reproducible pipeline assessment</p>

            {result ? (
              <div className="space-y-5">
                {/* Primary Predicted Class */}
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                  <p className="text-xs text-slate-400 uppercase font-semibold">Predicted Attack Category</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xl font-bold text-slate-100">{result.predicted_class}</span>
                    <span className="px-2.5 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold rounded-lg font-mono">
                      {result.model_version}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Algorithm: <span className="text-slate-200 font-semibold">{result.algorithm}</span>
                  </p>
                </div>

                {/* Class Probabilities Progress Bars */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Multiclass Distribution Scores
                  </p>

                  {Object.entries(result.class_probabilities).map(([cName, score]) => (
                    <div key={cName} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 font-medium">{cName}</span>
                        <span className="font-mono text-slate-200 font-bold">{(score * 100).toFixed(1)}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            cName === 'DDoS'
                              ? 'bg-rose-500'
                              : cName === 'Malware'
                              ? 'bg-amber-500'
                              : 'bg-purple-500'
                          }`}
                          style={{ width: `${Math.max(2, score * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Anomaly Score */}
                {result.anomaly_score != null && (
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400 font-semibold">Unsupervised Anomaly Score</span>
                      <p className="text-xs text-slate-500">Isolation Forest Metric</p>
                    </div>
                    <span className={`text-base font-bold font-mono ${(result.anomaly_score ?? 0) > 75 ? 'text-red-400' : 'text-slate-200'}`}>
                      {result.anomaly_score} / 100
                    </span>
                  </div>
                )}

                {/* Interpretation */}
                <p className="text-xs text-slate-400 italic bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                  &ldquo;{result.interpretation}&rdquo;
                </p>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
                <Cpu className="w-10 h-10 text-slate-600 mb-3" />
                <p className="text-sm font-semibold text-slate-300">Awaiting Telemetry Input</p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  Fill in traffic features or apply a preset above and click &quot;Execute Classification&quot; to test model prediction.
                </p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500 flex items-center space-x-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Predictions are persisted in the PostgreSQL database with version tracking.</span>
          </div>
        </div>
      </div>

      {/* Prediction History Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center space-x-2">
              <History className="w-4 h-4 text-blue-400" />
              <span>Persisted Prediction Audit History</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Historical inferences logged with version provenance</p>
          </div>
          <span className="text-xs text-slate-400">{historyTotal} total stored predictions</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Prediction ID</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Model Name</th>
                <th className="py-3 px-4">Predicted Class</th>
                <th className="py-3 px-4">Class Scores</th>
                <th className="py-3 px-4">Anomaly</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                    No predictions recorded yet. Run a prediction to see history.
                  </td>
                </tr>
              ) : (
                history.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-blue-400">#{h.id}</td>
                    <td className="py-3 px-4 text-slate-400">{new Date(h.created_at).toLocaleString()}</td>
                    <td className="py-3 px-4 text-slate-200 font-sans">{h.model_name || 'XGBoost Attack Classifier'}</td>
                    <td className="py-3 px-4 font-sans font-bold">
                      <span className={h.predicted_class === 'DDoS' ? 'text-rose-400' : h.predicted_class === 'Malware' ? 'text-amber-400' : 'text-purple-400'}>
                        {h.predicted_class}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {Object.entries(h.class_scores || {})
                        .map(([k, v]) => `${k}: ${(v * 100).toFixed(0)}%`)
                        .join(' | ')}
                    </td>
                    <td className="py-3 px-4 font-sans">{h.anomaly_score?.toFixed(1) || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
