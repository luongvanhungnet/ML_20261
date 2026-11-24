import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  Activity,
  AlertTriangle,
  Flame,
  Info,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import { api } from '../services/api';
import { KPIResponse, TimeSeriesPoint, DistributionItem, AlertItem } from '../types';
import { EChartWrapper } from '../components/EChartWrapper';

interface OverviewPageProps {
  onNavigateTab: (tab: string) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ onNavigateTab }) => {
  const [kpis, setKpis] = useState<KPIResponse | null>(null);
  const [timeseries, setTimeseries] = useState<TimeSeriesPoint[]>([]);
  const [attackDist, setAttackDist] = useState<DistributionItem[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [kpiRes, tsRes, distRes, alertsRes] = await Promise.all([
        api.getDashboardSummary(),
        api.getTimeseries(),
        api.getAttackTypes(),
        api.getAlerts({ page: 1, page_size: 5 }),
      ]);
      setKpis(kpiRes);
      setTimeseries(tsRes);
      setAttackDist(distRes);
      setRecentAlerts(alertsRes.items);
    } catch (e) {
      console.error('Failed to load overview data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Time series chart config
  const timeseriesOptions = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#f1f5f9' },
    },
    legend: {
      data: ['Total Events', 'DDoS', 'Malware', 'Intrusion'],
      textStyle: { color: '#94a3b8' },
      top: 0,
    },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '40px', containLabel: true },
    xAxis: {
      type: 'category',
      data: timeseries.map((t) => t.time),
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: { color: '#94a3b8' },
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#334155' } },
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: { color: '#94a3b8' },
    },
    series: [
      {
        name: 'Total Events',
        type: 'line',
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 3, color: '#3b82f6' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.0)' },
            ],
          },
        },
        data: timeseries.map((t) => t.total_count),
      },
      {
        name: 'DDoS',
        type: 'line',
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2, color: '#ef4444' },
        data: timeseries.map((t) => t.ddos_count),
      },
      {
        name: 'Malware',
        type: 'line',
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2, color: '#f59e0b' },
        data: timeseries.map((t) => t.malware_count),
      },
      {
        name: 'Intrusion',
        type: 'line',
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2, color: '#8b5cf6' },
        data: timeseries.map((t) => t.intrusion_count),
      },
    ],
  };

  // Attack distribution donut chart config
  const attackDistOptions = {
    tooltip: {
      trigger: 'item',
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#f1f5f9' },
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      bottom: '0%',
      textStyle: { color: '#94a3b8' },
    },
    color: ['#ef4444', '#f59e0b', '#8b5cf6', '#3b82f6'],
    series: [
      {
        name: 'Attack Types',
        type: 'pie',
        radius: ['50%', '75%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#0f172a',
          borderWidth: 2,
        },
        label: { show: false },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold',
            color: '#f8fafc',
          },
        },
        data: attackDist.map((item) => ({
          name: item.name,
          value: item.count,
        })),
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Provenance & Notice Banner */}
      <div className="bg-blue-950/40 border border-blue-900/60 rounded-xl p-4 flex items-start space-x-3 text-sm text-blue-200">
        <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-blue-100">Dataset Provenance & Classification Notice: </span>
          All records reflect observed network telemetry from the <code className="text-xs bg-blue-900/50 px-1 py-0.5 rounded">cybersecurity_attacks</code> dataset.
          Ground-truth dataset labels consist of 3 balanced attack classes (DDoS, Malware, Intrusion) with zero verified benign traffic.
          Multiclass model probabilities indicate relative likelihood among trained attack classes, not future probability of attack.
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Records */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Records</span>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-100">
            {kpis?.total_records.toLocaleString() || '...'}
          </div>
          <p className="text-xs text-slate-400 mt-2 flex items-center space-x-1">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span>{kpis?.time_span_start} &rarr; {kpis?.time_span_end}</span>
          </p>
        </div>

        {/* Card 2: Categorized Attacks */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Classified Attacks</span>
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-100">
            {kpis?.attack_events.toLocaleString() || '...'}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Primary category: <span className="text-purple-400 font-semibold">{kpis?.primary_attack_type || 'DDoS'}</span>
          </p>
        </div>

        {/* Card 3: Active Alerts */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Open Triage Alerts</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-400">
            {kpis?.open_alerts.toLocaleString() || '0'}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Pending analyst investigation
          </p>
        </div>

        {/* Card 4: High Severity Events */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">High Severity Events</span>
            <div className="p-2 bg-red-500/10 text-red-400 rounded-lg">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-red-400">
            {kpis?.high_severity_count.toLocaleString() || '0'}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {kpis?.total_records
              ? `${((kpis.high_severity_count / kpis.total_records) * 100).toFixed(1)}% of total volume`
              : 'N/A'}
          </p>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Time-Series Trend Chart (2 Cols) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                Historical Event Chronology & Attack Trends
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Monthly record counts across attack classifications</p>
            </div>
            <span className="text-xs px-2.5 py-1 bg-slate-800 text-slate-300 rounded border border-slate-700">
              Monthly Buckets
            </span>
          </div>
          <EChartWrapper options={timeseriesOptions} style={{ height: '310px' }} loading={loading} />
        </div>

        {/* Attack Type Distribution Donut (1 Col) */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              Attack Type Distribution
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Ground-truth multiclass breakdown</p>
          </div>
          <EChartWrapper options={attackDistOptions} style={{ height: '310px' }} loading={loading} />
        </div>
      </div>

      {/* Recent Alerts Quick Preview */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              Recent Priority Security Alerts
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Events requiring immediate triage review</p>
          </div>
          <button
            onClick={() => onNavigateTab('alerts')}
            className="flex items-center space-x-1 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
          >
            <span>View all in Alerts Queue</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="divide-y divide-slate-800/80 overflow-x-auto">
          {recentAlerts.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">
              No open alerts recorded at this time.
            </div>
          ) : (
            recentAlerts.map((alert) => (
              <div key={alert.id} className="p-4 hover:bg-slate-800/40 transition-colors flex items-center justify-between">
                <div className="flex items-start space-x-3">
                  <span
                    className={`mt-1 text-[11px] px-2 py-0.5 rounded font-bold uppercase ${
                      alert.severity === 'High'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {alert.severity}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-200">{alert.reason}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {alert.source_ip && `Source: ${alert.source_ip}`} &bull; Status: <span className="text-blue-400">{alert.status}</span> &bull; {new Date(alert.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onNavigateTab('alerts')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors ml-4 whitespace-nowrap"
                >
                  Triage &rarr;
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
