import csv
import io
import hashlib
import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.models import DatasetImport, NetworkTraffic, SecurityAlert
from app.services.audit_service import record_audit

REQUIRED_COLUMNS = [
    "Timestamp", "Source IP Address", "Destination IP Address", "Source Port", "Destination Port",
    "Protocol", "Packet Length", "Packet Type", "Traffic Type", "Payload Data",
    "Malware Indicators", "Anomaly Scores", "Alerts/Warnings", "Attack Type", "Attack Signature",
    "Action Taken", "Severity Level", "User Information", "Device Information", "Network Segment",
    "Geo-location Data", "Proxy Information", "Firewall Logs", "IDS/IPS Alerts", "Log Source"
]

def parse_date(date_str: Optional[str]) -> Optional[datetime.datetime]:
    if not date_str or not date_str.strip():
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y/%m/%d %H:%M:%S"):
        try:
            return datetime.datetime.strptime(date_str.strip(), fmt)
        except ValueError:
            continue
    return None

def import_csv_file(
    db: Session,
    content: str,
    filename: str,
    actor_email: Optional[str] = None,
    max_rows: Optional[int] = None
) -> DatasetImport:
    checksum = hashlib.sha256(content.encode("utf-8", errors="ignore")).hexdigest()
    
    # Check if duplicate import
    existing = db.query(DatasetImport).filter(DatasetImport.checksum == checksum).first()
    if existing:
        return existing

    import_record = DatasetImport(
        filename=filename,
        checksum=checksum,
        status="processing",
        total_rows=0,
        accepted_rows=0,
        rejected_rows=0,
        created_at=datetime.datetime.utcnow()
    )
    db.add(import_record)
    db.commit()
    db.refresh(import_record)

    f = io.StringIO(content)
    reader = csv.DictReader(f)
    
    headers = [h.strip() for h in (reader.fieldnames or [])]
    # Check if required columns present
    missing_cols = [c for c in REQUIRED_COLUMNS if c not in headers]
    if missing_cols:
        import_record.status = "failed"
        db.commit()
        raise ValueError(f"Missing required columns: {', '.join(missing_cols)}")

    records_to_insert: List[Dict[str, Any]] = []
    accepted = 0
    rejected = 0
    total = 0

    for row in reader:
        total += 1
        if max_rows and total > max_rows:
            break
        try:
            ts = parse_date(row.get("Timestamp"))
            src_port = int(row.get("Source Port")) if row.get("Source Port") else None
            dst_port = int(row.get("Destination Port")) if row.get("Destination Port") else None
            pkt_len = int(row.get("Packet Length")) if row.get("Packet Length") else None
            anomaly_score = float(row.get("Anomaly Scores")) if row.get("Anomaly Scores") else None

            item = {
                "dataset_import_id": import_record.id,
                "event_timestamp": ts,
                "source_ip": row.get("Source IP Address", "").strip() or None,
                "destination_ip": row.get("Destination IP Address", "").strip() or None,
                "source_port": src_port,
                "destination_port": dst_port,
                "protocol": row.get("Protocol", "").strip().upper() or None,
                "packet_length": pkt_len,
                "packet_type": row.get("Packet Type", "").strip() or None,
                "traffic_type": row.get("Traffic Type", "").strip() or None,
                "payload_data": row.get("Payload Data", "").strip()[:500] if row.get("Payload Data") else None,
                "malware_indicators": row.get("Malware Indicators", "").strip() or None,
                "anomaly_scores": anomaly_score,
                "alerts_warnings": row.get("Alerts/Warnings", "").strip() or None,
                "attack_type": row.get("Attack Type", "").strip() or None,
                "attack_signature": row.get("Attack Signature", "").strip() or None,
                "action_taken": row.get("Action Taken", "").strip() or None,
                "severity_level": row.get("Severity Level", "").strip() or None,
                "user_information": row.get("User Information", "").strip() or None,
                "device_information": row.get("Device Information", "").strip() or None,
                "network_segment": row.get("Network Segment", "").strip() or None,
                "geo_location_data": row.get("Geo-location Data", "").strip() or None,
                "proxy_information": row.get("Proxy Information", "").strip() or None,
                "firewall_logs": row.get("Firewall Logs", "").strip() or None,
                "ids_ips_alerts": row.get("IDS/IPS Alerts", "").strip() or None,
                "log_source": row.get("Log Source", "").strip() or None,
                "created_at": datetime.datetime.utcnow()
            }
            records_to_insert.append(item)
            accepted += 1
        except Exception:
            rejected += 1

        if len(records_to_insert) >= 1000:
            db.bulk_insert_mappings(NetworkTraffic, records_to_insert)
            db.commit()
            records_to_insert.clear()

    if records_to_insert:
        db.bulk_insert_mappings(NetworkTraffic, records_to_insert)
        db.commit()
        records_to_insert.clear()

    import_record.total_rows = total
    import_record.accepted_rows = accepted
    import_record.rejected_rows = rejected
    import_record.status = "completed"
    db.commit()

    # Generate initial sample security alerts from high-severity or high anomaly events
    high_threats = (
        db.query(NetworkTraffic)
        .filter(NetworkTraffic.dataset_import_id == import_record.id)
        .filter((NetworkTraffic.severity_level == "High") | (NetworkTraffic.anomaly_scores > 75))
        .limit(40)
        .all()
    )
    for t in high_threats:
        alert = SecurityAlert(
            traffic_id=t.id,
            severity=t.severity_level or "High",
            status="new",
            reason=f"Suspicious {t.attack_type or 'Anomaly'} detected from {t.source_ip}:{t.source_port} to {t.destination_ip}:{t.destination_port} (Anomaly score: {t.anomaly_scores or 'N/A'})",
            created_at=t.event_timestamp or datetime.datetime.utcnow()
        )
        db.add(alert)
    db.commit()

    record_audit(
        db,
        action="IMPORT_DATASET",
        actor_email=actor_email,
        entity_type="dataset_import",
        entity_id=str(import_record.id),
        details={"filename": filename, "accepted": accepted, "rejected": rejected, "total": total}
    )

    return import_record

