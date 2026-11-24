import React, { useState, useEffect } from 'react';
import {
  Target,
  CheckCircle,
  AlertCircle,
  BarChart,
  Grid,
  Info,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { api } from '../services/api';
import { ModelVersionItem, User } from '../types';
import { EChartWrapper } from '../components/EChartWrapper';

interface ModelEvaluationProps {
  user: User | null;
}

export const ModelEvaluationPage: React.FC<ModelEvaluationProps> = ({ user }) => {
  const [models, setModels] = useState<ModelVersionItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);

  const fetchModels = async () => {
    setLoading(true);
    try {
      const list = await api.getModels();
      setModels(list);
      if (list.length > 0 && selectedId === null) {
        setSelectedId(list[0].id);
      }
    } catch (e) {
      console.error('Failed to load models', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const selectedModel = models.find((m) => m.id === selectedId) || models[0];

  const handleActivate = async (id: number) => {
    setActivating(true);
    try {
      await api.activateModel(id);
      await fetchModels();
    } catch (err: any) {
      alert(err.message || 'Activation failed');
    } finally {
      setActivating(false);
    }
  };

  const cmData = selectedModel?.metrics?.confusion_matrix || [];
  const classes = selectedModel?.metrics?.classes || ['DDoS', 'Malware', 'Intrusion'];

  // Confusion matrix heatmap ECharts config
  const heatmapData: [number, number, number][] = [];
  cmData.forEach((row, i) => {
    row.forEach((val, j) => {
      heatmapData.push([j, i, val]);
    });
  });

  const heatmapOptions = {
    tooltip: {
      position: 'top',
      formatter: (params: any) => {
        const val = params.value;
        return `True: ${classes[val[1]]}<br/>Pred: ${classes[val[0]]}<br/>Count: ${val[2]}`;
      },
    },
    grid: { height: '65%', top: '15%', left: '20%', right: '15%' },
    xAxis: {
      type: 'category',
      data: classes,
      name: 'Predicted Class',
      nameLocation: 'middle',
      nameGap: 30,
      axisLabel: { color: '#94a3b8' },
      axisLine: { lineStyle: { color: '#334155' } },
    },
    yAxis: {
      type: 'category',
      data: classes,
      name: 'Actual Ground Truth',
      nameLocation: 'middle',
      nameGap: 60,
      axisLabel: { color: '#94a3b8' },
      axisLine: { lineStyle: { color: '#334155' } },
    },
    visualMap: {
      min: 0,
      max: 2000,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '0%',
      inRange: {
        color: ['#0f172a', '#1e3a8a', '#3b82f6', '#60a5fa'],
      },
      textStyle: { color: '#94a3b8' },
    },
    series: [
      {
        name: 'Confusion Matrix',
        type: 'heatmap',
        data: heatmapData,
        label: {
          show: true,
          color: '#ffffff',
          fontWeight: 'bold',
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Methodology and Scientific Limitations Banner (Section 9.5 & 14.4) */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-start space-x-3 text-xs text-slate-300">
        <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-100">Model Evaluation Protocol & Provenance: </span>
          Models were trained and evaluated on 40,000 records using a <strong>70% Train / 15% Validation / 15% Held-Out Test</strong> stratified split.
          All post-event and leakage-prone columns (e.g. <code>Attack Signature</code>, <code>Action Taken</code>, <code>Severity Level</code>) were excluded from training features.
          The dataset does not contain benign records; metrics reflect attack-type discrimination among positive threats.
        </div>
      </div>

      {/* Model Selection Tabs / Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {models.map((m) => {
          const isSelected = selectedModel?.id === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setSelectedId(m.id)}
              className={`text-left p-4 rounded-xl border transition-all ${
                isSelected
                  ? 'bg-slate-800/90 border-blue-500 shadow-md shadow-blue-500/10'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-semibold text-slate-400 truncate">{m.version}</span>
                {m.is_active && (
                  <span className="px-2 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded font-bold uppercase">
                    Active Serving
                  </span>
                )}
              </div>
              <h4 className="text-sm font-bold text-slate-100 truncate">{m.name}</h4>
              <p className="text-xs text-slate-400 mt-1">Algorithm: {m.algorithm}</p>

              <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Macro-F1:</span>
                <span className="font-bold font-mono text-blue-400">
                  {m.metrics?.macro_f1 ? (m.metrics.macro_f1 * 100).toFixed(1) : '-'}%
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Detail Metrics View */}
      {selectedModel && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center space-x-3">
                <h3 className="text-base font-bold text-slate-100">{selectedModel.name}</h3>
                <span className="px-2.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-mono rounded font-semibold">
                  {selectedModel.version}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {selectedModel.metrics?.test_split_provenance || 'Evaluated on held-out test split.'}
              </p>
            </div>

            <div className="flex items-center space-x-3">
              {!selectedModel.is_active && user?.role === 'administrator' && (
                <button
                  onClick={() => handleActivate(selectedModel.id)}
                  disabled={activating}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors shadow-md shadow-emerald-600/20 flex items-center space-x-1.5"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>{activating ? 'Activating...' : 'Activate for Serving'}</span>
                </button>
              )}
              {selectedModel.is_active && (
                <div className="flex items-center space-x-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Currently Serving Live Inferences</span>
                </div>
              )}
            </div>
          </div>

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 uppercase font-semibold">Macro-F1 Score</span>
              <p className="text-2xl font-bold font-mono text-blue-400 mt-1">
                {selectedModel.metrics?.macro_f1 ? (selectedModel.metrics.macro_f1 * 100).toFixed(1) : '-'}%
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Primary selection metric</p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 uppercase font-semibold">Accuracy Score</span>
              <p className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                {selectedModel.metrics?.accuracy ? (selectedModel.metrics.accuracy * 100).toFixed(1) : '-'}%
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Balanced multi-class accuracy</p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 uppercase font-semibold">Weighted-F1 Score</span>
              <p className="text-2xl font-bold font-mono text-purple-400 mt-1">
                {selectedModel.metrics?.weighted_f1 ? (selectedModel.metrics.weighted_f1 * 100).toFixed(1) : '-'}%
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Support-weighted harmonic mean</p>
            </div>
          </div>

          {/* Class-wise Metrics Table & Confusion Matrix Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
            {/* Per-class Metrics Table */}
            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                Class-wise Precision, Recall & F1
              </h4>
              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Class</th>
                      <th className="py-2.5 px-3">Precision</th>
                      <th className="py-2.5 px-3">Recall</th>
                      <th className="py-2.5 px-3">F1-Score</th>
                      <th className="py-2.5 px-3">Support</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 font-mono">
                    {Object.entries(selectedModel.metrics?.per_class || {}).map(([cName, stats]) => (
                      <tr key={cName} className="hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 font-sans font-bold text-slate-200">{cName}</td>
                        <td className="py-2.5 px-3 text-blue-400">{(stats.precision * 100).toFixed(1)}%</td>
                        <td className="py-2.5 px-3 text-amber-400">{(stats.recall * 100).toFixed(1)}%</td>
                        <td className="py-2.5 px-3 text-emerald-400 font-bold">{(stats.f1 * 100).toFixed(1)}%</td>
                        <td className="py-2.5 px-3 text-slate-400">{stats.support.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Feature importance list if available */}
              {selectedModel.metrics?.feature_importance && (
                <div className="mt-5">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Relative Feature Importance Attribution
                  </h4>
                  <div className="space-y-2">
                    {selectedModel.metrics.feature_importance.map((f) => (
                      <div key={f.feature} className="text-xs space-y-1">
                        <div className="flex justify-between text-slate-400">
                          <span>{f.feature}</span>
                          <span className="font-mono text-slate-200">{(f.importance * 100).toFixed(1)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${f.importance * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confusion Matrix Heatmap */}
            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                Confusion Matrix Heatmap (Held-Out Test Set)
              </h4>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <EChartWrapper options={heatmapOptions} style={{ height: '280px' }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
