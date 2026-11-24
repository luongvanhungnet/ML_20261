from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.models import NetworkTraffic, SecurityAlert

def get_dashboard_kpis(db: Session) -> Dict[str, Any]:
    total_records = db.query(func.count(NetworkTraffic.id)).scalar() or 0
    attack_events = db.query(func.count(NetworkTraffic.id)).filter(NetworkTraffic.attack_type != None).scalar() or 0
    open_alerts = db.query(func.count(SecurityAlert.id)).filter(SecurityAlert.status.in_(["new", "investigating"])).scalar() or 0
    high_severity_count = db.query(func.count(NetworkTraffic.id)).filter(NetworkTraffic.severity_level == "High").scalar() or 0
    
    min_time = db.query(func.min(NetworkTraffic.event_timestamp)).scalar()
    max_time = db.query(func.max(NetworkTraffic.event_timestamp)).scalar()

    # Find primary attack type
    top_attack = (
        db.query(NetworkTraffic.attack_type, func.count(NetworkTraffic.id))
        .filter(NetworkTraffic.attack_type != None)
        .group_by(NetworkTraffic.attack_type)
        .order_by(func.count(NetworkTraffic.id).desc())
        .first()
    )
    primary_attack = top_attack[0] if top_attack else "N/A"

    return {
        "total_records": total_records,
        "attack_events": attack_events,
        "open_alerts": open_alerts,
        "high_severity_count": high_severity_count,
        "time_span_start": min_time.strftime("%Y-%m-%d") if min_time else None,
        "time_span_end": max_time.strftime("%Y-%m-%d") if max_time else None,
        "primary_attack_type": primary_attack,
        "data_provenance": "Ground-truth dataset labels (cybersecurity_attacks.csv)"
    }

def get_timeseries_analytics(db: Session) -> List[Dict[str, Any]]:
    # In SQLite and Postgres, we can group by year-month substring
    # Using substr(event_timestamp, 1, 7) or strftime
    # For universal compatibility between SQLite and PostgreSQL, we can use strftime in sqlite or date_trunc in pg,
    # or query monthly counts:
    results = (
        db.query(
            func.substr(NetworkTraffic.event_timestamp, 1, 7).label("month"),
            NetworkTraffic.attack_type,
            func.count(NetworkTraffic.id)
        )
        .filter(NetworkTraffic.event_timestamp != None)
        .group_by("month", NetworkTraffic.attack_type)
        .order_by("month")
        .all()
    )

    timeline_map: Dict[str, Dict[str, int]] = {}
    for month_str, attack_type, count in results:
        if not month_str:
            continue
        # month_str might be '2023-05'
        if month_str not in timeline_map:
            timeline_map[month_str] = {"time": month_str, "total_count": 0, "ddos_count": 0, "malware_count": 0, "intrusion_count": 0}
        timeline_map[month_str]["total_count"] += count
        if attack_type == "DDoS":
            timeline_map[month_str]["ddos_count"] += count
        elif attack_type == "Malware":
            timeline_map[month_str]["malware_count"] += count
        elif attack_type == "Intrusion":
            timeline_map[month_str]["intrusion_count"] += count

    # Return sorted by time
    sorted_timeseries = sorted(timeline_map.values(), key=lambda x: x["time"])
    return sorted_timeseries

def get_attack_type_distribution(db: Session) -> List[Dict[str, Any]]:
    total = db.query(func.count(NetworkTraffic.id)).scalar() or 1
    rows = (
        db.query(NetworkTraffic.attack_type, func.count(NetworkTraffic.id))
        .group_by(NetworkTraffic.attack_type)
        .order_by(func.count(NetworkTraffic.id).desc())
        .all()
    )
    items = []
    for name, cnt in rows:
        label = name if name else "Unspecified"
        items.append({
            "name": label,
            "count": cnt,
            "percentage": round((cnt / total) * 100, 1)
        })
    return items

def get_network_analytics(db: Session) -> Dict[str, Any]:
    total = db.query(func.count(NetworkTraffic.id)).scalar() or 1

    def _top_items(col, limit=5):
        rows = db.query(col, func.count(NetworkTraffic.id)).filter(col != None).group_by(col).order_by(func.count(NetworkTraffic.id).desc()).limit(limit).all()
        return [{"name": str(r[0]), "count": r[1], "percentage": round((r[1] / total) * 100, 1)} for r in rows]

    return {
        "top_source_ips": _top_items(NetworkTraffic.source_ip, 6),
        "top_destination_ips": _top_items(NetworkTraffic.destination_ip, 6),
        "protocols": _top_items(NetworkTraffic.protocol, 5),
        "top_destination_ports": _top_items(NetworkTraffic.destination_port, 6),
        "traffic_types": _top_items(NetworkTraffic.traffic_type, 5),
        "network_segments": _top_items(NetworkTraffic.network_segment, 5)
    }
