import datetime
from typing import Optional, Any
from sqlalchemy.orm import Session
from app.db.models import AuditLog

def record_audit(
    db: Session,
    action: str,
    actor_id: Optional[int] = None,
    actor_email: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    details: Optional[Any] = None
) -> AuditLog:
    log = AuditLog(
        actor_id=actor_id,
        actor_email=actor_email,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else None,
        details=details,
        created_at=datetime.datetime.utcnow()
    )
    db.add(log)
    try:
        db.commit()
        db.refresh(log)
    except Exception:
        db.rollback()
    return log

def get_audit_logs(db: Session, page: int = 1, page_size: int = 20):
    query = db.query(AuditLog).order_by(AuditLog.created_at.desc())
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return {"total": total, "page": page, "page_size": page_size, "items": items}
