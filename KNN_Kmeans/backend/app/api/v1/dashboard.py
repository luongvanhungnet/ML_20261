from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import User
from app.api.v1.schemas import KPIResponse, TimeSeriesPoint, DistributionItem, NetworkAnalyticsResponse
from app.api.v1.deps import get_current_user
from app.services.analytics_service import (
    get_dashboard_kpis, get_timeseries_analytics,
    get_attack_type_distribution, get_network_analytics
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard & Analytics"])

@router.get("/summary", response_model=KPIResponse)
def get_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return get_dashboard_kpis(db)

@router.get("/timeseries", response_model=List[TimeSeriesPoint])
def get_timeseries(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return get_timeseries_analytics(db)

@router.get("/attack-types", response_model=List[DistributionItem])
def get_attack_types(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return get_attack_type_distribution(db)

@router.get("/network", response_model=NetworkAnalyticsResponse)
def get_network(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return get_network_analytics(db)
