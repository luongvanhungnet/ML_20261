import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface EChartWrapperProps {
  options: any;
  style?: React.CSSProperties;
  className?: string;
  loading?: boolean;
}

export const EChartWrapper: React.FC<EChartWrapperProps> = ({
  options,
  style = { height: '320px', width: '100%' },
  className = '',
  loading = false,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, 'dark', {
        renderer: 'svg',
      });
    }

    chartInstance.current.setOption(
      {
        backgroundColor: 'transparent',
        ...options,
      },
      true
    );

    const resizeObserver = new ResizeObserver(() => {
      chartInstance.current?.resize();
    });
    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [options]);

  useEffect(() => {
    if (chartInstance.current) {
      if (loading) {
        chartInstance.current.showLoading({
          text: 'Loading telemetry...',
          color: '#3b82f6',
          textColor: '#94a3b8',
          maskColor: 'rgba(15, 23, 42, 0.6)',
        });
      } else {
        chartInstance.current.hideLoading();
      }
    }
  }, [loading]);

  useEffect(() => {
    return () => {
      chartInstance.current?.dispose();
      chartInstance.current = null;
    };
  }, []);

  return <div ref={chartRef} style={style} className={className} />;
};
