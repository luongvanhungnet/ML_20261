from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import User
from app.api.v1.schemas import AlertListResponse, AlertItem, AlertUpdateRequest
from app.api.v1.deps import get_current_user, require_admin
from app.services.alert_service import list_alerts, get_alert_by_id, update_security_alert

router = APIRouter(prefix="/alerts", tags=["Security Alerts"])

@router.get("", response_model=AlertListResponse)
def get_alerts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    severity: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return list_alerts(db, page=page, page_size=page_size, status=status, severity=severity)

@router.get("/{alert_id}", response_model=AlertItem)
def get_alert_detail(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    alert = get_alert_by_id(db, alert_id)
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found."
        )
    traffic = alert.traffic_record
    return {
        "id": alert.id,
        "traffic_id": alert.traffic_id,
        "prediction_id": alert.prediction_id,
        "rule_id": alert.rule_id,
        "severity": alert.severity,
        "status": alert.status,
        "reason": alert.reason,
        "review_notes": alert.review_notes,
        "reviewed_by": alert.reviewed_by,
        "reviewed_at": alert.reviewed_at,
        "created_at": alert.created_at,
        "source_ip": traffic.source_ip if traffic else None,
        "destination_ip": traffic.destination_ip if traffic else None,
        "attack_type": traffic.attack_type if traffic else None
    }

@router.patch("/{alert_id}")
def update_alert(
    alert_id: int,
    update_data: AlertUpdateRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    alert = update_security_alert(
        db=db,
        alert_id=alert_id,
        data=update_data,
        actor_email=current_user.email
    )
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found."
        )
    return {"message": "Alert updated successfully.", "id": alert.id, "status": alert.status}
