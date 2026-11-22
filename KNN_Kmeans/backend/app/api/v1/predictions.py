from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import User
from app.api.v1.schemas import PredictionRequest, PredictionResponse, PredictionHistoryResponse
from app.api.v1.deps import get_current_user
from app.services.prediction_service import run_prediction_service, list_prediction_history

router = APIRouter(prefix="/predictions", tags=["Predictions & Inference"])

@router.post("", response_model=PredictionResponse)
def create_prediction(
    req: PredictionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return run_prediction_service(db, req, actor_email=current_user.email)

@router.get("", response_model=PredictionHistoryResponse)
def get_prediction_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return list_prediction_history(db, page, page_size)