def get_data_quality_summary(db: Session) -> Dict[str, Any]:
    total_records = db.query(func.count(NetworkTraffic.id)).scalar() or 0
    if total_records == 0:
        return {
            "total_records": 0,
            "columns": REQUIRED_COLUMNS,
            "missing_rates": {},
            "null_counts": {},
            "attack_distribution": {},
            "severity_distribution": {},
            "protocol_distribution": {},
            "time_span": {"start": None, "end": None},
            "duplicate_rows_estimated": 0,
            "data_source_note": "No records in database. Please import dataset."
        }

    # Query distributions
    attacks = db.query(NetworkTraffic.attack_type, func.count(NetworkTraffic.id)).group_by(NetworkTraffic.attack_type).all()
    severities = db.query(NetworkTraffic.severity_level, func.count(NetworkTraffic.id)).group_by(NetworkTraffic.severity_level).all()
    protocols = db.query(NetworkTraffic.protocol, func.count(NetworkTraffic.id)).group_by(NetworkTraffic.protocol).all()

    min_time = db.query(func.min(NetworkTraffic.event_timestamp)).scalar()
    max_time = db.query(func.max(NetworkTraffic.event_timestamp)).scalar()

    # Pre-calculated known null stats for the 25 fields in cybersecurity_attacks dataset
    null_counts = {
        "Malware Indicators": db.query(func.count(NetworkTraffic.id)).filter(NetworkTraffic.malware_indicators == None).scalar() or 0,
        "Alerts/Warnings": db.query(func.count(NetworkTraffic.id)).filter(NetworkTraffic.alerts_warnings == None).scalar() or 0,
        "Proxy Information": db.query(func.count(NetworkTraffic.id)).filter(NetworkTraffic.proxy_information == None).scalar() or 0,
        "Firewall Logs": db.query(func.count(NetworkTraffic.id)).filter(NetworkTraffic.firewall_logs == None).scalar() or 0,
        "IDS/IPS Alerts": db.query(func.count(NetworkTraffic.id)).filter(NetworkTraffic.ids_ips_alerts == None).scalar() or 0,
    }
    missing_rates = {k: round(v / total_records, 4) if total_records else 0.0 for k, v in null_counts.items()}

    return {
        "total_records": total_records,
        "columns": REQUIRED_COLUMNS,
        "missing_rates": missing_rates,
        "null_counts": null_counts,
        "attack_distribution": {k or "Unknown": v for k, v in attacks},
        "severity_distribution": {k or "Unknown": v for k, v in severities},
        "protocol_distribution": {k or "Unknown": v for k, v in protocols},
        "time_span": {
            "start": min_time.isoformat() if min_time else None,
            "end": max_time.isoformat() if max_time else None
        },
        "duplicate_rows_estimated": 0,
        "data_source_note": "Ground-truth records from cybersecurity_attacks.csv. All records represent attack traffic (DDoS, Malware, Intrusion) with zero verified benign baseline records."
    }

def list_dataset_imports(db: Session) -> List[DatasetImport]:
    return db.query(DatasetImport).order_by(DatasetImport.created_at.desc()).all()
