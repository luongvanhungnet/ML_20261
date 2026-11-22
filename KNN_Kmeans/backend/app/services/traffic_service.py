import csv
import io
import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc
from app.db.models import NetworkTraffic

def sanitize_csv_cell(value: Any) -> str:
    """Escapes formula injection in CSV/Excel (cells starting with =, +, -, @, \t, \r)."""
    if value is None:
        return ""
    val_str = str(value)
    if val_str and val_str[0] in ("=", "+", "-", "@", "\t", "\r"):
        return f"'{val_str}"
    return val_str

def get_traffic_records(
    db: Session,
    page: int = 1,
    page_size: int = 25,
    search: Optional[str] = None,
    protocol: Optional[str] = None,
    attack_type: Optional[str] = None,
    severity_level: Optional[str] = None,
    packet_type: Optional[str] = None,
    traffic_type: Optional[str] = None,
    start_time: Optional[datetime.datetime] = None,
    end_time: Optional[datetime.datetime] = None,
    sort_by: str = "event_timestamp",
    sort_order: str = "desc"
) -> Dict[str, Any]:
    query = db.query(NetworkTraffic)

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                NetworkTraffic.source_ip.like(search_pattern),
                NetworkTraffic.destination_ip.like(search_pattern),
                NetworkTraffic.attack_signature.like(search_pattern),
                NetworkTraffic.user_information.like(search_pattern)
            )
        )

    if protocol:
        query = query.filter(NetworkTraffic.protocol == protocol)
    if attack_type:
        query = query.filter(NetworkTraffic.attack_type == attack_type)
    if severity_level:
        query = query.filter(NetworkTraffic.severity_level == severity_level)
    if packet_type:
        query = query.filter(NetworkTraffic.packet_type == packet_type)
    if traffic_type:
        query = query.filter(NetworkTraffic.traffic_type == traffic_type)
    if start_time:
        query = query.filter(NetworkTraffic.event_timestamp >= start_time)
    if end_time:
        query = query.filter(NetworkTraffic.event_timestamp <= end_time)

    # Sorting
    sort_col = getattr(NetworkTraffic, sort_by, NetworkTraffic.event_timestamp)
    if sort_order.lower() == "asc":
        query = query.order_by(asc(sort_col))
    else:
        query = query.order_by(desc(sort_col))

    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": items
    }

def get_traffic_by_id(db: Session, traffic_id: int) -> Optional[NetworkTraffic]:
    return db.query(NetworkTraffic).filter(NetworkTraffic.id == traffic_id).first()

def export_traffic_csv(
    db: Session,
    search: Optional[str] = None,
    protocol: Optional[str] = None,
    attack_type: Optional[str] = None,
    severity_level: Optional[str] = None,
    limit: int = 10000
) -> str:
    query = db.query(NetworkTraffic)
    if search:
        query = query.filter(
            or_(
                NetworkTraffic.source_ip.like(f"%{search}%"),
                NetworkTraffic.destination_ip.like(f"%{search}%")
            )
        )
    if protocol:
        query = query.filter(NetworkTraffic.protocol == protocol)
    if attack_type:
        query = query.filter(NetworkTraffic.attack_type == attack_type)
    if severity_level:
        query = query.filter(NetworkTraffic.severity_level == severity_level)

    items = query.order_by(NetworkTraffic.event_timestamp.desc()).limit(limit).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "Timestamp", "Source IP", "Destination IP", "Source Port", "Destination Port",
        "Protocol", "Packet Length", "Packet Type", "Traffic Type", "Attack Type",
        "Severity", "Anomaly Score", "Action Taken", "Log Source"
    ])

    for row in items:
        writer.writerow([
            sanitize_csv_cell(row.id),
            sanitize_csv_cell(row.event_timestamp.isoformat() if row.event_timestamp else ""),
            sanitize_csv_cell(row.source_ip),
            sanitize_csv_cell(row.destination_ip),
            sanitize_csv_cell(row.source_port),
            sanitize_csv_cell(row.destination_port),
            sanitize_csv_cell(row.protocol),
            sanitize_csv_cell(row.packet_length),
            sanitize_csv_cell(row.packet_type),
            sanitize_csv_cell(row.traffic_type),
            sanitize_csv_cell(row.attack_type),
            sanitize_csv_cell(row.severity_level),
            sanitize_csv_cell(row.anomaly_scores),
            sanitize_csv_cell(row.action_taken),
            sanitize_csv_cell(row.log_source)
        ])

    return output.getvalue()
