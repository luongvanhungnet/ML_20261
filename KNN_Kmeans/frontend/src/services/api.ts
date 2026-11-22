import {
  User, KPIResponse, TimeSeriesPoint, DistributionItem, NetworkAnalyticsResponse,
  TrafficListResponse, NetworkTrafficItem, PredictionRequest, PredictionResponse,
  PredictionHistoryItem, AlertItem, ModelVersionItem, DatasetImportItem,
  DataQualitySummary, AuditLogItem
} from '../types';

const API_BASE = '/api/v1';

export const getStoredToken = (): string | null => {
  return localStorage.getItem('cyber_token');
};

export const setStoredToken = (token: string | null) => {
  if (token) {
    localStorage.setItem('cyber_token', token);
  } else {
    localStorage.removeItem('cyber_token');
  }
};

async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = 'API request failed';
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.detail || errorDetail;
    } catch {
      errorDetail = response.statusText;
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<{ access_token: string; user: User }> {
    const res = await apiFetch<{ access_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setStoredToken(res.access_token);
    return res;
  },

  async logout(): Promise<void> {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } finally {
      setStoredToken(null);
    }
  },

  async getMe(): Promise<User> {
    return apiFetch<User>('/auth/me');
  },

  // Dashboard
  async getDashboardSummary(): Promise<KPIResponse> {
    return apiFetch<KPIResponse>('/dashboard/summary');
  },

  async getTimeseries(): Promise<TimeSeriesPoint[]> {
    return apiFetch<TimeSeriesPoint[]>('/dashboard/timeseries');
  },

  async getAttackTypes(): Promise<DistributionItem[]> {
    return apiFetch<DistributionItem[]>('/dashboard/attack-types');
  },

  async getNetworkAnalytics(): Promise<NetworkAnalyticsResponse> {
    return apiFetch<NetworkAnalyticsResponse>('/dashboard/network');
  },

  // Traffic
  async getTraffic(params: {
    page?: number;
    page_size?: number;
    search?: string;
    protocol?: string;
    attack_type?: string;
    severity_level?: string;
    packet_type?: string;
    traffic_type?: string;
    sort_by?: string;
    sort_order?: string;
  } = {}): Promise<TrafficListResponse> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page.toString());
    if (params.page_size) query.set('page_size', params.page_size.toString());
    if (params.search) query.set('search', params.search);
    if (params.protocol) query.set('protocol', params.protocol);
    if (params.attack_type) query.set('attack_type', params.attack_type);
    if (params.severity_level) query.set('severity_level', params.severity_level);
    if (params.packet_type) query.set('packet_type', params.packet_type);
    if (params.traffic_type) query.set('traffic_type', params.traffic_type);
    if (params.sort_by) query.set('sort_by', params.sort_by);
    if (params.sort_order) query.set('sort_order', params.sort_order);

    return apiFetch<TrafficListResponse>(`/traffic?${query.toString()}`);
  },

  async getTrafficDetail(id: number): Promise<NetworkTrafficItem> {
    return apiFetch<NetworkTrafficItem>(`/traffic/${id}`);
  },

  getExportUrl(params: { search?: string; protocol?: string; attack_type?: string; severity_level?: string } = {}): string {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.protocol) query.set('protocol', params.protocol);
    if (params.attack_type) query.set('attack_type', params.attack_type);
    if (params.severity_level) query.set('severity_level', params.severity_level);
    return `${API_BASE}/traffic/export?${query.toString()}`;
  },

  // Predictions
  async predictThreat(payload: PredictionRequest): Promise<PredictionResponse> {
    return apiFetch<PredictionResponse>('/predictions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getPredictionHistory(page = 1, pageSize = 20): Promise<{ total: number; page: number; page_size: number; items: PredictionHistoryItem[] }> {
    return apiFetch(`/predictions?page=${page}&page_size=${pageSize}`);
  },

  // Alerts
  async getAlerts(params: { page?: number; page_size?: number; status?: string; severity?: string } = {}): Promise<{ total: number; page: number; page_size: number; items: AlertItem[] }> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page.toString());
    if (params.page_size) query.set('page_size', params.page_size.toString());
    if (params.status) query.set('status', params.status);
    if (params.severity) query.set('severity', params.severity);
    return apiFetch(`/alerts?${query.toString()}`);
  },

  async updateAlert(id: number, data: { status?: string; review_notes?: string }): Promise<any> {
    return apiFetch(`/alerts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // Models
  async getModels(): Promise<ModelVersionItem[]> {
    return apiFetch<ModelVersionItem[]>('/models');
  },

  async getModelMetrics(id: number): Promise<any> {
    return apiFetch(`/models/${id}/metrics`);
  },

  async activateModel(id: number): Promise<any> {
    return apiFetch(`/models/${id}/activate`, { method: 'POST' });
  },

  // Datasets
  async uploadDataset(file: File): Promise<DatasetImportItem> {
    const formData = new FormData();
    formData.append('file', file);
    return apiFetch<DatasetImportItem>('/datasets/import', {
      method: 'POST',
      body: formData,
    });
  },

  async getDatasetImports(): Promise<DatasetImportItem[]> {
    return apiFetch<DatasetImportItem[]>('/datasets/imports');
  },

  async getDataQuality(): Promise<DataQualitySummary> {
    return apiFetch<DataQualitySummary>('/datasets/quality');
  },

  // Audit Logs
  async getAuditLogs(page = 1, pageSize = 25): Promise<{ total: number; page: number; page_size: number; items: AuditLogItem[] }> {
    return apiFetch(`/audit-logs?page=${page}&page_size=${pageSize}`);
  },
};
