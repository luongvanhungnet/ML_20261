import datetime
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.db.models import SecurityAlert, NetworkTraffic
from app.api.v1.schemas import AlertUpdateRequest
from app.services.audit_service import record_audit

def list_alerts(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    status: Optional[str] = None,
    severity: Optional[str] = None
) -> Dict[str, Any]:
    query = db.query(SecurityAlert).outerjoin(NetworkTraffic, SecurityAlert.traffic_id == NetworkTraffic.id)

    if status:
        query = query.filter(SecurityAlert.status == status)
    if severity:
        query = query.filter(SecurityAlert.severity == severity)

    total = query.count()
    alerts = query.order_by(SecurityAlert.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    items = []
    for a in alerts:
        traffic = a.traffic_record
        items.append({
            "id": a.id,
            "traffic_id": a.traffic_id,
            "prediction_id": a.prediction_id,
            "rule_id": a.rule_id,
            "severity": a.severity,
            "status": a.status,
            "reason": a.reason,
            "review_notes": a.review_notes,
            "reviewed_by": a.reviewed_by,
            "reviewed_at": a.reviewed_at,
            "created_at": a.created_at,
            "source_ip": traffic.source_ip if traffic else None,
            "destination_ip": traffic.destination_ip if traffic else None,
            "attack_type": traffic.attack_type if traffic else None
        })

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": items
    }

def get_alert_by_id(db: Session, alert_id: int) -> Optional[SecurityAlert]:
    return db.query(SecurityAlert).filter(SecurityAlert.id == alert_id).first()

def update_security_alert(
    db: Session,
    alert_id: int,
    data: AlertUpdateRequest,
    actor_email: Optional[str] = None
) -> Optional[SecurityAlert]:
    alert = db.query(SecurityAlert).filter(SecurityAlert.id == alert_id).first()
    if not alert:
        return None

    prev_status = alert.status
    if data.status:
        alert.status = data.status
        alert.reviewed_at = datetime.datetime.utcnow()
        alert.reviewed_by = actor_email or "admin"
    if data.review_notes is not None:
        alert.review_notes = data.review_notes

    db.commit()
    db.refresh(alert)

    record_audit(
        db,
        action="UPDATE_ALERT",
        actor_email=actor_email,
        entity_type="security_alert",
        entity_id=str(alert.id),
        details={"previous_status": prev_status, "new_status": alert.status, "notes": alert.review_notes}
    )

    return alert
