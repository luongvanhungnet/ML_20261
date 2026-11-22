export interface User {
  id: number;
  email: string;
  role: 'administrator' | 'analyst';
  created_at: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
}

export interface KPIResponse {
  total_records: number;
  attack_events: number;
  open_alerts: number;
  high_severity_count: number;
  time_span_start: string | null;
  time_span_end: string | null;
  primary_attack_type: string | null;
  data_provenance: string;
}

export interface TimeSeriesPoint {
  time: string;
  total_count: number;
  ddos_count: number;
  malware_count: number;
  intrusion_count: number;
}

export interface DistributionItem {
  name: string;
  count: number;
  percentage: number;
}

export interface NetworkAnalyticsResponse {
  top_source_ips: DistributionItem[];
  top_destination_ips: DistributionItem[];
  protocols: DistributionItem[];
  top_destination_ports: DistributionItem[];
  traffic_types: DistributionItem[];
  network_segments: DistributionItem[];
}

export interface NetworkTrafficItem {
  id: number;
  dataset_import_id?: number | null;
  event_timestamp?: string | null;
  source_ip?: string | null;
  destination_ip?: string | null;
  source_port?: number | null;
  destination_port?: number | null;
  protocol?: string | null;
  packet_length?: number | null;
  packet_type?: string | null;
  traffic_type?: string | null;
  payload_data?: string | null;
  malware_indicators?: string | null;
  anomaly_scores?: number | null;
  alerts_warnings?: string | null;
  attack_type?: string | null;
  attack_signature?: string | null;
  action_taken?: string | null;
  severity_level?: string | null;
  user_information?: string | null;
  device_information?: string | null;
  network_segment?: string | null;
  geo_location_data?: string | null;
  proxy_information?: string | null;
  firewall_logs?: string | null;
  ids_ips_alerts?: string | null;
  log_source?: string | null;
  created_at: string;
}

export interface TrafficListResponse {
  total: number;
  page: number;
  page_size: number;
  items: NetworkTrafficItem[];
}

export interface PredictionRequest {
  source_ip?: string;
  destination_ip?: string;
  source_port: number;
  destination_port: number;
  protocol: string;
  packet_length: number;
  packet_type?: string;
  traffic_type?: string;
  network_segment?: string;
  traffic_id?: number;
}

export interface PredictionResponse {
  prediction_id: number;
  task: string;
  model_version: string;
  algorithm: string;
  predicted_class: string;
  class_probabilities: Record<string, number>;
  anomaly_score?: number | null;
  interpretation: string;
  created_at: string;
}

export interface PredictionHistoryItem {
  id: number;
  traffic_id?: number | null;
  model_version_id?: number | null;
  model_name?: string | null;
  predicted_class: string;
  class_scores: Record<string, number>;
  anomaly_score?: number | null;
  input_features?: Record<string, any> | null;
  interpretation?: string | null;
  created_at: string;
}

export interface AlertItem {
  id: number;
  traffic_id?: number | null;
  prediction_id?: number | null;
  rule_id?: string | null;
  severity: 'High' | 'Medium' | 'Low';
  status: 'new' | 'investigating' | 'resolved' | 'dismissed';
  reason: string;
  review_notes?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  source_ip?: string | null;
  destination_ip?: string | null;
  attack_type?: string | null;
}

export interface ModelVersionItem {
  id: number;
  name: string;
  version: string;
  algorithm: string;
  is_active: boolean;
  feature_schema?: any;
  metrics?: {
    accuracy: number;
    macro_f1: number;
    weighted_f1: number;
    test_split_provenance: string;
    classes: string[];
    per_class: Record<string, { precision: number; recall: number; f1: number; support: number }>;
    confusion_matrix: number[][];
    feature_importance?: { feature: string; importance: number }[];
    limitations_note?: string;
  };
  created_at: string;
}

export interface DatasetImportItem {
  id: number;
  filename: string;
  status: string;
  total_rows: number;
  accepted_rows: number;
  rejected_rows: number;
  created_at: string;
}

export interface DataQualitySummary {
  total_records: number;
  columns: string[];
  missing_rates: Record<string, number>;
  null_counts: Record<string, number>;
  attack_distribution: Record<string, number>;
  severity_distribution: Record<string, number>;
  protocol_distribution: Record<string, number>;
  time_span: { start: string | null; end: string | null };
  duplicate_rows_estimated: number;
  data_source_note: string;
}

export interface AuditLogItem {
  id: number;
  actor_id?: number | null;
  actor_email?: string | null;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  details?: any;
  created_at: string;
}
