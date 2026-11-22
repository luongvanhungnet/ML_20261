import datetime
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field, ConfigDict

# ----------------- Auth Schemas -----------------
class LoginRequest(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    role: str
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# ----------------- Ingestion & Quality Schemas -----------------
class DatasetImportResponse(BaseModel):
    id: int
    filename: str
    status: str
    total_rows: int
    accepted_rows: int
    rejected_rows: int
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

class DataQualitySummary(BaseModel):
    total_records: int
    columns: List[str]
    missing_rates: Dict[str, float]
    null_counts: Dict[str, int]
    attack_distribution: Dict[str, int]
    severity_distribution: Dict[str, int]
    protocol_distribution: Dict[str, int]
    time_span: Dict[str, Optional[str]]
    duplicate_rows_estimated: int
    data_source_note: str

# ----------------- Traffic Schemas -----------------
class NetworkTrafficItem(BaseModel):
    id: int
    dataset_import_id: Optional[int] = None
    event_timestamp: Optional[datetime.datetime] = None
    source_ip: Optional[str] = None
    destination_ip: Optional[str] = None
    source_port: Optional[int] = None
    destination_port: Optional[int] = None
    protocol: Optional[str] = None
    packet_length: Optional[int] = None
    packet_type: Optional[str] = None
    traffic_type: Optional[str] = None
    payload_data: Optional[str] = None
    malware_indicators: Optional[str] = None
    anomaly_scores: Optional[float] = None
    alerts_warnings: Optional[str] = None
    attack_type: Optional[str] = None
    attack_signature: Optional[str] = None
    action_taken: Optional[str] = None
    severity_level: Optional[str] = None
    user_information: Optional[str] = None
    device_information: Optional[str] = None
    network_segment: Optional[str] = None
    geo_location_data: Optional[str] = None
    proxy_information: Optional[str] = None
    firewall_logs: Optional[str] = None
    ids_ips_alerts: Optional[str] = None
    log_source: Optional[str] = None
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

class TrafficListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[NetworkTrafficItem]

# ----------------- Dashboard & Analytics Schemas -----------------
class KPIResponse(BaseModel):
    total_records: int
    attack_events: int
    open_alerts: int
    high_severity_count: int
    time_span_start: Optional[str] = None
    time_span_end: Optional[str] = None
    primary_attack_type: Optional[str] = None
    data_provenance: str = "Ground-truth dataset records"

class TimeSeriesPoint(BaseModel):
    time: str
    total_count: int
    ddos_count: int = 0
    malware_count: int = 0
    intrusion_count: int = 0

class DistributionItem(BaseModel):
    name: str
    count: int
    percentage: float

class NetworkAnalyticsResponse(BaseModel):
    top_source_ips: List[DistributionItem]
    top_destination_ips: List[DistributionItem]
    protocols: List[DistributionItem]
    top_destination_ports: List[DistributionItem]
    traffic_types: List[DistributionItem]
    network_segments: List[DistributionItem]

# ----------------- Prediction Schemas -----------------
class PredictionRequest(BaseModel):
    source_ip: Optional[str] = "192.168.1.100"
    destination_ip: Optional[str] = "10.0.0.1"
    source_port: int = Field(..., ge=1, le=65535)
    destination_port: int = Field(..., ge=1, le=65535)
    protocol: str = Field(..., description="TCP, UDP, ICMP")
    packet_length: int = Field(..., ge=0)
    packet_type: Optional[str] = "Data"
    traffic_type: Optional[str] = "HTTP"
    network_segment: Optional[str] = "Segment A"
    traffic_id: Optional[int] = None

class PredictionResponse(BaseModel):
    prediction_id: int
    task: str = "attack_type_classification"
    model_version: str
    algorithm: str
    predicted_class: str
    class_probabilities: Dict[str, float]
    anomaly_score: Optional[float] = None
    interpretation: str
    created_at: datetime.datetime

class PredictionHistoryItem(BaseModel):
    id: int
    traffic_id: Optional[int] = None
    model_version_id: Optional[int] = None
    model_name: Optional[str] = None
    predicted_class: str
    class_scores: Dict[str, float]
    anomaly_score: Optional[float] = None
    input_features: Optional[Dict[str, Any]] = None
    interpretation: Optional[str] = None
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

class PredictionHistoryResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[PredictionHistoryItem]

# ----------------- Alert Schemas -----------------
class AlertItem(BaseModel):
    id: int
    traffic_id: Optional[int] = None
    prediction_id: Optional[int] = None
    rule_id: Optional[str] = None
    severity: str
    status: str
    reason: str
    review_notes: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime.datetime] = None
    created_at: datetime.datetime
    source_ip: Optional[str] = None
    destination_ip: Optional[str] = None
    attack_type: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class AlertListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[AlertItem]

class AlertUpdateRequest(BaseModel):
    status: Optional[str] = Field(None, description="new, investigating, resolved, dismissed")
    review_notes: Optional[str] = None

# ----------------- Model Evaluation Schemas -----------------
class ModelVersionItem(BaseModel):
    id: int
    name: str
    version: str
    algorithm: str
    is_active: bool
    feature_schema: Optional[Any] = None
    metrics: Optional[Any] = None
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

# ----------------- Audit Log Schemas -----------------
class AuditLogItem(BaseModel):
    id: int
    actor_id: Optional[int] = None
    actor_email: Optional[str] = None
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    details: Optional[Any] = None
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

class AuditLogResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[AuditLogItem]
