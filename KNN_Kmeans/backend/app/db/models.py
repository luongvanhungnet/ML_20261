import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey, JSON
)
from sqlalchemy.orm import relationship
from app.db.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="administrator", nullable=False)  # administrator, analyst
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)


class DatasetImport(Base):
    __tablename__ = "dataset_imports"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    checksum = Column(String(64), nullable=True)
    status = Column(String(50), default="completed", nullable=False)  # completed, failed, processing
    total_rows = Column(Integer, default=0, nullable=False)
    accepted_rows = Column(Integer, default=0, nullable=False)
    rejected_rows = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    traffic_records = relationship("NetworkTraffic", back_populates="dataset_import")


class NetworkTraffic(Base):
    __tablename__ = "network_traffic"

    id = Column(Integer, primary_key=True, index=True)
    dataset_import_id = Column(Integer, ForeignKey("dataset_imports.id", ondelete="SET NULL"), nullable=True, index=True)
    event_timestamp = Column(DateTime, index=True, nullable=True)
    source_ip = Column(String(64), index=True, nullable=True)
    destination_ip = Column(String(64), index=True, nullable=True)
    source_port = Column(Integer, nullable=True)
    destination_port = Column(Integer, index=True, nullable=True)
    protocol = Column(String(20), index=True, nullable=True)
    packet_length = Column(Integer, nullable=True)
    packet_type = Column(String(50), index=True, nullable=True)
    traffic_type = Column(String(50), index=True, nullable=True)
    payload_data = Column(Text, nullable=True)
    malware_indicators = Column(String(100), nullable=True)
    anomaly_scores = Column(Float, nullable=True)
    alerts_warnings = Column(String(100), nullable=True)
    attack_type = Column(String(50), index=True, nullable=True)  # Ground-truth: DDoS, Malware, Intrusion
    attack_signature = Column(String(100), nullable=True)
    action_taken = Column(String(50), nullable=True)
    severity_level = Column(String(50), index=True, nullable=True)
    user_information = Column(String(255), nullable=True)
    device_information = Column(String(255), nullable=True)
    network_segment = Column(String(50), nullable=True)
    geo_location_data = Column(String(255), nullable=True)
    proxy_information = Column(String(64), nullable=True)
    firewall_logs = Column(String(100), nullable=True)
    ids_ips_alerts = Column(String(100), nullable=True)
    log_source = Column(String(50), nullable=True)
    raw_metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    dataset_import = relationship("DatasetImport", back_populates="traffic_records")
    alerts = relationship("SecurityAlert", back_populates="traffic_record")
    predictions = relationship("Prediction", back_populates="traffic_record")


class ModelVersion(Base):
    __tablename__ = "model_versions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    version = Column(String(50), unique=True, index=True, nullable=False)
    algorithm = Column(String(50), nullable=False)  # XGBoost, Random Forest, Logistic Regression, Dummy
    artifact_path = Column(String(255), nullable=True)
    checksum = Column(String(64), nullable=True)
    feature_schema = Column(JSON, nullable=True)
    metrics = Column(JSON, nullable=True)  # confusion matrix, macro f1, accuracy, per class metrics
    is_active = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    predictions = relationship("Prediction", back_populates="model_version")


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    traffic_id = Column(Integer, ForeignKey("network_traffic.id", ondelete="SET NULL"), nullable=True, index=True)
    model_version_id = Column(Integer, ForeignKey("model_versions.id", ondelete="SET NULL"), nullable=True, index=True)
    predicted_class = Column(String(50), nullable=False)
    class_scores = Column(JSON, nullable=False)  # {"DDoS": 0.72, "Malware": 0.18, "Intrusion": 0.10}
    anomaly_score = Column(Float, nullable=True)
    input_features = Column(JSON, nullable=True)
    interpretation = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    traffic_record = relationship("NetworkTraffic", back_populates="predictions")
    model_version = relationship("ModelVersion", back_populates="predictions")


class SecurityAlert(Base):
    __tablename__ = "security_alerts"

    id = Column(Integer, primary_key=True, index=True)
    traffic_id = Column(Integer, ForeignKey("network_traffic.id", ondelete="CASCADE"), nullable=True, index=True)
    prediction_id = Column(Integer, ForeignKey("predictions.id", ondelete="SET NULL"), nullable=True)
    rule_id = Column(String(100), nullable=True)
    severity = Column(String(50), index=True, nullable=False)  # High, Medium, Low
    status = Column(String(50), default="new", index=True, nullable=False)  # new, investigating, resolved, dismissed
    reason = Column(Text, nullable=False)
    review_notes = Column(Text, nullable=True)
    reviewed_by = Column(String(100), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    traffic_record = relationship("NetworkTraffic", back_populates="alerts")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    actor_id = Column(Integer, nullable=True)
    actor_email = Column(String(255), nullable=True)
    action = Column(String(100), index=True, nullable=False)  # LOGIN, IMPORT, PREDICT, UPDATE_ALERT, etc.
    entity_type = Column(String(100), nullable=True)
    entity_id = Column(String(100), nullable=True)
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
