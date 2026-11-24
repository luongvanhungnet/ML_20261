from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import User
from app.api.v1.schemas import AuditLogResponse
from app.api.v1.deps import require_admin
from app.services.audit_service import get_audit_logs

router = APIRouter(prefix="/audit-logs", tags=["Audit Trail"])

@router.get("", response_model=AuditLogResponse)
def list_audits(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    return get_audit_logs(db, page=page, page_size=page_size)
