from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import User, ModelVersion
from app.api.v1.schemas import ModelVersionItem
from app.api.v1.deps import get_current_user, require_admin
from app.services.audit_service import record_audit

router = APIRouter(prefix="/models", tags=["Model Evaluation & Lifecycle"])

@router.get("", response_model=List[ModelVersionItem])
def list_models(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(ModelVersion).order_by(ModelVersion.id.asc()).all()

@router.get("/{model_id}/metrics")
def get_model_metrics(
    model_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    model = db.query(ModelVersion).filter(ModelVersion.id == model_id).first()
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model version not found."
        )
    return {
        "id": model.id,
        "name": model.name,
        "version": model.version,
        "algorithm": model.algorithm,
        "is_active": model.is_active,
        "feature_schema": model.feature_schema,
        "metrics": model.metrics
    }

@router.post("/{model_id}/activate")
def activate_model(
    model_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    model = db.query(ModelVersion).filter(ModelVersion.id == model_id).first()
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model version not found."
        )

    # Deactivate all, activate this
    db.query(ModelVersion).update({ModelVersion.is_active: False})
    model.is_active = True
    db.commit()

    record_audit(
        db,
        action="ACTIVATE_MODEL",
        actor_email=current_user.email,
        entity_type="model_version",
        entity_id=str(model.id),
        details={"version": model.version, "name": model.name}
    )

    return {"message": f"Model {model.version} activated successfully."}
