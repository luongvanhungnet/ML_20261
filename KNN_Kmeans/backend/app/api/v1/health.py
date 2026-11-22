from fastapi import APIRouter, Depends, status, Response
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import get_db
from app.db.models import ModelVersion

router = APIRouter(prefix="/health", tags=["System Health"])

@router.get("/live")
def live():
    return {"status": "ok", "service": "cybersecurity-api", "alive": True}

@router.get("/ready")
def ready(response: Response, db: Session = Depends(get_db)):
    db_ok = False
    model_ok = False
    
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    try:
        active_model = db.query(ModelVersion).filter(ModelVersion.is_active == True).first()
        model_ok = active_model is not None
    except Exception:
        model_ok = False

    if not db_ok or not model_ok:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {
            "status": "degraded",
            "database_ready": db_ok,
            "active_model_ready": model_ok
        }

    return {
        "status": "ready",
        "database_ready": db_ok,
        "active_model_ready": model_ok
    }
