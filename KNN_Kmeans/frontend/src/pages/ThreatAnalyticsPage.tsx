import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { NetworkAnalyticsResponse, DistributionItem } from '../types';
import { EChartWrapper } from '../components/EChartWrapper';
import { ShieldAlert, Radio, Server, Network } from 'lucide-react';

export const ThreatAnalyticsPage: React.FC = () => {
  const [networkData, setNetworkData] = useState<NetworkAnalyticsResponse | null>(null);
  const [attackDist, setAttackDist] = useState<DistributionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [netRes, attRes] = await Promise.all([
          api.getNetworkAnalytics(),
          api.getAttackTypes(),
        ]);
        setNetworkData(netRes);
        setAttackDist(attRes);
      } catch (e) {
        console.error('Failed to load threat analytics', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Top destination ports chart
  const portOptions = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '30px', containLabel: true },
    xAxis: {
      type: 'category',
      data: networkData?.top_destination_ports.map((p) => `Port ${p.name}`) || [],
      axisLabel: { color: '#94a3b8' },
      axisLine: { lineStyle: { color: '#334155' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#94a3b8' },
      splitLine: { lineStyle: { color: '#1e293b' } },
    },
    series: [
      {
        name: 'Record Count',
        type: 'bar',
        barWidth: '45%',
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#3b82f6' },
              { offset: 1, color: '#1d4ed8' },
            ],
          },
        },
        data: networkData?.top_destination_ports.map((p) => p.count) || [],
      },
    ],
  };

  // Protocols pie chart
  const protocolOptions = {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: '0%', textStyle: { color: '#94a3b8' } },
    color: ['#06b6d4', '#3b82f6', '#8b5cf6'],
    series: [
      {
        type: 'pie',
        radius: ['45%', '70%'],
        itemStyle: { borderRadius: 6, borderColor: '#0f172a', borderWidth: 2 },
        data: networkData?.protocols.map((pr) => ({ name: pr.name, value: pr.count })) || [],
      },
    ],
  };

  // Traffic types radar/bar chart
  const trafficTypeOptions = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '30px', containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: { color: '#94a3b8' },
      splitLine: { lineStyle: { color: '#1e293b' } },
    },
    yAxis: {
      type: 'category',
      data: networkData?.traffic_types.map((t) => t.name) || [],
      axisLabel: { color: '#94a3b8' },
      axisLine: { lineStyle: { color: '#334155' } },
    },
    series: [
      {
        type: 'bar',
        itemStyle: {
          borderRadius: [0, 6, 6, 0],
          color: '#10b981',
        },
        data: networkData?.traffic_types.map((t) => t.count) || [],
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Header Cards Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex items-center space-x-4">
          <div className="p-3 bg-blue-600/20 text-blue-400 rounded-xl">
            <Radio className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase font-semibold">Active Protocols</p>
            <p className="text-lg font-bold text-slate-100">TCP, UDP, ICMP</p>
            <p className="text-xs text-slate-400">Evenly represented (~33.3% each)</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex items-center space-x-4">
          <div className="p-3 bg-purple-600/20 text-purple-400 rounded-xl">
            <Network className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase font-semibold">Network Segmentation</p>
            <p className="text-lg font-bold text-slate-100">Segments A, B, C</p>
            <p className="text-xs text-slate-400">Telemetry across internal zones</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex items-center space-x-4">
          <div className="p-3 bg-rose-600/20 text-rose-400 rounded-xl">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase font-semibold">Identified Attack Classes</p>
            <p className="text-lg font-bold text-slate-100">DDoS, Malware, Intrusion</p>
            <p className="text-xs text-slate-400">Candidate multiclass target</p>
          </div>
        </div>
      </div>

      {/* Grid of ECharts Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Destination Ports */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              Top Destination Ports Volume
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Most targeted ports in telemetry dataset</p>
          </div>
          <EChartWrapper options={portOptions} style={{ height: '280px' }} loading={loading} />
        </div>

        {/* Protocol Distribution */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              Protocol Telemetry Share
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Transport protocol composition</p>
          </div>
          <EChartWrapper options={protocolOptions} style={{ height: '280px' }} loading={loading} />
        </div>

        {/* Traffic Type Distribution */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              Application Traffic Types
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">HTTP, DNS, FTP distribution</p>
          </div>
          <EChartWrapper options={trafficTypeOptions} style={{ height: '280px' }} loading={loading} />
        </div>

        {/* Top Source & Destination IP Addresses Table */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm flex flex-col">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              Top Observed IP Endpoints
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">High-frequency source and destination addresses</p>
          </div>

          <div className="grid grid-cols-2 gap-4 flex-1">
            <div>
              <p className="text-xs font-semibold text-blue-400 mb-2 uppercase">Source IPs</p>
              <div className="space-y-1.5 font-mono text-xs">
                {networkData?.top_source_ips.map((ip) => (
                  <div key={ip.name} className="flex justify-between p-2 bg-slate-950 rounded border border-slate-800">
                    <span className="text-slate-300 truncate">{ip.name}</span>
                    <span className="text-slate-400 font-sans">{ip.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-purple-400 mb-2 uppercase">Destination IPs</p>
              <div className="space-y-1.5 font-mono text-xs">
                {networkData?.top_destination_ips.map((ip) => (
                  <div key={ip.name} className="flex justify-between p-2 bg-slate-950 rounded border border-slate-800">
                    <span className="text-slate-300 truncate">{ip.name}</span>
                    <span className="text-slate-400 font-sans">{ip.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
